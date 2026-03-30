import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { itineraryGeneratorService } from './itinerary-generator.service.js';
import { success, error, ErrorCodes } from '../../lib/response.js';

// ---------------------------------------------------------------------------
// Rate limiting — per IP + city, max 10 generations per 10-minute window
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(ip: string, citySlug: string): { allowed: boolean; remaining: number } {
  const key = `itingen:${ip}:${citySlug}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  const updated = { ...entry, count: entry.count + 1 };
  rateLimitMap.set(key, updated);
  return { allowed: true, remaining: RATE_LIMIT_MAX - updated.count };
}

// ---------------------------------------------------------------------------
// Zod schema for the request body
// ---------------------------------------------------------------------------

const generateItineraryBodySchema = z.object({
  duration: z.enum(['2-hours', 'half-day', 'full-day', '2-days']),
  interests: z
    .array(z.string().min(1).max(50))
    .min(1, 'Select at least one interest')
    .max(10),
  startTime: z.string().max(20).optional(),
  pace: z.enum(['relaxed', 'moderate', 'packed']).optional(),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function itineraryGeneratorRoutes(fastify: FastifyInstance) {
  // POST /cities/:slug/generate-itinerary — generate a personalized itinerary
  fastify.post('/cities/:slug/generate-itinerary', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    // Rate limiting
    const clientIp = request.ip || 'unknown';
    const { allowed, remaining } = checkRateLimit(clientIp, slug);

    reply.header('X-RateLimit-Limit', RATE_LIMIT_MAX);
    reply.header('X-RateLimit-Remaining', remaining);

    if (!allowed) {
      return reply.status(429).send(
        error(
          ErrorCodes.RATE_LIMITED,
          'Too many itinerary generations. Please try again in a few minutes.',
        ),
      );
    }

    // Validate body
    const parseResult = generateItineraryBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        error(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid request body',
          {
            details: parseResult.error.issues.map((i) => i.message).join('; '),
          },
        ),
      );
    }

    const { duration, interests, startTime, pace } = parseResult.data;

    try {
      const itinerary = await itineraryGeneratorService.generateItinerary({
        citySlug: slug,
        duration,
        interests,
        startTime,
        pace,
      });

      return success(itinerary);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'CITY_NOT_FOUND') {
          return reply.status(404).send(error(ErrorCodes.NOT_FOUND, 'City not found'));
        }
        if (err.message === 'NOT_ENOUGH_POIS') {
          return reply.status(400).send(
            error(
              ErrorCodes.VALIDATION_ERROR,
              'This city does not have enough curated places yet to generate an itinerary.',
            ),
          );
        }
        if (err.message === 'AI_GENERATED_INVALID_ITINERARY') {
          return reply.status(500).send(
            error(
              ErrorCodes.INTERNAL_ERROR,
              'Could not generate a valid itinerary. Please try again.',
            ),
          );
        }
        if (err.message === 'ANTHROPIC_API_KEY is not configured') {
          fastify.log.error('Itinerary generator: ANTHROPIC_API_KEY is not configured');
          return reply.status(503).send(
            error(
              ErrorCodes.INTERNAL_ERROR,
              'Itinerary generation is temporarily unavailable.',
            ),
          );
        }
        if (err.message.startsWith('Failed to parse AI response')) {
          fastify.log.error(err, 'Itinerary generator: failed to parse AI response');
          return reply.status(500).send(
            error(
              ErrorCodes.INTERNAL_ERROR,
              'Could not generate a valid itinerary. Please try again.',
            ),
          );
        }
      }

      fastify.log.error(err, 'Itinerary generator: unexpected error');
      return reply.status(500).send(
        error(ErrorCodes.INTERNAL_ERROR, 'Something went wrong. Please try again.'),
      );
    }
  });
}
