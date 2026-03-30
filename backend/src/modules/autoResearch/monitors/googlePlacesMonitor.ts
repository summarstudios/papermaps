import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { config } from '../../../config.js';

// ============================================================================
// Types
// ============================================================================

interface MonitorResult {
  citySlug: string;
  signalsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: string[];
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: string;
  businessStatus?: string;
}

interface CityBounds {
  northLat: number;
  southLat: number;
  eastLng: number;
  westLng: number;
}

// ============================================================================
// Constants
// ============================================================================

const SEARCH_QUERIES = [
  'best restaurants',
  'best cafes and coffee shops',
  'temples and religious places',
  'parks and gardens',
  'museums and galleries',
  'markets and shopping',
  'street food',
  'viewpoints and scenic spots',
  'heritage buildings and historic sites',
  'hidden gems and local favorites',
];

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.rating',
  'places.userRatingCount',
  'places.editorialSummary',
  'places.businessStatus',
].join(',');

/** Minimum rating to consider a place worth signalling. */
const MIN_RATING = 4.2;

/** Minimum number of reviews to consider a place established enough. */
const MIN_REVIEWS = 30;

/** Rate-limit delay between API calls in milliseconds. */
const RATE_LIMIT_MS = 500;

/** Signals from the same source within this window are treated as duplicates. */
const DEDUP_WINDOW_DAYS = 7;

// ============================================================================
// Helpers
// ============================================================================

function parseGooglePlace(place: Record<string, unknown>): GooglePlaceResult {
  const displayName = place.displayName as { text?: string } | undefined;
  const location = place.location as { latitude?: number; longitude?: number } | undefined;
  const editorialSummary = place.editorialSummary as { text?: string } | undefined;

  return {
    placeId: (place.id as string) || '',
    name: displayName?.text || '',
    address: (place.formattedAddress as string) || '',
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    types: (place.types as string[]) || [],
    rating: place.rating as number | undefined,
    userRatingCount: place.userRatingCount as number | undefined,
    editorialSummary: editorialSummary?.text,
    businessStatus: place.businessStatus as string | undefined,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the Google Places Text Search API with location bounds.
 * Self-contained — does not import from places.service.ts.
 */
async function searchGooglePlaces(
  query: string,
  bounds: CityBounds,
): Promise<GooglePlaceResult[]> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.googlePlacesApiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      locationRestriction: {
        rectangle: {
          low: { latitude: bounds.southLat, longitude: bounds.westLng },
          high: { latitude: bounds.northLat, longitude: bounds.eastLng },
        },
      },
      maxResultCount: 20,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { places?: Record<string, unknown>[] };
  return (data.places || []).map(parseGooglePlace);
}

/**
 * Returns true if a place passes the quality threshold.
 */
function meetsQualityThreshold(place: GooglePlaceResult): boolean {
  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') {
    return false;
  }
  if (place.rating === undefined || place.rating < MIN_RATING) {
    return false;
  }
  if (place.userRatingCount === undefined || place.userRatingCount < MIN_REVIEWS) {
    return false;
  }
  return true;
}

// ============================================================================
// Monitor
// ============================================================================

