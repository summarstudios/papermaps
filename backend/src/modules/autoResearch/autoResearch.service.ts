import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { slugify } from '../../utils/slugify.js';

// ============================================================================
// Types
// ============================================================================

export interface ListProposalsFilters {
  citySlug?: string;
  status?: string;
  proposalType?: string;
  minScore?: number;
  page: number;
  limit: number;
}

export interface ListSignalsFilters {
  source?: string;
  citySlug?: string;
  status?: string;
  page: number;
  limit: number;
}

export interface ListJobsFilters {
  page: number;
  limit: number;
}

export interface ApproveProposalInput {
  reviewedById: string;
  reviewNote?: string;
}

export interface RejectProposalInput {
  reviewedById: string;
  reviewNote: string;
}

export interface DeferProposalInput {
  reviewedById: string;
  reviewNote?: string;
}

export interface RecordFeedbackInput {
  poiId: string;
  citySlug: string;
  eventType: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface TriggerJobInput {
  citySlug: string;
  userId: string;
}

// ============================================================================
// Service
// ============================================================================

export const autoResearchService = {
  // --------------------------------------------------------------------------
  // Proposals
  // --------------------------------------------------------------------------

  async listProposals(filters: ListProposalsFilters) {
    const { citySlug, status, proposalType, minScore, page, limit } = filters;
    const where: Prisma.AutoResearchProposalWhereInput = {};

    if (citySlug) where.citySlug = citySlug;
    if (status) where.status = status;
    if (proposalType) where.proposalType = proposalType;
    if (minScore !== undefined) where.llmScore = { gte: minScore };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.autoResearchProposal.findMany({
        where,
        include: {
          candidate: { select: { id: true, placeName: true, corroborationCount: true, sources: true } },
          reviewedBy: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.autoResearchProposal.count({ where }),
    ]);

    return { data, total };
  },

  async getProposalById(id: string) {
    return prisma.autoResearchProposal.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            signals: {
              orderBy: { scrapedAt: 'desc' },
              take: 50,
            },
          },
        },
        reviewedBy: { select: { id: true, email: true, name: true } },
      },
    });
  },

  async approveProposal(id: string, input: ApproveProposalInput) {
    const proposal = await prisma.autoResearchProposal.findUnique({
      where: { id },
      include: { candidate: true },
    });

    if (!proposal) return null;
    if (proposal.status !== 'pending') {
      throw new Error(`Proposal is already ${proposal.status}`);
    }

    let resultingPoiId: string | undefined;

    // If this is an add_poi proposal, create a POI stub under review
    if (proposal.proposalType === 'add_poi') {
      const poi = await createPoiFromProposal(proposal);
      resultingPoiId = poi.id;
    }

    const updated = await prisma.autoResearchProposal.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote,
        ...(resultingPoiId ? { resultingPoiId } : {}),
      },
      include: {
        candidate: { select: { id: true, placeName: true } },
        reviewedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log to AutoResearch audit trail
    await logAutoResearchAudit({
      poiId: resultingPoiId,
      eventType: 'proposal_reviewed',
      proposalId: id,
      actorType: 'curator',
      actorId: input.reviewedById,
      metadata: { action: 'approved', reviewNote: input.reviewNote, resultingPoiId },
    });

    return updated;
  },

  async rejectProposal(id: string, input: RejectProposalInput) {
    const proposal = await prisma.autoResearchProposal.findUnique({ where: { id } });
    if (!proposal) return null;
    if (proposal.status !== 'pending') {
      throw new Error(`Proposal is already ${proposal.status}`);
    }

    const updated = await prisma.autoResearchProposal.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote,
      },
      include: {
        candidate: { select: { id: true, placeName: true } },
        reviewedBy: { select: { id: true, email: true, name: true } },
      },
    });

    await logAutoResearchAudit({
      poiId: proposal.existingPoiId ?? undefined,
      eventType: 'proposal_reviewed',
      proposalId: id,
      actorType: 'curator',
      actorId: input.reviewedById,
      metadata: { action: 'rejected', reviewNote: input.reviewNote },
    });

    return updated;
  },

  async deferProposal(id: string, input: DeferProposalInput) {
    const proposal = await prisma.autoResearchProposal.findUnique({ where: { id } });
    if (!proposal) return null;
    if (proposal.status !== 'pending') {
      throw new Error(`Proposal is already ${proposal.status}`);
    }

    const updated = await prisma.autoResearchProposal.update({
      where: { id },
      data: {
        status: 'deferred',
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote,
      },
      include: {
        candidate: { select: { id: true, placeName: true } },
        reviewedBy: { select: { id: true, email: true, name: true } },
      },
    });

    await logAutoResearchAudit({
      poiId: proposal.existingPoiId ?? undefined,
      eventType: 'proposal_reviewed',
      proposalId: id,
      actorType: 'curator',
      actorId: input.reviewedById,
      metadata: { action: 'deferred', reviewNote: input.reviewNote },
    });

    return updated;
  },

  // --------------------------------------------------------------------------
  // Signals
  // --------------------------------------------------------------------------

  async listSignals(filters: ListSignalsFilters) {
    const { source, citySlug, status, page, limit } = filters;
    const where: Prisma.AutoResearchSignalWhereInput = {};

    if (source) where.source = source;
    if (citySlug) where.citySlug = citySlug;
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.autoResearchSignal.findMany({
        where,
        include: {
          candidate: { select: { id: true, placeName: true, status: true } },
        },
        orderBy: { scrapedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.autoResearchSignal.count({ where }),
    ]);

    return { data, total };
  },

  async getSignalStats() {
    const [bySource, byCity, byDay] = await Promise.all([
      prisma.autoResearchSignal.groupBy({
        by: ['source'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.autoResearchSignal.groupBy({
        by: ['citySlug'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE("scraped_at") as day, COUNT(*)::bigint as count
        FROM auto_research_signals
        WHERE "scraped_at" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("scraped_at")
        ORDER BY day DESC
      `,
    ]);

    return {
      bySource: bySource.map((r) => ({ source: r.source, count: r._count.id })),
      byCity: byCity.map((r) => ({ citySlug: r.citySlug, count: r._count.id })),
      byDay: byDay.map((r) => ({ day: String(r.day), count: Number(r.count) })),
    };
  },

  // --------------------------------------------------------------------------
  // Jobs
  // --------------------------------------------------------------------------

  async listJobs(filters: ListJobsFilters) {
    const { page, limit } = filters;
    const where = {
      eventType: { in: ['job_started', 'job_completed', 'job_failed'] },
    };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.autoResearchAuditTrail.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.autoResearchAuditTrail.count({ where }),
    ]);

    return { data, total };
  },

  async triggerJob(input: TriggerJobInput) {
    // Verify city exists
    const city = await prisma.city.findUnique({
      where: { slug: input.citySlug },
      select: { id: true, slug: true, name: true },
    });
    if (!city) return null;

    // Record the trigger in audit trail
    const auditEntry = await prisma.autoResearchAuditTrail.create({
      data: {
        eventType: 'job_started',
        actorType: 'curator',
        actorId: input.userId,
        metadata: {
          citySlug: input.citySlug,
          cityName: city.name,
          triggeredManually: true,
        },
      },
    });

    return { jobId: auditEntry.id, citySlug: input.citySlug, cityName: city.name };
  },

  // --------------------------------------------------------------------------
  // City Readiness
  // --------------------------------------------------------------------------

  async getCityReadiness() {
    return prisma.cityReadinessScore.findMany({
      orderBy: { readinessScore: 'desc' },
    });
  },

  // --------------------------------------------------------------------------
  // Feedback
  // --------------------------------------------------------------------------

  async recordFeedbackEvent(input: RecordFeedbackInput) {
    return prisma.autoResearchFeedbackSignal.create({
      data: {
        poiId: input.poiId,
        citySlug: input.citySlug,
        eventType: input.eventType,
        sessionId: input.sessionId,
        metadata: input.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
    });
  },
};

// ============================================================================
// Helpers
// ============================================================================

async function createPoiFromProposal(proposal: {
  id: string;
  citySlug: string;
  suggestedName: string | null;
  suggestedCategory: string | null;
  suggestedDesc: string | null;
  candidate: { placeLocation: unknown; resolvedGoogleId: string | null } | null;
}) {
  // Resolve city by slug
  const city = await prisma.city.findUnique({ where: { slug: proposal.citySlug } });
  if (!city) {
    throw new Error(`City not found for slug: ${proposal.citySlug}`);
  }

  const name = proposal.suggestedName ?? 'Untitled Place';
  const baseSlug = slugify(name);

  // Ensure unique slug within city
  const existingSlugs = await prisma.pOI.findMany({
    where: { cityId: city.id, slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slugSet = new Set(existingSlugs.map((p) => p.slug));
  let slug = baseSlug;
  let counter = 1;
  while (slugSet.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Resolve category — fall back to first global category if suggestedCategory doesn't match
  let categoryId: string | undefined;
  if (proposal.suggestedCategory) {
    const category = await prisma.category.findFirst({
      where: {
        slug: proposal.suggestedCategory,
        OR: [{ isGlobal: true }, { cityId: city.id }],
      },
    });
    categoryId = category?.id;
  }
  if (!categoryId) {
    const fallback = await prisma.category.findFirst({
      where: { isGlobal: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!fallback) throw new Error('No categories exist — cannot create POI');
    categoryId = fallback.id;
  }

  // Extract lat/lng from candidate location
  const location = proposal.candidate?.placeLocation as { lat?: number; lng?: number } | null;
  const lat = location?.lat ?? city.centerLat;
  const lng = location?.lng ?? city.centerLng;

  return prisma.pOI.create({
    data: {
      cityId: city.id,
      slug,
      name,
      shortDescription: proposal.suggestedDesc?.slice(0, 200),
      longDescription: proposal.suggestedDesc,
      latitude: lat,
      longitude: lng,
      categoryId,
      googlePlaceId: proposal.candidate?.resolvedGoogleId ?? undefined,
      status: 'UNDER_REVIEW',
      aiSuggestedAt: new Date(),
    },
  });
}

async function logAutoResearchAudit(params: {
  poiId?: string;
  eventType: string;
  proposalId?: string;
  actorType: string;
  actorId?: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await prisma.autoResearchAuditTrail.create({
      data: {
        poiId: params.poiId,
        eventType: params.eventType,
        proposalId: params.proposalId,
        actorType: params.actorType,
        actorId: params.actorId,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Audit logging should never break main flow
    console.error('Failed to log AutoResearch audit trail:', err);
  }
}
