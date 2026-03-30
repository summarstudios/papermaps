import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { suggestionsService } from './suggestions.service.js';
import { success, error, ErrorCodes } from '../../lib/response.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const suggestPOISchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  categorySlug: z.string().optional(),
  whyYouLoveIt: z
    .string()
    .min(10, 'Please tell us a bit more about why you love this place')
    .max(1000),
  suggestedByName: z.string().max(100).optional(),
  suggestedByEmail: z.string().email().max(255).optional(),
});

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: 5 suggestions per IP per hour
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  rateLimitMap.set(ip, { ...entry, count: entry.count + 1 });
  return true;
}

// Periodically clean up expired entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function suggestionsRoutes(fastify: FastifyInstance) {
  // POST /cities/:slug/suggest — anonymous community suggestion
  fastify.post('/cities/:slug/suggest', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const ip = request.ip || 'unknown';

    // Rate limit check
    if (!checkRateLimit(ip)) {
      return reply
        .status(429)
        .send(
          error(
            ErrorCodes.RATE_LIMITED,
            'Too many suggestions. Please try again later.',
          ),
        );
    }

    try {
      const body = suggestPOISchema.parse(request.body);

      const result = await suggestionsService.suggestPOI({
        citySlug: slug,
        name: body.name,
        latitude: body.latitude,
        longitude: body.longitude,
        categorySlug: body.categorySlug,
        whyYouLoveIt: body.whyYouLoveIt,
        suggestedByName: body.suggestedByName,
        suggestedByEmail: body.suggestedByEmail,
      });

      if ('error' in result) {
        switch (result.error) {
          case 'CITY_NOT_FOUND':
            return reply
              .status(404)
              .send(error(ErrorCodes.NOT_FOUND, 'City not found'));
          case 'CITY_NOT_PUBLISHED':
            return reply
              .status(400)
              .send(
                error(
                  ErrorCodes.VALIDATION_ERROR,
                  'This city is not accepting suggestions yet',
                ),
              );
          case 'CATEGORY_NOT_FOUND':
            return reply
              .status(400)
              .send(
                error(ErrorCodes.VALIDATION_ERROR, 'Invalid category'),
              );
          case 'DUPLICATE_POI':
            return reply
              .status(409)
              .send(
                error(
                  ErrorCodes.CONFLICT,
                  `A similar place "${result.existingName}" already exists nearby`,
                ),
              );
          default:
            return reply
              .status(500)
              .send(error(ErrorCodes.INTERNAL_ERROR, 'Something went wrong'));
        }
      }

      return reply.status(201).send(success(result.data));
    } catch (err) {
      if (err instanceof z.ZodError) {
        const firstIssue = err.issues[0];
        return reply
          .status(400)
          .send(
            error(
              ErrorCodes.VALIDATION_ERROR,
              firstIssue?.message || 'Invalid request body',
            ),
          );
      }
      throw err;
    }
  });
}