export const googlePlacesMonitor = {
  /**
   * Run the Google Places monitor for a single city.
   * Searches multiple categories, filters by quality, and creates
   * AutoResearchSignal records for new/interesting places.
   */
  async runForCity(citySlug: string): Promise<MonitorResult> {
    const result: MonitorResult = {
      citySlug,
      signalsCreated: 0,
      duplicatesSkipped: 0,
      errors: [],
    };

    // Guard: API key must be configured
    if (!config.googlePlacesApiKey) {
      result.errors.push('GOOGLE_PLACES_API_KEY not configured — skipping Google Places monitor');
      console.warn(`[GooglePlacesMonitor] ${result.errors[0]}`);
      return result;
    }

    // 1. Fetch the city from DB
    const city = await prisma.city.findUnique({
      where: { slug: citySlug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        centerLat: true,
        centerLng: true,
        boundsNorthLat: true,
        boundsSouthLat: true,
        boundsEastLng: true,
        boundsWestLng: true,
      },
    });

    if (!city) {
      result.errors.push(`City not found: ${citySlug}`);
      return result;
    }

    if (city.status !== 'PUBLISHED') {
      result.errors.push(`City ${citySlug} is not PUBLISHED (status: ${city.status}) — skipping`);
      return result;
    }

    // 2. Build bounds — use explicit bounds if available, else approximate from center
    const bounds: CityBounds = {
      northLat: city.boundsNorthLat ?? city.centerLat + 0.05,
      southLat: city.boundsSouthLat ?? city.centerLat - 0.05,
      eastLng: city.boundsEastLng ?? city.centerLng + 0.05,
      westLng: city.boundsWestLng ?? city.centerLng - 0.05,
    };

    // 3. Pre-fetch existing Google Place IDs for this city to check duplicates in bulk
    const existingPois = await prisma.pOI.findMany({
      where: { cityId: city.id, googlePlaceId: { not: null } },
      select: { googlePlaceId: true },
    });
    const existingGooglePlaceIds = new Set(
      existingPois.map((p) => p.googlePlaceId).filter(Boolean) as string[],
    );

    // 4. Pre-fetch recent signals from this source for this city (dedup window)
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - DEDUP_WINDOW_DAYS);

    const recentSignals = await prisma.autoResearchSignal.findMany({
      where: {
        citySlug,
        source: 'google_reviews',
        scrapedAt: { gte: dedupCutoff },
      },
      select: { placeName: true },
    });
    const recentSignalNames = new Set(
      recentSignals.map((s) => s.placeName.toLowerCase().trim()),
    );

    // 5. Search each query category
    for (const query of SEARCH_QUERIES) {
      try {
        const fullQuery = `${query} in ${city.name}`;
        const places = await searchGooglePlaces(fullQuery, bounds);

        for (const place of places) {
          // Quality filter
          if (!meetsQualityThreshold(place)) {
            continue;
          }

          // Skip if already a POI in the database
          if (place.placeId && existingGooglePlaceIds.has(place.placeId)) {
            result.duplicatesSkipped++;
            continue;
          }

          // Skip if we already created a signal for this place name recently
          if (recentSignalNames.has(place.name.toLowerCase().trim())) {
            result.duplicatesSkipped++;
            continue;
          }

          // Create the signal
          try {
            await prisma.autoResearchSignal.create({
              data: {
                source: 'google_reviews',
                rawData: place as unknown as Prisma.InputJsonValue,
                placeName: place.name,
                placeLocation: {
                  lat: place.latitude,
                  lng: place.longitude,
                  area: place.address,
                } as unknown as Prisma.InputJsonValue,
                citySlug,
                signalType: 'rising',
                scrapedAt: new Date(),
                status: 'pending',
              },
            });

            result.signalsCreated++;

            // Track the name so subsequent queries don't duplicate within this run
            recentSignalNames.add(place.name.toLowerCase().trim());
            // Also track the Google Place ID for this run
            if (place.placeId) {
              existingGooglePlaceIds.add(place.placeId);
            }
          } catch (createErr) {
            const message = createErr instanceof Error ? createErr.message : String(createErr);
            result.errors.push(`Failed to create signal for "${place.name}": ${message}`);
          }
        }

        // Rate limit between API calls
        await sleep(RATE_LIMIT_MS);
      } catch (searchErr) {
        const message = searchErr instanceof Error ? searchErr.message : String(searchErr);
        result.errors.push(`Search query "${query}" failed: ${message}`);
      }
    }

    console.log(
      `[GooglePlacesMonitor] ${citySlug}: ${result.signalsCreated} signals created, ${result.duplicatesSkipped} duplicates skipped, ${result.errors.length} errors`,
    );

    return result;
  },

  /**
   * Run the Google Places monitor for all published cities.
   */
  async runForAll(): Promise<MonitorResult[]> {
    if (!config.googlePlacesApiKey) {
      console.warn('[GooglePlacesMonitor] GOOGLE_PLACES_API_KEY not configured — skipping all cities');
      return [];
    }

    const publishedCities = await prisma.city.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true },
      orderBy: { sortOrder: 'asc' },
    });

    const results: MonitorResult[] = [];

    for (const city of publishedCities) {
      try {
        const result = await googlePlacesMonitor.runForCity(city.slug);
        results.push(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          citySlug: city.slug,
          signalsCreated: 0,
          duplicatesSkipped: 0,
          errors: [`Fatal error: ${message}`],
        });
      }
    }

    const totalSignals = results.reduce((sum, r) => sum + r.signalsCreated, 0);
    const totalDuplicates = results.reduce((sum, r) => sum + r.duplicatesSkipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(
      `[GooglePlacesMonitor] Completed for ${publishedCities.length} cities: ${totalSignals} signals, ${totalDuplicates} duplicates, ${totalErrors} errors`,
    );

    return results;
  },
};
