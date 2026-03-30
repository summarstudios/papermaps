import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

// =============================================================================
// Constants
// =============================================================================

const EVENT_WEIGHTS: Record<string, number> = {
  poi_save: 5,
  poi_share: 4,
  itinerary_add: 4,
  poi_directions: 3,
  poi_deepdive: 2,
  poi_click: 1,
  collection_save: 3,
};

/** Minimum engagement events for a POI to be considered in bottom-performers list */
const MIN_EVENTS_FOR_BOTTOM = 10;

/** Minimum engagement events for calibration report inclusion */
const CALIBRATION_MIN_EVENTS = 50;

/** How far back to look for published POIs in calibration (months) */
const CALIBRATION_LOOKBACK_MONTHS = 6;

/** Number of top/bottom POIs to return in city engagement */
const CITY_ENGAGEMENT_LIMIT = 10;

// =============================================================================
// Types
// =============================================================================

export interface EngagementScore {
  poiId: string;
  poiName: string;
  rawScore: number;
  normalizedScore: number;
  eventBreakdown: Record<string, number>;
  totalEvents: number;
}

export interface CityEngagement {
  citySlug: string;
  totalMapViews: number;
  topPOIs: EngagementScore[];
  bottomPOIs: EngagementScore[];
  averageScore: number;
}

export interface CalibrationReport {
  citySlug: string;
  generatedAt: Date;
  sampleSize: number;
  highPerformers: Array<{
    poiId: string;
    name: string;
    originalAutoResearchScore: number | null;
    engagementScore: number;
    categories: string[];
  }>;
  lowPerformers: Array<{
    poiId: string;
    name: string;
    originalAutoResearchScore: number | null;
    engagementScore: number;
    categories: string[];
  }>;
  insights: string[];
}

interface RecordEventInput {
  poiId: string;
  citySlug: string;
  eventType: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

interface RawEventRow {
  eventType: string;
  count: bigint;
}

interface PoiEventRow {
  poiId: string;
  eventType: string;
  count: bigint;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate the weighted raw score from an event breakdown.
 */
function computeRawScore(eventBreakdown: Record<string, number>): number {
  let score = 0;
  for (const [eventType, count] of Object.entries(eventBreakdown)) {
    const weight = EVENT_WEIGHTS[eventType] ?? 0;
    score += count * weight;
  }
  return score;
}

/**
 * Build an event breakdown map from raw aggregation rows.
 */
function buildEventBreakdown(rows: Array<{ eventType: string; count: bigint }>): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const row of rows) {
    breakdown[row.eventType] = Number(row.count);
  }
  return breakdown;
}

/**
 * Compute total events from a breakdown map.
 */
function sumEvents(breakdown: Record<string, number>): number {
  return Object.values(breakdown).reduce((sum, c) => sum + c, 0);
}

/**
 * Get the date N months ago from now.
 */
function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

// =============================================================================
// Feedback Service
// =============================================================================

