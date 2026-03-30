import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { scoringService } from './scoring.service.js';
import type { ScoringResult } from './scoring.service.js';

// =============================================================================
// Types
// =============================================================================

export interface PipelineRunResult {
  citySlug: string;
  signals: {
    processed: number;
    candidatesCreated: number;
    candidatesUpdated: number;
    duplicatesSkipped: number;
  };
  scoring: {
    scored: number;
    proposed: number;
    autoRejected: number;
    failed: number;
  };
  durationMs: number;
}

interface PlaceLocation {
  lat: number;
  lng: number;
  area?: string;
}

interface SignalGroup {
  placeName: string;
  location: PlaceLocation | null;
  signals: Array<{
    id: string;
    source: string;
    rawData: unknown;
    placeName: string;
    placeLocation: unknown;
    signalType: string;
  }>;
}

// =============================================================================
// Fuzzy Matching Helpers
// =============================================================================

function normalizeName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function coordinatesNearby(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  thresholdMeters = 200,
): boolean {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distance = 2 * R * Math.asin(Math.sqrt(a));
  return distance < thresholdMeters;
}

function parseLocation(loc: unknown): PlaceLocation | null {
  if (!loc || typeof loc !== 'object') return null;
  const obj = loc as Record<string, unknown>;
  if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
    return { lat: obj.lat, lng: obj.lng, area: typeof obj.area === 'string' ? obj.area : undefined };
  }
  return null;
}

function signalsBelongToSamePlace(
  nameA: string,
  locA: PlaceLocation | null,
  nameB: string,
  locB: PlaceLocation | null,
): boolean {
  const exactNameMatch = normalizeName(nameA) === normalizeName(nameB);
  if (exactNameMatch) return true;

  // Fuzzy name match (contains) + coordinate proximity
  if (namesMatch(nameA, nameB) && locA && locB) {
    return coordinatesNearby(locA.lat, locA.lng, locB.lat, locB.lng);
  }

  return false;
}

// =============================================================================
// Signal Grouping
// =============================================================================

