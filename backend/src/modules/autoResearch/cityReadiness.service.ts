import { prisma } from '../../lib/prisma.js';

// =============================================================================
// Types
// =============================================================================

export interface CityReadinessResult {
  citySlug: string;
  cityName: string;
  totalCandidates: number;
  qualityCandidates: number;
  sourceDiversity: number;
  geographicSpread: number;
  localSignalStrength: number;
  dimensions: {
    qualityCandidatesNorm: number;
    sourceDiversityNorm: number;
    geographicSpreadNorm: number;
    localSignalStrengthNorm: number;
  };
  readinessScore: number;
  isReady: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Weights for each dimension of the readiness formula (PRD 10.1) */
const WEIGHTS = {
  qualityCandidates: 0.40,
  sourceDiversity: 0.25,
  geographicSpread: 0.20,
  localSignalStrength: 0.15,
} as const;

/** 30 quality candidates = max score for that dimension */
const QUALITY_CANDIDATES_MAX = 30;

/** Total possible distinct source types */
const TOTAL_SOURCE_TYPES = 6;

/** Geographic spread normalization bounds (in degrees lat/lng stddev) */
const GEO_SPREAD_MIN = 0.001;
const GEO_SPREAD_MAX = 0.05;

/** Threshold for a city to be considered "ready" */
const READINESS_SCORE_THRESHOLD = 70;
const QUALITY_CANDIDATES_THRESHOLD = 15;

/** Source types considered "local" vs "travel" */
const LOCAL_SOURCES = ['reddit', 'local_news'];
const TRAVEL_SOURCES = ['travel_blog', 'instagram'];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate the standard deviation of an array of numbers.
 * Returns 0 for arrays with fewer than 2 elements.
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Calculate combined geographic spread from lat/lng coordinate arrays.
 * Uses the average of lat stddev and lng stddev to capture overall spread.
 */
function calculateGeographicSpread(
  locations: Array<{ lat: number; lng: number }>,
): number {
  if (locations.length < 2) return 0;

  const lats = locations.map((loc) => loc.lat);
  const lngs = locations.map((loc) => loc.lng);

  const latStdDev = standardDeviation(lats);
  const lngStdDev = standardDeviation(lngs);

  return (latStdDev + lngStdDev) / 2;
}

/**
 * Normalize a value to a 0-100 scale given min and max bounds.
 * Values below min clamp to 0, values above max clamp to 100.
 */
function normalizeToScale(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

/**
 * Safely extract lat/lng from a placeLocation JSON field.
 * Returns null if the data is invalid or missing.
 */
function extractLatLng(
  placeLocation: unknown,
): { lat: number; lng: number } | null {
  if (
    typeof placeLocation !== 'object' ||
    placeLocation === null
  ) {
    return null;
  }

  const loc = placeLocation as Record<string, unknown>;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return null;
}

// =============================================================================
// Service
// =============================================================================

export const cityReadinessService = {
  /**
   * Calculate readiness for a single city slug.
   *
   * Steps:
   * 1. Count all AutoResearchCandidates for this citySlug
   * 2. Count candidates with linked proposals scoring > 7.0
   * 3. Count distinct source types from AutoResearchSignals
   * 4. Calculate geographic spread (stddev of candidate lat/lng)
   * 5. Count local vs travel signals for local signal strength
   * 6. Normalize each dimension to 0-100, apply weights
   * 7. Upsert into CityReadinessScore table
   */
  async calculateReadiness(citySlug: string): Promise<CityReadinessResult> {
    // Step 1: Fetch all candidates for this city with their proposals
    const candidates = await prisma.autoResearchCandidate.findMany({
      where: { citySlug },
      include: {
        proposals: {
          select: { llmScore: true },
        },
      },
    });

    const totalCandidates = candidates.length;

    // Step 2: Count candidates that have at least one proposal with score > 7.0
    const qualityCandidates = candidates.filter((candidate) =>
      candidate.proposals.some((proposal) => proposal.llmScore > 7.0),
    ).length;

    // Step 3: Count distinct source types from signals for this city
    const distinctSources = await prisma.autoResearchSignal.findMany({
      where: { citySlug },
      select: { source: true },
      distinct: ['source'],
    });
    const sourceDiversity = distinctSources.length;

    // Step 4: Calculate geographic spread from candidate locations
    const locations = candidates
      .map((c) => extractLatLng(c.placeLocation))
      .filter((loc): loc is { lat: number; lng: number } => loc !== null);
    const geographicSpread = calculateGeographicSpread(locations);

    // Step 5: Count local vs travel signals
    const [localSignals, travelSignals] = await Promise.all([
      prisma.autoResearchSignal.count({
        where: {
          citySlug,
          source: { in: LOCAL_SOURCES },
        },
      }),
      prisma.autoResearchSignal.count({
        where: {
          citySlug,
          source: { in: TRAVEL_SOURCES },
        },
      }),
    ]);

    const totalRelevantSignals = localSignals + travelSignals;
    const localSignalStrength =
      totalRelevantSignals > 0 ? localSignals / totalRelevantSignals : 0;

    // Step 6: Normalize each dimension to 0-100
    const qualityCandidatesNorm = Math.min(
      (qualityCandidates / QUALITY_CANDIDATES_MAX) * 100,
      100,
    );
    const sourceDiversityNorm = (sourceDiversity / TOTAL_SOURCE_TYPES) * 100;
    const geographicSpreadNorm = normalizeToScale(
      geographicSpread,
      GEO_SPREAD_MIN,
      GEO_SPREAD_MAX,
    );
    const localSignalStrengthNorm = localSignalStrength * 100;

    // Apply weights to compute final score
    const readinessScore =
      qualityCandidatesNorm * WEIGHTS.qualityCandidates +
      sourceDiversityNorm * WEIGHTS.sourceDiversity +
      geographicSpreadNorm * WEIGHTS.geographicSpread +
      localSignalStrengthNorm * WEIGHTS.localSignalStrength;

    const isReady =
      readinessScore > READINESS_SCORE_THRESHOLD &&
      qualityCandidates >= QUALITY_CANDIDATES_THRESHOLD;

    // Derive a display name from the slug (capitalize, replace hyphens)
    const cityName = citySlug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Step 7: Upsert into CityReadinessScore table
    await prisma.cityReadinessScore.upsert({
      where: { citySlug },
      create: {
        citySlug,
        cityName,
        totalCandidates,
        qualityCandidates,
        sourceDiversity,
        geographicSpread,
        readinessScore,
        isReady,
        lastCalculated: new Date(),
      },
      update: {
        cityName,
        totalCandidates,
        qualityCandidates,
        sourceDiversity,
        geographicSpread,
        readinessScore,
        isReady,
        lastCalculated: new Date(),
      },
    });

    return {
      citySlug,
      cityName,
      totalCandidates,
      qualityCandidates,
      sourceDiversity,
      geographicSpread,
      localSignalStrength,
      dimensions: {
        qualityCandidatesNorm,
        sourceDiversityNorm,
        geographicSpreadNorm,
        localSignalStrengthNorm,
      },
      readinessScore,
      isReady,
    };
  },

  /**
   * Calculate readiness for all "watched" cities -- cities that have
   * AutoResearchCandidates but do NOT yet have a City record in the DB.
   */
  async calculateAll(): Promise<CityReadinessResult[]> {
    // Find all distinct city slugs that have candidates
    const candidateSlugs = await prisma.autoResearchCandidate.findMany({
      select: { citySlug: true },
      distinct: ['citySlug'],
    });

    // Find all existing city slugs
    const existingCities = await prisma.city.findMany({
      select: { slug: true },
    });
    const existingSlugs = new Set(existingCities.map((c) => c.slug));

    // Only calculate for cities that don't have a City record yet
    const watchedSlugs = candidateSlugs
      .map((c) => c.citySlug)
      .filter((slug) => !existingSlugs.has(slug));

    const results: CityReadinessResult[] = [];
    for (const slug of watchedSlugs) {
      try {
        const result = await cityReadinessService.calculateReadiness(slug);
        results.push(result);
      } catch (error) {
        // Log but don't fail the entire batch for one city
        console.error(
          `Failed to calculate readiness for city "${slug}":`,
          error,
        );
      }
    }

    return results;
  },

  /**
   * Get all current readiness scores from the database.
   * Returns them sorted by readinessScore descending.
   */
  async getAll() {
    return prisma.cityReadinessScore.findMany({
      orderBy: { readinessScore: 'desc' },
    });
  },
};