export const feedbackService = {
  /**
   * Record a user engagement event.
   *
   * Designed for fire-and-forget: inserts into AutoResearchFeedbackSignal
   * with minimal overhead. Callers should not await this in the request
   * critical path if latency is a concern.
   */
  async recordEvent(event: RecordEventInput): Promise<void> {
    await prisma.autoResearchFeedbackSignal.create({
      data: {
        poiId: event.poiId,
        citySlug: event.citySlug,
        eventType: event.eventType,
        sessionId: event.sessionId,
        metadata: (event.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  },

  /**
   * Calculate engagement score for a single POI.
   *
   * Aggregates all feedback signals for the POI, computes a weighted raw
   * score, and normalizes it against the total map views (poi_click events)
   * for the city the POI belongs to.
   */
  async getEngagementScore(poiId: string): Promise<EngagementScore> {
    // Fetch POI name + city info
    const poi = await prisma.pOI.findUnique({
      where: { id: poiId },
      select: { id: true, name: true, city: { select: { slug: true } } },
    });

    if (!poi) {
      throw new Error(`POI not found: ${poiId}`);
    }

    // Aggregate events by type for this POI
    const rows = await prisma.$queryRaw<RawEventRow[]>`
      SELECT "event_type" AS "eventType", COUNT(*)::bigint AS "count"
      FROM auto_research_feedback_signals
      WHERE "poi_id" = ${poiId}
      GROUP BY "event_type"
    `;

    const eventBreakdown = buildEventBreakdown(rows);
    const totalEvents = sumEvents(eventBreakdown);
    const rawScore = computeRawScore(eventBreakdown);

    // Get total map views for the city (sum of all poi_click events across
    // all POIs in the city — this proxies total map engagement)
    const citySlug = poi.city.slug;
    const mapViewRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM auto_research_feedback_signals
      WHERE "city_slug" = ${citySlug}
        AND "event_type" = 'poi_click'
    `;
    const totalMapViews = Number(mapViewRows[0]?.count ?? 0);

    const normalizedScore = totalMapViews > 0
      ? Math.round((rawScore / totalMapViews) * 10000) / 10000
      : 0;

    return {
      poiId: poi.id,
      poiName: poi.name,
      rawScore,
      normalizedScore,
      eventBreakdown,
      totalEvents,
    };
  },

  /**
   * Get top and bottom performing POIs for a city.
   *
   * Aggregates feedback signals across all POIs in the city, computes
   * weighted scores, normalizes by city map views, and returns the
   * top 10 and bottom 10 (only published POIs with some traffic for bottom).
   */
  async getCityEngagement(citySlug: string): Promise<CityEngagement> {
    // Get total map views for the city
    const mapViewRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM auto_research_feedback_signals
      WHERE "city_slug" = ${citySlug}
        AND "event_type" = 'poi_click'
    `;
    const totalMapViews = Number(mapViewRows[0]?.count ?? 0);

    // Aggregate events per POI per event type
    const poiEvents = await prisma.$queryRaw<PoiEventRow[]>`
      SELECT "poi_id" AS "poiId", "event_type" AS "eventType", COUNT(*)::bigint AS "count"
      FROM auto_research_feedback_signals
      WHERE "city_slug" = ${citySlug}
      GROUP BY "poi_id", "event_type"
    `;

    // Group by POI
    const poiMap = new Map<string, Record<string, number>>();
    for (const row of poiEvents) {
      const existing = poiMap.get(row.poiId) ?? {};
      poiMap.set(row.poiId, { ...existing, [row.eventType]: Number(row.count) });
    }

    // Fetch POI names for all encountered POI IDs
    const poiIds = [...poiMap.keys()];
    if (poiIds.length === 0) {
      return {
        citySlug,
        totalMapViews,
        topPOIs: [],
        bottomPOIs: [],
        averageScore: 0,
      };
    }

    const pois = await prisma.pOI.findMany({
      where: { id: { in: poiIds } },
      select: { id: true, name: true, status: true },
    });
    const poiNameMap = new Map(pois.map((p) => [p.id, p]));

    // Compute scores for all POIs
    const allScores: EngagementScore[] = [];
    for (const [poiId, eventBreakdown] of poiMap.entries()) {
      const poiInfo = poiNameMap.get(poiId);
      if (!poiInfo) continue;

      const rawScore = computeRawScore(eventBreakdown);
      const totalEvents = sumEvents(eventBreakdown);
      const normalizedScore = totalMapViews > 0
        ? Math.round((rawScore / totalMapViews) * 10000) / 10000
        : 0;

      allScores.push({
        poiId,
        poiName: poiInfo.name,
        rawScore,
        normalizedScore,
        eventBreakdown,
        totalEvents,
      });
    }

    // Sort by normalized score descending
    const sorted = [...allScores].sort((a, b) => b.normalizedScore - a.normalizedScore);

    // Top POIs: highest normalized scores
    const topPOIs = sorted.slice(0, CITY_ENGAGEMENT_LIMIT);

    // Bottom POIs: published POIs with at least MIN_EVENTS_FOR_BOTTOM events, lowest scores
    const publishedPoiIds = new Set(
      pois.filter((p) => p.status === 'PUBLISHED').map((p) => p.id),
    );
    const bottomCandidates = sorted
      .filter((s) => publishedPoiIds.has(s.poiId) && s.totalEvents >= MIN_EVENTS_FOR_BOTTOM)
      .reverse();
    const bottomPOIs = bottomCandidates.slice(0, CITY_ENGAGEMENT_LIMIT);

    // Average score across all POIs
    const averageScore = allScores.length > 0
      ? Math.round(
          (allScores.reduce((sum, s) => sum + s.normalizedScore, 0) / allScores.length) * 10000,
        ) / 10000
      : 0;

    return {
      citySlug,
      totalMapViews,
      topPOIs,
      bottomPOIs,
      averageScore,
    };
  },

  /**
   * Generate a calibration report that compares original AutoResearch
   * scoring with actual user engagement.
   *
   * Identifies high and low performers among POIs published in the last
   * N months that have enough engagement data, and generates simple
   * pattern-based insights for rubric calibration.
   */
  async generateCalibrationReport(citySlug: string): Promise<CalibrationReport> {
    const generatedAt = new Date();
    const lookbackDate = monthsAgo(CALIBRATION_LOOKBACK_MONTHS);

    // 1. Find published POIs in this city created in the lookback window
    const recentPois = await prisma.pOI.findMany({
      where: {
        city: { slug: citySlug },
        status: 'PUBLISHED',
        createdAt: { gte: lookbackDate },
      },
      select: {
        id: true,
        name: true,
        category: { select: { slug: true, name: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });

    if (recentPois.length === 0) {
      return {
        citySlug,
        generatedAt,
        sampleSize: 0,
        highPerformers: [],
        lowPerformers: [],
        insights: ['No published POIs found in the lookback window.'],
      };
    }

    const recentPoiIds = recentPois.map((p) => p.id);

    // 2. Aggregate feedback events for these POIs
    const poiEvents = await prisma.$queryRaw<PoiEventRow[]>`
      SELECT "poi_id" AS "poiId", "event_type" AS "eventType", COUNT(*)::bigint AS "count"
      FROM auto_research_feedback_signals
      WHERE "poi_id" = ANY(${recentPoiIds}::text[])
      GROUP BY "poi_id", "event_type"
    `;

    // Group by POI
    const poiEventMap = new Map<string, Record<string, number>>();
    for (const row of poiEvents) {
      const existing = poiEventMap.get(row.poiId) ?? {};
      poiEventMap.set(row.poiId, { ...existing, [row.eventType]: Number(row.count) });
    }

    // 3. Get total map views for normalization
    const mapViewRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM auto_research_feedback_signals
      WHERE "city_slug" = ${citySlug}
        AND "event_type" = 'poi_click'
    `;
    const totalMapViews = Number(mapViewRows[0]?.count ?? 0);

    // 4. Compute engagement scores for qualifying POIs
    interface PoiWithScore {
      poiId: string;
      name: string;
      engagementScore: number;
      categories: string[];
      totalEvents: number;
      eventBreakdown: Record<string, number>;
    }

    const qualifyingPois: PoiWithScore[] = [];

    for (const poi of recentPois) {
      const breakdown = poiEventMap.get(poi.id);
      if (!breakdown) continue;

      const totalEvents = sumEvents(breakdown);
      if (totalEvents < CALIBRATION_MIN_EVENTS) continue;

      const rawScore = computeRawScore(breakdown);
      const normalizedScore = totalMapViews > 0
        ? Math.round((rawScore / totalMapViews) * 10000) / 10000
        : 0;

      const categories = [poi.category.slug];
      const tagNames = poi.tags.map((t) => t.tag.name);
      categories.push(...tagNames);

      qualifyingPois.push({
        poiId: poi.id,
        name: poi.name,
        engagementScore: normalizedScore,
        categories,
        totalEvents,
        eventBreakdown: breakdown,
      });
    }

    const sampleSize = qualifyingPois.length;

    if (sampleSize === 0) {
      return {
        citySlug,
        generatedAt,
        sampleSize: 0,
        highPerformers: [],
        lowPerformers: [],
        insights: [
          `No POIs met the minimum threshold of ${CALIBRATION_MIN_EVENTS} engagement events in the last ${CALIBRATION_LOOKBACK_MONTHS} months.`,
        ],
      };
    }

    // 5. Look up original AutoResearch proposal scores for these POIs
    //    A POI that came through AutoResearch will have an approved proposal
    //    with resultingPoiId pointing to it.
    const qualifyingPoiIds = qualifyingPois.map((p) => p.poiId);
    const proposals = await prisma.autoResearchProposal.findMany({
      where: {
        resultingPoiId: { in: qualifyingPoiIds },
        status: 'approved',
      },
      select: {
        resultingPoiId: true,
        llmScore: true,
        llmDimensions: true,
      },
    });

    const proposalByPoiId = new Map(
      proposals.map((p) => [p.resultingPoiId, p]),
    );

    // 6. Sort by engagement and pick top/bottom
    const sorted = [...qualifyingPois].sort((a, b) => b.engagementScore - a.engagementScore);

    const topCount = Math.min(CITY_ENGAGEMENT_LIMIT, Math.ceil(sampleSize * 0.2));
    const bottomCount = Math.min(CITY_ENGAGEMENT_LIMIT, Math.ceil(sampleSize * 0.2));

    const highPerformers = sorted.slice(0, topCount).map((p) => ({
      poiId: p.poiId,
      name: p.name,
      originalAutoResearchScore: proposalByPoiId.get(p.poiId)?.llmScore ?? null,
      engagementScore: p.engagementScore,
      categories: p.categories,
    }));

    const lowPerformers = sorted.slice(-bottomCount).reverse().map((p) => ({
      poiId: p.poiId,
      name: p.name,
      originalAutoResearchScore: proposalByPoiId.get(p.poiId)?.llmScore ?? null,
      engagementScore: p.engagementScore,
      categories: p.categories,
    }));

    // 7. Generate simple pattern-based insights
    const insights = generateInsights(qualifyingPois, proposalByPoiId);

    return {
      citySlug,
      generatedAt,
      sampleSize,
      highPerformers,
      lowPerformers,
      insights,
    };
  },
};

// =============================================================================
// Insight Generation
// =============================================================================

/**
 * Generate simple pattern-based insights by comparing AutoResearch rubric
 * dimension scores with actual engagement.
 *
 * This intentionally stays simple -- just identifies which rubric dimensions
 * and categories correlate with high engagement. No automatic rubric changes.
 */
function generateInsights(
  pois: Array<{
    poiId: string;
    name: string;
    engagementScore: number;
    categories: string[];
    eventBreakdown: Record<string, number>;
  }>,
  proposalByPoiId: Map<string | null, { llmScore: number; llmDimensions: unknown }>,
): string[] {
  const insights: string[] = [];

  if (pois.length === 0) return insights;

  // --- Insight 1: Category performance ---
  const categoryScores = new Map<string, { total: number; count: number }>();
  for (const poi of pois) {
    for (const cat of poi.categories) {
      const existing = categoryScores.get(cat) ?? { total: 0, count: 0 };
      categoryScores.set(cat, {
        total: existing.total + poi.engagementScore,
        count: existing.count + 1,
      });
    }
  }

  const categoryAverages = [...categoryScores.entries()]
    .filter(([, v]) => v.count >= 3)
    .map(([cat, v]) => ({ category: cat, avg: v.total / v.count }))
    .sort((a, b) => b.avg - a.avg);

  if (categoryAverages.length >= 2) {
    const best = categoryAverages[0];
    const worst = categoryAverages[categoryAverages.length - 1];
    insights.push(
      `Category "${best.category}" has the highest average engagement (${best.avg.toFixed(4)}), while "${worst.category}" has the lowest (${worst.avg.toFixed(4)}).`,
    );
  }

  // --- Insight 2: Event type patterns for top performers ---
  const sorted = [...pois].sort((a, b) => b.engagementScore - a.engagementScore);
  const topQuartile = sorted.slice(0, Math.max(1, Math.ceil(pois.length * 0.25)));
  const bottomQuartile = sorted.slice(-Math.max(1, Math.ceil(pois.length * 0.25)));

  const topSaveRate = averageEventRate(topQuartile, 'poi_save');
  const bottomSaveRate = averageEventRate(bottomQuartile, 'poi_save');

  if (topSaveRate > 0 && bottomSaveRate > 0 && topSaveRate > bottomSaveRate * 1.5) {
    insights.push(
      `Top-performing POIs have ${(topSaveRate / bottomSaveRate).toFixed(1)}x more saves per total event than bottom performers, suggesting save rate is a strong engagement signal.`,
    );
  }

  const topShareRate = averageEventRate(topQuartile, 'poi_share');
  const bottomShareRate = averageEventRate(bottomQuartile, 'poi_share');

  if (topShareRate > 0 && bottomShareRate > 0 && topShareRate > bottomShareRate * 1.5) {
    insights.push(
      `Top-performing POIs have ${(topShareRate / bottomShareRate).toFixed(1)}x more shares per total event than bottom performers.`,
    );
  }

  // --- Insight 3: Rubric dimension correlation ---
  const poisWithProposal = pois.filter((p) => proposalByPoiId.has(p.poiId));

  if (poisWithProposal.length >= 5) {
    const dimensionCorrelations = computeDimensionCorrelations(poisWithProposal, proposalByPoiId);

    for (const [dimName, correlation] of dimensionCorrelations) {
      if (Math.abs(correlation) >= 0.3) {
        const direction = correlation > 0 ? 'positively' : 'negatively';
        insights.push(
          `Rubric dimension "${dimName}" ${direction} correlates with actual engagement (r=${correlation.toFixed(2)}), suggesting it ${correlation > 0 ? 'is a useful predictor' : 'may not predict real-world appeal'}.`,
        );
      }
    }

    // Check if overall LLM score predicts engagement
    const llmScores = poisWithProposal.map((p) => proposalByPoiId.get(p.poiId)!.llmScore);
    const engScores = poisWithProposal.map((p) => p.engagementScore);
    const overallR = pearsonCorrelation(llmScores, engScores);

    if (overallR !== null) {
      if (overallR >= 0.5) {
        insights.push(
          `Overall AutoResearch LLM score correlates well with engagement (r=${overallR.toFixed(2)}). The rubric is predicting quality effectively.`,
        );
      } else if (overallR <= 0.1) {
        insights.push(
          `Overall AutoResearch LLM score has weak correlation with engagement (r=${overallR.toFixed(2)}). Consider recalibrating rubric weights.`,
        );
      }
    }
  } else if (poisWithProposal.length > 0) {
    insights.push(
      `Only ${poisWithProposal.length} POI(s) came through AutoResearch -- need at least 5 for dimension correlation analysis.`,
    );
  }

  if (insights.length === 0) {
    insights.push('Insufficient data to generate meaningful insights at this time.');
  }

  return insights;
}

/**
 * Compute average rate of a specific event type relative to total events.
 */
function averageEventRate(
  pois: Array<{ eventBreakdown: Record<string, number> }>,
  eventType: string,
): number {
  if (pois.length === 0) return 0;

  let totalRate = 0;
  for (const poi of pois) {
    const total = sumEvents(poi.eventBreakdown);
    const eventCount = poi.eventBreakdown[eventType] ?? 0;
    if (total > 0) {
      totalRate += eventCount / total;
    }
  }
  return totalRate / pois.length;
}

/**
 * Compute Pearson correlation between rubric dimensions and engagement for
 * POIs that came through the AutoResearch pipeline.
 */
function computeDimensionCorrelations(
  pois: Array<{ poiId: string; engagementScore: number }>,
  proposalByPoiId: Map<string | null, { llmScore: number; llmDimensions: unknown }>,
): Map<string, number> {
  const results = new Map<string, number>();

  // Collect all dimension names from the first proposal
  const firstProposal = proposalByPoiId.values().next().value;
  if (!firstProposal || typeof firstProposal.llmDimensions !== 'object' || !firstProposal.llmDimensions) {
    return results;
  }

  const dimNames = Object.keys(firstProposal.llmDimensions as Record<string, number>);

  for (const dimName of dimNames) {
    const dimValues: number[] = [];
    const engValues: number[] = [];

    for (const poi of pois) {
      const proposal = proposalByPoiId.get(poi.poiId);
      if (!proposal) continue;

      const dims = proposal.llmDimensions as Record<string, number> | null;
      if (!dims || typeof dims[dimName] !== 'number') continue;

      dimValues.push(dims[dimName]);
      engValues.push(poi.engagementScore);
    }

    if (dimValues.length >= 5) {
      const r = pearsonCorrelation(dimValues, engValues);
      if (r !== null) {
        results.set(dimName, r);
      }
    }
  }

  return results;
}

/**
 * Compute Pearson correlation coefficient between two arrays.
 * Returns null if the arrays are too short or have zero variance.
 */
function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3 || n !== ys.length) return null;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  if (sumX2 === 0 || sumY2 === 0) return null;

  const r = sumXY / Math.sqrt(sumX2 * sumY2);

  // Clamp to [-1, 1] to handle floating point edge cases
  return Math.round(Math.max(-1, Math.min(1, r)) * 100) / 100;
}
