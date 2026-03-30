import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autoResearchService } from './autoResearch.service.js';
import { success, paginated, error, ErrorCodes } from '../../lib/response.js';
import { auditService, AuditActions, AuditResources } from '../audit/audit.service.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listProposalsQuerySchema = paginationSchema.extend({
  citySlug: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'deferred']).optional(),
  proposalType: z.enum(['add_poi', 'remove_poi', 'update_poi', 'new_city', 'flag_review']).optional(),
  minScore: z.coerce.number().min(0).max(10).optional(),
});

const approveBodySchema = z.object({
  reviewNote: z.string().max(2000).optional(),
});

const rejectBodySchema = z.object({
  reviewNote: z.string().min(1, 'Review note is required when rejecting').max(2000),
});

const deferBodySchema = z.object({
  reviewNote: z.string().max(2000).optional(),
});

const listSignalsQuerySchema = paginationSchema.extend({
  source: z.string().optional(),
  citySlug: z.string().optional(),
  status: z.enum(['pending', 'aggregated', 'filtered', 'rejected']).optional(),
});

const triggerJobBodySchema = z.object({
  citySlug: z.string().min(1),
});

const feedbackEventBodySchema = z.object({
  poiId: z.string().min(1),
  citySlug: z.string().min(1),
  eventType: z.enum([
    'poi_click',
    'poi_save',
    'poi_share',
    'poi_directions',
    'poi_deepdive',
    'collection_save',
    'itinerary_add',
  ]),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Admin Routes (require authentication)
// ============================================================================

export async function autoResearchRoutes(fastify: FastifyInstance) {
  // All admin auto-research routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // --------------------------------------------------------------------------
  // Proposals
  // --------------------------------------------------------------------------

  // GET /proposals — list proposals
  fastify.get('/proposals', async (request, reply) => {
    try {
      const query = listProposalsQuerySchema.parse(request.query);

      const result = await autoResearchService.listProposals({
        citySlug: query.citySlug,
        status: query.status,
        proposalType: query.proposalType,
        minScore: query.minScore,
        page: query.page,
        limit: query.limit,
      });

      return paginated(result.data, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters'));
      }
      throw err;
    }
  });

  // GET /proposals/:id — get proposal detail with candidate + signals
  fastify.get('/proposals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const proposal = await autoResearchService.getProposalById(id);

    if (!proposal) {
      return reply.status(404).send(error(ErrorCodes.NOT_FOUND, 'Proposal not found'));
    }

    return success(proposal);
  });

  // POST /proposals/:id/approve — approve a proposal
  fastify.post('/proposals/:id/approve', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = approveBodySchema.parse(request.body);
      const user = (request as any).user;

      const updated = await autoResearchService.approveProposal(id, {
        reviewedById: user.userId,
        reviewNote: body.reviewNote,
      });

      if (!updated) {
        return reply.status(404).send(error(ErrorCodes.NOT_FOUND, 'Proposal not found'));
      }

      // Also log to the main audit system
      await auditService.logAction({
        userId: user.userId,
        action: AuditActions.ADMIN_ACTION,
        resource: AuditResources.POI,
        resourceId: updated.resultingPoiId ?? id,
        details: {
          subAction: 'auto_research_proposal_approved',
          proposalId: id,
          proposalType: updated.proposalType,
          resultingPoiId: updated.resultingPoiId,
        },
      });

      return success(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, 'Invalid request body'));
      }
      if (err instanceof Error && err.message.startsWith('Proposal is already')) {
        return reply.status(409).send(error(ErrorCodes.CONFLICT, err.message));
      }
      if (err instanceof Error && err.message.includes('City not found')) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, err.message));
      }
      if (err instanceof Error && err.message.includes('No categories exist')) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, err.message));
      }
      throw err;
    }
  });

  // POST /proposals/:id/reject — reject a proposal (requires reviewNote)
  fastify.post('/proposals/:id/reject', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = rejectBodySchema.parse(request.body);
      const user = (request as any).user;

      const updated = await autoResearchService.rejectProposal(id, {
        reviewedById: user.userId,
        reviewNote: body.reviewNote,
      });

      if (!updated) {
        return reply.status(404).send(error(ErrorCodes.NOT_FOUND, 'Proposal not found'));
      }

      await auditService.logAction({
        userId: user.userId,
        action: AuditActions.ADMIN_ACTION,
        resource: AuditResources.POI,
        resourceId: updated.existingPoiId ?? id,
        details: {
          subAction: 'auto_research_proposal_rejected',
          proposalId: id,
          proposalType: updated.proposalType,
          reviewNote: body.reviewNote,
        },
      });

      return success(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, 'Review note is required when rejecting'));
      }
      if (err instanceof Error && err.message.startsWith('Proposal is already')) {
        return reply.status(409).send(error(ErrorCodes.CONFLICT, err.message));
      }
      throw err;
    }
  });

  // POST /proposals/:id/defer — defer a proposal for later review
  fastify.post('/proposals/:id/defer', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = deferBodySchema.parse(request.body ?? {});
      const user = (request as any).user;

      const updated = await autoResearchService.deferProposal(id, {
        reviewedById: user.userId,
        reviewNote: body.reviewNote,
      });

      if (!updated) {
        return reply.status(404).send(error(ErrorCodes.NOT_FOUND, 'Proposal not found'));
      }

      await auditService.logAction({
        userId: user.userId,
        action: AuditActions.ADMIN_ACTION,
        resource: AuditResources.POI,
        resourceId: updated.existingPoiId ?? id,
        details: {
          subAction: 'auto_research_proposal_deferred',
          proposalId: id,
          proposalType: updated.proposalType,
        },
      });

      return success(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, 'Invalid request body'));
      }
      if (err instanceof Error && err.message.startsWith('Proposal is already')) {
        return reply.status(409).send(error(ErrorCodes.CONFLICT, err.message));
      }
      throw err;
    }
  });

  // --------------------------------------------------------------------------
  // Signals
  // --------------------------------------------------------------------------

  // GET /signals — browse raw signals
  fastify.get('/signals', async (request, reply) => {
    try {
      const query = listSignalsQuerySchema.parse(request.query);

      const result = await autoResearchService.listSignals({
        source: query.source,
        citySlug: query.citySlug,
        status: query.status,
        page: query.page,
        limit: query.limit,
      });

      return paginated(result.data, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters'));
      }
      throw err;
    }
  });

  // GET /signals/stats — signal volume stats
  fastify.get('/signals/stats', async (_request, _reply) => {
    const stats = await autoResearchService.getSignalStats();
    return success(stats);
  });

  // --------------------------------------------------------------------------
  // Jobs
  // --------------------------------------------------------------------------

  // GET /jobs — list AutoResearch job runs
  fastify.get('/jobs', async (request, reply) => {
    try {
      const query = paginationSchema.parse(request.query);

      const result = await autoResearchService.listJobs({
        page: query.page,
        limit: query.limit,
      });

      return paginated(result.data, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters'));
      }
      throw err;
    }
  });

  // POST /jobs/trigger — manually trigger a run for a city
  fastify.post('/jobs/trigger', async (request, reply) => {
    try {
      const body = triggerJobBodySchema.parse(request.body);
      const user = (request as any).user;

      const result = await autoResearchService.triggerJob({
        citySlug: body.citySlug,
        userId: user.userId,
      });

      if (!result) {
        return reply.status(404).send(error(ErrorCodes.NOT_FOUND, `City not found: ${body.citySlug}`));
      }

      await auditService.logAction({
        userId: user.userId,
        action: AuditActions.ADMIN_ACTION,
        resource: 'auto_research_job',
        resourceId: result.jobId,
        details: { citySlug: body.citySlug, triggeredManually: true },
      });

      // TODO: Enqueue actual AutoResearch pipeline job here
      // For now, return confirmation that the job was recorded
      return reply.status(202).send(success({
        jobId: result.jobId,
        citySlug: result.citySlug,
        status: 'queued',
        message: 'AutoResearch job has been queued for processing',
      }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, 'Invalid request body'));
      }
      throw err;
    }
  });

  // --------------------------------------------------------------------------
  // City Readiness
  // --------------------------------------------------------------------------

  // GET /city-readiness — all watched cities with readiness scores
  fastify.get('/city-readiness', async (_request, _reply) => {
    const scores = await autoResearchService.getCityReadiness();
    return success(scores);
  });
}

// ============================================================================
// Public Feedback Routes (no auth, rate-limited)
// ============================================================================

export async function feedbackRoutes(fastify: FastifyInstance) {
  // POST /events — record user engagement event
  fastify.post('/events', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
        keyGenerator: (request: any) => {
          return request.ip;
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = feedbackEventBodySchema.parse(request.body);

      const event = await autoResearchService.recordFeedbackEvent({
        poiId: body.poiId,
        citySlug: body.citySlug,
        eventType: body.eventType,
        sessionId: body.sessionId,
        metadata: body.metadata,
      });

      return reply.status(201).send(success({ id: event.id }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send(error(ErrorCodes.VALIDATION_ERROR, 'Invalid event data'));
      }
      throw err;
    }
  });
}
