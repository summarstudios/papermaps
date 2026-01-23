import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prospectsService } from "./prospects.service.js";

const listQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
  scrapeJobId: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  hasWebsite: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  minScore: z.coerce.number().optional(),
  maxScore: z.coerce.number().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "score", "businessName", "city"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const bulkIdsSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID required"),
  reason: z.string().optional(),
});

export async function prospectsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  // List prospects with filtering and pagination
  fastify.get("/", async (request) => {
    const query = listQuerySchema.parse(request.query);
    return prospectsService.list(query);
  });

  // Get stats
  fastify.get("/stats", async () => {
    return prospectsService.getStats();
  });

  // Get unique cities for filter dropdown
  fastify.get("/cities", async () => {
    return prospectsService.getCities();
  });

  // Get single prospect
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const prospect = await prospectsService.getById(id);
    if (!prospect) {
      return reply.status(404).send({ error: "Prospect not found" });
    }
    return prospect;
  });

  // Promote single prospect to lead
  fastify.post("/:id/promote", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const lead = await prospectsService.promote(id, request.user.userId);
      return lead;
    } catch {
      return reply.status(404).send({ error: "Prospect not found" });
    }
  });

  // Mark single prospect as not interested
  fastify.post("/:id/not-interested", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reason?: string } | undefined;
    try {
      const prospect = await prospectsService.markNotInterested(
        id,
        request.user.userId,
        body?.reason
      );
      return prospect;
    } catch {
      return reply.status(404).send({ error: "Prospect not found" });
    }
  });

  // Archive single prospect (soft delete)
  fastify.post("/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const prospect = await prospectsService.archive(id);
      return prospect;
    } catch {
      return reply.status(404).send({ error: "Prospect not found" });
    }
  });

  // Delete single prospect (hard delete)
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prospectsService.delete(id);
      return { message: "Prospect deleted" };
    } catch {
      return reply.status(404).send({ error: "Prospect not found" });
    }
  });

  // Bulk promote prospects to leads
  fastify.post("/bulk/promote", async (request) => {
    const { ids } = bulkIdsSchema.parse(request.body);
    const result = await prospectsService.bulkPromote(ids, request.user.userId);
    return { count: result.count };
  });

  // Bulk delete prospects
  fastify.post("/bulk/delete", async (request) => {
    const { ids } = bulkIdsSchema.parse(request.body);
    const result = await prospectsService.bulkDelete(ids);
    return { count: result.count };
  });

  // Bulk mark not interested
  fastify.post("/bulk/not-interested", async (request) => {
    const { ids, reason } = bulkIdsSchema.parse(request.body);
    const result = await prospectsService.bulkMarkNotInterested(ids, reason);
    return { count: result.count };
  });
}