function groupSignalsByPlace(
  signals: Array<{
    id: string;
    source: string;
    rawData: unknown;
    placeName: string;
    placeLocation: unknown;
    signalType: string;
  }>,
): SignalGroup[] {
  const groups: SignalGroup[] = [];

  for (const signal of signals) {
    const signalLoc = parseLocation(signal.placeLocation);
    let matched = false;

    for (const group of groups) {
      if (signalsBelongToSamePlace(signal.placeName, signalLoc, group.placeName, group.location)) {
        group.signals.push(signal);
        // Update location if we have one and the group doesn't
        if (signalLoc && !group.location) {
          group.location = signalLoc;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.push({
        placeName: signal.placeName,
        location: signalLoc,
        signals: [signal],
      });
    }
  }

  return groups;
}

// =============================================================================
// Evidence Merging
// =============================================================================

function mergeEvidence(
  existing: Record<string, unknown>,
  newRawData: unknown,
  source: string,
): Record<string, unknown> {
  const merged = { ...existing };

  // Store new evidence under source key to preserve provenance
  const sourceKey = `source_${source}`;
  const existingSourceData = merged[sourceKey];

  if (Array.isArray(existingSourceData)) {
    merged[sourceKey] = [...existingSourceData, newRawData];
  } else if (existingSourceData !== undefined) {
    merged[sourceKey] = [existingSourceData, newRawData];
  } else {
    merged[sourceKey] = [newRawData];
  }

  return merged;
}

function buildEvidenceFromGroup(signals: SignalGroup['signals']): Record<string, unknown> {
  let evidence: Record<string, unknown> = {};
  for (const signal of signals) {
    evidence = mergeEvidence(evidence, signal.rawData, signal.source);
  }
  return evidence;
}

// =============================================================================
// Audit Trail Helper
// =============================================================================

async function logAuditEvent(event: {
  poiId?: string;
  eventType: string;
  proposalId?: string;
  actorType: 'system' | 'curator';
  actorId?: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.autoResearchAuditTrail.create({
      data: {
        poiId: event.poiId ?? null,
        eventType: event.eventType,
        proposalId: event.proposalId ?? null,
        actorType: event.actorType,
        actorId: event.actorId ?? null,
        metadata: event.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Audit logging should not break the pipeline
    console.error('Failed to log audit event:', err instanceof Error ? err.message : String(err));
  }
}

// =============================================================================
// Delay Helper
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Pipeline Service
// =============================================================================

export const pipelineService = {
  /**
   * Process pending signals for a city: deduplicate, resolve entities,
   * create or update candidates.
   */
  async processSignals(citySlug: string): Promise<{
    processed: number;
    candidatesCreated: number;
    candidatesUpdated: number;
    duplicatesSkipped: number;
  }> {
    // 1. Fetch all pending signals for the city
    const pendingSignals = await prisma.autoResearchSignal.findMany({
      where: { citySlug, status: 'pending' },
      orderBy: { scrapedAt: 'asc' },
    });

    if (pendingSignals.length === 0) {
      return { processed: 0, candidatesCreated: 0, candidatesUpdated: 0, duplicatesSkipped: 0 };
    }

    // 2. Group signals by place identity
    const groups = groupSignalsByPlace(
      pendingSignals.map((s) => ({
        id: s.id,
        source: s.source,
        rawData: s.rawData,
        placeName: s.placeName,
        placeLocation: s.placeLocation,
        signalType: s.signalType,
      })),
    );

    let candidatesCreated = 0;
    let candidatesUpdated = 0;
    let duplicatesSkipped = 0;
    const processedSignalIds: string[] = [];

    // 3. For each group, find or create a candidate
    for (const group of groups) {
      const signalIds = group.signals.map((s) => s.id);
      const sources = [...new Set(group.signals.map((s) => s.source))];
      const evidence = buildEvidenceFromGroup(group.signals);

      // Check for existing candidate with matching name + city
      const existingCandidates = await prisma.autoResearchCandidate.findMany({
        where: { citySlug },
      });

      const matchingCandidate = existingCandidates.find((c) => {
        const candidateLoc = parseLocation(c.placeLocation);
        return signalsBelongToSamePlace(
          group.placeName,
          group.location,
          c.placeName,
          candidateLoc,
        );
      });

      if (matchingCandidate) {
        // Update existing candidate: increment corroboration, merge sources and evidence
        const existingSources = matchingCandidate.sources ?? [];
        const mergedSources = [...new Set([...existingSources, ...sources])];
        const existingEvidence =
          (matchingCandidate.aggregatedEvidence as Record<string, unknown>) ?? {};
        let mergedEvidence = { ...existingEvidence };
        for (const signal of group.signals) {
          mergedEvidence = mergeEvidence(mergedEvidence, signal.rawData, signal.source);
        }

        await prisma.autoResearchCandidate.update({
          where: { id: matchingCandidate.id },
          data: {
            corroborationCount: matchingCandidate.corroborationCount + group.signals.length,
            sources: mergedSources,
            aggregatedEvidence: mergedEvidence as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        });

        // Link signals to candidate
        await prisma.autoResearchSignal.updateMany({
          where: { id: { in: signalIds } },
          data: {
            status: 'aggregated',
            candidateId: matchingCandidate.id,
            processedAt: new Date(),
          },
        });

        candidatesUpdated++;
      } else {
        // Create new candidate
        const location = group.location ?? { lat: 0, lng: 0 };

        const newCandidate = await prisma.autoResearchCandidate.create({
          data: {
            placeName: group.placeName,
            placeLocation: location as unknown as Prisma.InputJsonValue,
            citySlug,
            corroborationCount: group.signals.length,
            sources,
            aggregatedEvidence: evidence as Prisma.InputJsonValue,
            status: 'pending',
          },
        });

        // Link signals to candidate
        await prisma.autoResearchSignal.updateMany({
          where: { id: { in: signalIds } },
          data: {
            status: 'aggregated',
            candidateId: newCandidate.id,
            processedAt: new Date(),
          },
        });

        await logAuditEvent({
          eventType: 'candidate_created',
          actorType: 'system',
          metadata: {
            candidateId: newCandidate.id,
            placeName: group.placeName,
            citySlug,
            signalCount: group.signals.length,
            sources,
          },
        });

        candidatesCreated++;
      }

      processedSignalIds.push(...signalIds);
    }

    // Count duplicates: signals that were in the same group as others
    for (const group of groups) {
      if (group.signals.length > 1) {
        duplicatesSkipped += group.signals.length - 1;
      }
    }

    return {
      processed: processedSignalIds.length,
      candidatesCreated,
      candidatesUpdated,
      duplicatesSkipped,
    };
  },

  /**
   * Score unscored candidates via LLM and create proposals for high-scoring ones.
   */
  async scoreCandidates(citySlug: string): Promise<{
    scored: number;
    proposed: number;
    autoRejected: number;
    failed: number;
  }> {
    const SCORE_THRESHOLD = 5.0;

    // 1. Fetch all pending candidates for the city
    const candidates = await prisma.autoResearchCandidate.findMany({
      where: { citySlug, status: 'pending' },
      orderBy: { corroborationCount: 'desc' },
    });

    let scored = 0;
    let proposed = 0;
    let autoRejected = 0;
    let failed = 0;

    // 2. Score each candidate
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];

      try {
        // Pre-filter check
        const preFilterResult = await scoringService.preFilter(candidate.placeName, citySlug);

        if (!preFilterResult.pass) {
          await prisma.autoResearchCandidate.update({
            where: { id: candidate.id },
            data: { status: 'rejected' },
          });

          await logAuditEvent({
            eventType: 'llm_scored',
            actorType: 'system',
            metadata: {
              candidateId: candidate.id,
              placeName: candidate.placeName,
              citySlug,
              preFilterRejected: true,
              reason: preFilterResult.reason ?? 'Pre-filter failed',
            },
          });

          autoRejected++;
          continue;
        }

        // LLM scoring
        const evidence = (candidate.aggregatedEvidence as Record<string, unknown>) ?? {};
        const scoringResult: ScoringResult = await scoringService.scoreCandidate({
          placeName: candidate.placeName,
          citySlug: candidate.citySlug,
          area: parseLocation(candidate.placeLocation)?.area,
          sources: candidate.sources,
          evidence,
          corroborationCount: candidate.corroborationCount,
        });

        scored++;

        if (scoringResult.compositeScore >= SCORE_THRESHOLD) {
          // Create proposal
          const proposal = await prisma.autoResearchProposal.create({
            data: {
              candidateId: candidate.id,
              proposalType: 'add_poi',
              citySlug,
              llmScore: scoringResult.compositeScore,
              llmDimensions: scoringResult.dimensions,
              llmReasoning: scoringResult.reasoning,
              llmConcerns: scoringResult.concerns,
              llmModel: scoringResult.model,
              llmPromptVersion: scoringResult.promptVersion,
              suggestedName: candidate.placeName,
              evidenceSummary: buildEvidenceSummary(candidate, scoringResult),
              sourceUrls: extractSourceUrls(evidence),
              status: 'pending',
            },
          });

          await prisma.autoResearchCandidate.update({
            where: { id: candidate.id },
            data: { status: 'proposed' },
          });

          await logAuditEvent({
            eventType: 'proposal_created',
            proposalId: proposal.id,
            actorType: 'system',
            metadata: {
              candidateId: candidate.id,
              placeName: candidate.placeName,
              citySlug,
              compositeScore: scoringResult.compositeScore,
              recommendation: scoringResult.recommendation,
              dimensions: scoringResult.dimensions,
            },
          });

          proposed++;
        } else {
          // Score too low, reject
          await prisma.autoResearchCandidate.update({
            where: { id: candidate.id },
            data: { status: 'rejected' },
          });

          await logAuditEvent({
            eventType: 'llm_scored',
            actorType: 'system',
            metadata: {
              candidateId: candidate.id,
              placeName: candidate.placeName,
              citySlug,
              compositeScore: scoringResult.compositeScore,
              recommendation: scoringResult.recommendation,
              reason: `Score ${scoringResult.compositeScore} below threshold ${SCORE_THRESHOLD}`,
            },
          });

          autoRejected++;
        }

        // Rate limit delay between LLM calls (skip after last candidate)
        if (i < candidates.length - 1) {
          await delay(1000);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(
          `Failed to score candidate ${candidate.id} ("${candidate.placeName}"):`,
          errorMessage,
        );

        await logAuditEvent({
          eventType: 'llm_scored',
          actorType: 'system',
          metadata: {
            candidateId: candidate.id,
            placeName: candidate.placeName,
            citySlug,
            error: errorMessage,
          },
        });

        failed++;
      }
    }

    return { scored, proposed, autoRejected, failed };
  },

  /**
   * Run the full pipeline for a city: processSignals followed by scoreCandidates.
   */
  async runForCity(citySlug: string): Promise<PipelineRunResult> {
    const startTime = Date.now();

    const signalsResult = await pipelineService.processSignals(citySlug);
    const scoringResult = await pipelineService.scoreCandidates(citySlug);

    return {
      citySlug,
      signals: signalsResult,
      scoring: scoringResult,
      durationMs: Date.now() - startTime,
    };
  },

  /**
   * Run the pipeline for all active (published) cities.
   */
  async runForAllCities(): Promise<PipelineRunResult[]> {
    const activeCities = await prisma.city.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true },
      orderBy: { sortOrder: 'asc' },
    });

    const results: PipelineRunResult[] = [];

    for (const city of activeCities) {
      try {
        const result = await pipelineService.runForCity(city.slug);
        results.push(result);
      } catch (err) {
        console.error(
          `Pipeline failed for city "${city.slug}":`,
          err instanceof Error ? err.message : String(err),
        );
        results.push({
          citySlug: city.slug,
          signals: { processed: 0, candidatesCreated: 0, candidatesUpdated: 0, duplicatesSkipped: 0 },
          scoring: { scored: 0, proposed: 0, autoRejected: 0, failed: 0 },
          durationMs: 0,
        });
      }
    }

    return results;
  },
};

// =============================================================================
// Helpers for Proposal Creation
// =============================================================================

function buildEvidenceSummary(
  candidate: {
    placeName: string;
    sources: string[];
    corroborationCount: number;
    aggregatedEvidence: unknown;
  },
  scoringResult: ScoringResult,
): string {
  const sourceList = candidate.sources.join(', ');
  const lines = [
    `"${candidate.placeName}" was detected by ${candidate.corroborationCount} signal(s) from: ${sourceList}.`,
    `LLM composite score: ${scoringResult.compositeScore} (raw: ${scoringResult.rawScore}).`,
    `Recommendation: ${scoringResult.recommendation}.`,
    `Reasoning: ${scoringResult.reasoning}`,
  ];

  if (scoringResult.concerns) {
    lines.push(`Concerns: ${scoringResult.concerns}`);
  }

  return lines.join('\n');
}

function extractSourceUrls(evidence: Record<string, unknown>): string[] {
  const urls: string[] = [];

  for (const value of Object.values(evidence)) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        // Look for common URL field names in raw signal data
        for (const key of ['url', 'link', 'sourceUrl', 'source_url', 'permalink']) {
          if (typeof obj[key] === 'string' && obj[key]) {
            urls.push(obj[key] as string);
          }
        }
      }
    }
  }

  return [...new Set(urls)];
}
