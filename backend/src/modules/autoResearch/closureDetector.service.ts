import { prisma } from '../../lib/prisma.js';
import { config } from '../../config.js';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GooglePlaceStatus =
  | 'open'
  | 'temporarily_closed'
  | 'permanently_closed'
  | 'unknown';

interface PlaceStatusResult {
  status: GooglePlaceStatus;
  lastChecked: Date;
}

interface FlaggedPOI {
  poiId: string;
  poiName: string;
  reason: 'permanently_closed' | 'temporarily_closed' | 'stale_content' | 'no_engagement';
  evidence: string;
  proposalType: 'remove_poi' | 'flag_review';
}

interface RunForCitySummary {
  citySlug: string;
  checked: number;
  flagged: number;
  closed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** POIs not updated in this many days are considered stale */
const STALE_CONTENT_DAYS = 180; // 6 months

/** POIs with zero feedback signals in this many days may need review */
const NO_ENGAGEMENT_DAYS = 90;

/** Max Google Places API calls per second */
const RATE_LIMIT_PER_SECOND = 5;

/** Delay between Google Places API calls (ms) */
const RATE_LIMIT_DELAY_MS = Math.ceil(1000 / RATE_LIMIT_PER_SECOND);

// ---------------------------------------------------------------------------
// Google Places businessStatus mapping
// ---------------------------------------------------------------------------

/**
 * Maps the Google Places API (New) `businessStatus` field to our internal
 * status enum. The new Places API uses the field name `businessStatus` with
 * values like OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY.
 */
function mapBusinessStatus(businessStatus: string | undefined): GooglePlaceStatus {
  if (!businessStatus) return 'unknown';

  switch (businessStatus.toUpperCase()) {
    case 'OPERATIONAL':
      return 'open';
    case 'CLOSED_TEMPORARILY':
      return 'temporarily_closed';
    case 'CLOSED_PERMANENTLY':
      return 'permanently_closed';
    default:
      return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Rate limiting helper
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Audit trail helper
// ---------------------------------------------------------------------------

async function logAuditTrail(params: {
  poiId?: string;
  eventType: string;
  proposalId?: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.autoResearchAuditTrail.create({
      data: {
        poiId: params.poiId ?? null,
        eventType: params.eventType,
        proposalId: params.proposalId ?? null,
        actorType: 'system',
        actorId: null,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error('[ClosureDetector] Failed to write audit trail:', err);
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const closureDetectorService = {
  /**
   * Check a single Google Place's business status via the Places API (New).
   * Returns the operational status and the timestamp of the check.
   *
   * If the Google Places API key is not configured, returns 'unknown' and
   * logs a warning (does not throw).
   */
  async checkGooglePlacesStatus(
    googlePlaceId: string,
  ): Promise<PlaceStatusResult> {
    const lastChecked = new Date();

    if (!config.googlePlacesApiKey) {
      console.warn(
        '[ClosureDetector] GOOGLE_PLACES_API_KEY not configured — skipping status check',
      );
      return { status: 'unknown', lastChecked };
    }

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${googlePlaceId}`,
        {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': config.googlePlacesApiKey,
            'X-Goog-FieldMask': 'id,businessStatus',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[ClosureDetector] Google Places API error for ${googlePlaceId}: ${response.status} ${errorText}`,
        );
        return { status: 'unknown', lastChecked };
      }

      const data = (await response.json()) as {
        id?: string;
        businessStatus?: string;
      };

      return {
        status: mapBusinessStatus(data.businessStatus),
        lastChecked,
      };
    } catch (err) {
      console.error(
        `[ClosureDetector] Failed to check Google Places status for ${googlePlaceId}:`,
        err,
      );
      return { status: 'unknown', lastChecked };
    }
  },

  /**
   * Find POIs within a city that may need review based on:
   * 1. Content staleness (not updated in > 6 months)
   * 2. Zero engagement signals in > 90 days (if city has decent traffic)
   * 3. Google Places closed status
   *
   * This method does NOT call Google Places — it only queries the local DB.
   * Google Places checks are done separately in `runForCity`.
   */
  async detectStalePOIs(
    citySlug: string,
  ): Promise<FlaggedPOI[]> {
    const flagged: FlaggedPOI[] = [];

    // Get the city
    const city = await prisma.city.findUnique({
      where: { slug: citySlug },
      select: { id: true, slug: true },
    });

    if (!city) {
      console.warn(`[ClosureDetector] City not found: ${citySlug}`);
      return flagged;
    }

    const now = new Date();

    // -----------------------------------------------------------------------
    // 1. POIs not updated in > 6 months
    // -----------------------------------------------------------------------
    const staleCutoff = new Date(
      now.getTime() - STALE_CONTENT_DAYS * 24 * 60 * 60 * 1000,
    );

    const stalePOIs = await prisma.pOI.findMany({
      where: {
        cityId: city.id,
        status: 'PUBLISHED',
        updatedAt: { lt: staleCutoff },
      },
      select: { id: true, name: true, updatedAt: true },
    });

    for (const poi of stalePOIs) {
      const daysSinceUpdate = Math.floor(
        (now.getTime() - poi.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      flagged.push({
        poiId: poi.id,
        poiName: poi.name,
        reason: 'stale_content',
        evidence: `POI has not been updated in ${daysSinceUpdate} days (last updated: ${poi.updatedAt.toISOString()})`,
        proposalType: 'flag_review',
      });
    }

    // -----------------------------------------------------------------------
    // 2. POIs with zero feedback signals in > 90 days
    //    Only flag if the city has some baseline traffic (at least 10 total
    //    feedback signals in the period, meaning the city is being used)
    // -----------------------------------------------------------------------
    const engagementCutoff = new Date(
      now.getTime() - NO_ENGAGEMENT_DAYS * 24 * 60 * 60 * 1000,
    );

    // Check if the city has decent traffic
    const cityFeedbackCount = await prisma.autoResearchFeedbackSignal.count({
      where: {
        citySlug,
        createdAt: { gte: engagementCutoff },
      },
    });

    if (cityFeedbackCount >= 10) {
      // City has traffic — find POIs with zero engagement
      const publishedPOIs = await prisma.pOI.findMany({
        where: {
          cityId: city.id,
          status: 'PUBLISHED',
        },
        select: { id: true, name: true },
      });

      for (const poi of publishedPOIs) {
        // Skip if already flagged for staleness
        if (flagged.some((f) => f.poiId === poi.id)) continue;

        const feedbackCount =
          await prisma.autoResearchFeedbackSignal.count({
            where: {
              poiId: poi.id,
              createdAt: { gte: engagementCutoff },
            },
          });

        if (feedbackCount === 0) {
          flagged.push({
            poiId: poi.id,
            poiName: poi.name,
            reason: 'no_engagement',
            evidence: `POI has received zero user engagement signals in the last ${NO_ENGAGEMENT_DAYS} days despite the city having ${cityFeedbackCount} total signals`,
            proposalType: 'flag_review',
          });
        }
      }
    }

    return flagged;
  },

  /**
   * Main entry point for a single city. Checks all PUBLISHED POIs for
   * closure/staleness and creates proposals in the curator queue.
   *
   * Steps:
   * 1. Fetch all PUBLISHED POIs for the city
   * 2. Check Google Places status for POIs with a googlePlaceId
   * 3. Detect stale/unengaged POIs via local DB queries
   * 4. Create AutoResearchProposal records for each flagged POI
   * 5. Log to AutoResearchAuditTrail
   */
  async runForCity(
    citySlug: string,
  ): Promise<RunForCitySummary> {
    console.log(`[ClosureDetector] Running for city: ${citySlug}`);

    const city = await prisma.city.findUnique({
      where: { slug: citySlug },
      select: { id: true, slug: true, name: true },
    });

    if (!city) {
      console.warn(`[ClosureDetector] City not found: ${citySlug}`);
      return { citySlug, checked: 0, flagged: 0, closed: 0 };
    }

    // Fetch all PUBLISHED POIs for the city
    const publishedPOIs = await prisma.pOI.findMany({
      where: {
        cityId: city.id,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        name: true,
        googlePlaceId: true,
        updatedAt: true,
      },
    });

    const checked = publishedPOIs.length;
    const flaggedPOIs: FlaggedPOI[] = [];
    let closedCount = 0;

    // -----------------------------------------------------------------
    // Step 1: Check Google Places status for POIs with a googlePlaceId
    // -----------------------------------------------------------------
    const poisWithGoogleId = publishedPOIs.filter(
      (poi) => poi.googlePlaceId != null,
    );

    for (const poi of poisWithGoogleId) {
      const statusResult = await closureDetectorService.checkGooglePlacesStatus(
        poi.googlePlaceId!,
      );

      if (statusResult.status === 'permanently_closed') {
        closedCount++;
        flaggedPOIs.push({
          poiId: poi.id,
          poiName: poi.name,
          reason: 'permanently_closed',
          evidence: `Google Places reports this location as permanently closed (checked: ${statusResult.lastChecked.toISOString()})`,
          proposalType: 'remove_poi',
        });
      } else if (statusResult.status === 'temporarily_closed') {
        closedCount++;
        flaggedPOIs.push({
          poiId: poi.id,
          poiName: poi.name,
          reason: 'temporarily_closed',
          evidence: `Google Places reports this location as temporarily closed (checked: ${statusResult.lastChecked.toISOString()})`,
          proposalType: 'flag_review',
        });
      }

      // Rate limit: wait between API calls
      await delay(RATE_LIMIT_DELAY_MS);
    }

    // -----------------------------------------------------------------
    // Step 2: Detect stale / unengaged POIs via local DB queries
    // -----------------------------------------------------------------
    const staleFlagged = await closureDetectorService.detectStalePOIs(citySlug);

    // Merge, avoiding duplicates (a POI already flagged by Google check)
    for (const stale of staleFlagged) {
      if (!flaggedPOIs.some((f) => f.poiId === stale.poiId)) {
        flaggedPOIs.push(stale);
      }
    }

    // -----------------------------------------------------------------
    // Step 3: Create AutoResearchProposal for each flagged POI
    // -----------------------------------------------------------------
    for (const flagged of flaggedPOIs) {
      try {
        // Check if there's already a pending proposal for this POI
        const existingProposal =
          await prisma.autoResearchProposal.findFirst({
            where: {
              existingPoiId: flagged.poiId,
              proposalType: {
                in: ['remove_poi', 'flag_review'],
              },
              status: 'pending',
            },
            select: { id: true },
          });

        if (existingProposal) {
          console.log(
            `[ClosureDetector] Skipping ${flagged.poiName} — pending proposal already exists (${existingProposal.id})`,
          );
          continue;
        }

        const proposal = await prisma.autoResearchProposal.create({
          data: {
            candidateId: null,
            proposalType: flagged.proposalType,
            citySlug,
            existingPoiId: flagged.poiId,

            // No LLM scoring for closure detection
            llmScore: 0,
            llmDimensions: {} as Prisma.InputJsonValue,
            llmReasoning: `Automated closure/staleness detection: ${flagged.reason}`,
            llmConcerns: null,
            llmModel: 'none',
            llmPromptVersion: 'closure-detector-v1',

            // Proposal content
            suggestedName: null,
            suggestedCategory: null,
            suggestedDesc: null,
            evidenceSummary: flagged.evidence,
            sourceUrls: [],

            // Review state
            status: 'pending',
          },
        });

        // Log to audit trail
        await logAuditTrail({
          poiId: flagged.poiId,
          eventType: 'proposal_created',
          proposalId: proposal.id,
          metadata: {
            source: 'closure_detector',
            citySlug,
            reason: flagged.reason,
            proposalType: flagged.proposalType,
            poiName: flagged.poiName,
            evidence: flagged.evidence,
          },
        });
      } catch (err) {
        console.error(
          `[ClosureDetector] Failed to create proposal for POI ${flagged.poiId} (${flagged.poiName}):`,
          err,
        );
      }
    }

    // -----------------------------------------------------------------
    // Step 4: Log summary to audit trail
    // -----------------------------------------------------------------
    await logAuditTrail({
      eventType: 'closure_detector_run',
      metadata: {
        citySlug,
        checked,
        flagged: flaggedPOIs.length,
        closed: closedCount,
        poisWithGoogleId: poisWithGoogleId.length,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(
      `[ClosureDetector] Done for ${citySlug}: checked=${checked}, flagged=${flaggedPOIs.length}, closed=${closedCount}`,
    );

    return {
      citySlug,
      checked,
      flagged: flaggedPOIs.length,
      closed: closedCount,
    };
  },

  /**
   * Iterate through all PUBLISHED cities and run closure/staleness checks.
   * Returns a summary for each city processed.
   */
  async runForAllCities(): Promise<RunForCitySummary[]> {
    console.log('[ClosureDetector] Starting run for all published cities...');

    const cities = await prisma.city.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (cities.length === 0) {
      console.log('[ClosureDetector] No published cities found — nothing to do');
      return [];
    }

    console.log(
      `[ClosureDetector] Found ${cities.length} published cities to check`,
    );

    const summaries: RunForCitySummary[] = [];

    for (const city of cities) {
      try {
        const summary = await closureDetectorService.runForCity(city.slug);
        summaries.push(summary);
      } catch (err) {
        console.error(
          `[ClosureDetector] Error processing city ${city.slug}:`,
          err,
        );
        summaries.push({
          citySlug: city.slug,
          checked: 0,
          flagged: 0,
          closed: 0,
        });
      }
    }

    // Log aggregate summary
    const totals = summaries.reduce(
      (acc, s) => ({
        checked: acc.checked + s.checked,
        flagged: acc.flagged + s.flagged,
        closed: acc.closed + s.closed,
      }),
      { checked: 0, flagged: 0, closed: 0 },
    );

    await logAuditTrail({
      eventType: 'closure_detector_full_run',
      metadata: {
        citiesProcessed: cities.length,
        ...totals,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(
      `[ClosureDetector] Full run complete: ${cities.length} cities, ${totals.checked} POIs checked, ${totals.flagged} flagged, ${totals.closed} closed`,
    );

    return summaries;
  },
};
