import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { curatorsService } from './curators.service.js';
import { success, error, ErrorCodes } from '../../lib/response.js';
import { auditService, AuditActions, AuditResources } from '../audit/audit.service.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const updateCuratorSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  baseCity: z.string().max(200).optional(),
  curatorSince: z.string().datetime().optional(),
  isPublicCurator: z.boolean().optional(),
  socialLinks: z
    .object({
      instagram: z.string().max(500).optional(),
      twitter: z.string().max(500).optional(),
      website: z.string().url().max(500).optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Public routes (no auth required)
// ---------------------------------------------------------------------------

export async function curatorsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/curators — list all public curators
  fastify.get('/', async (_request, _reply) => {
    const curators = await curatorsService.listPublicCurators();
    return success(curators);
  });

  // GET /api/v1/curators/:id — get curator profile
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const curator = await curatorsService.getCuratorProfile(id);

    if (!curator) {
      return reply.status(404).send(error(ErrorCodes.NOT_FOUND, 'Curator not found'));
    }

    return success(curator);
  });
}

// ---------------------------------------------------------------------------
// City curator route (registered separately under /api/v1)
// ---------------------------------------------------------------------------

export async function cityCuratorRoutes(fastify: FastifyInstance) {
  // GET /api/v1/cities/:slug/curator — get the curator for a specific city
  fastify.get('/cities/:slug/curator', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const curator = await curatorsService.getCuratorByCitySlug(slug);

    if (!curator) {
      return reply.status(404).send(error(ErrorCodes.NOT_FOUND, 'Curator not found for this city'));
    }

    return success(curator);
  });
}

// ---------------------------------------------------------------------------
// Admin routes (auth required, registered under admin prefix)
// ---------------------------------------------------------------------------

export async function adminCuratorRoutes(fastify: FastifyInstance) {
  // PUT /{adminPrefix}/curators/:id — update curator profile
  fastify.put('/curators/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userRequest = request as any;
    const { id } = request.params as { id: string };

    // Only ADMIN role can update curator profiles
    if (userRequest.user.role !== 'ADMIN') {
      return reply.status(403).send(error(ErrorCodes.FORBIDDEN, 'Admin access required'));
    }

    const data = updateCuratorSchema.parse(request.body);
    const curator = await curatorsService.updateCuratorProfile(id, data);

    if (!curator) {
      return reply.status(404).send(error(ErrorCodes.NOT_FOUND, 'User not found'));
    }

    await auditService.logAction({
      userId: userRequest.user.userId,
      action: AuditActions.USER_UPDATED,
      resource: AuditResources.USER,
      resourceId: id,
      details: { updatedFields: Object.keys(data), context: 'curator_profile' },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return success(curator);
  });
}
