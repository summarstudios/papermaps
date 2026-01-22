import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { contactService } from './contact.service.js';

const createContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  service: z.string().max(100).optional(),
  budget: z.string().max(50).optional(),
  message: z.string().min(1).max(5000),
});

const updateContactSchema = z.object({
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
  notes: z.string().max(2000).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
});

export async function contactRoutes(fastify: FastifyInstance) {
  // Public endpoint - no auth required for form submissions
  fastify.post('/submit', async (request, reply) => {
    const data = createContactSchema.parse(request.body);
    const submission = await contactService.create({
      name: data.name,
      email: data.email,
      message: data.message,
      company: data.company,
      phone: data.phone,
      service: data.service,
      budget: data.budget,
    });

    return reply.status(201).send({
      success: true,
      message: "Thank you for your message. We'll be in touch soon!",
      id: submission.id,
    });
  });

  // Protected routes below - require authentication
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', fastify.authenticate);

    // List all contact submissions
    protectedRoutes.get('/', async (request, reply) => {
      const query = listQuerySchema.parse(request.query);
      const result = await contactService.list(query);
      return result;
    });

    // Get stats
    protectedRoutes.get('/stats', async (request, reply) => {
      const stats = await contactService.getStats();
      return stats;
    });

    // Get single submission
    protectedRoutes.get('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const submission = await contactService.getById(id);

      if (!submission) {
        return reply.status(404).send({ error: 'Submission not found' });
      }

      return submission;
    });

    // Update submission (status, notes)
    protectedRoutes.patch('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = updateContactSchema.parse(request.body);

      const submission = await contactService.update(id, data);

      if (!submission) {
        return reply.status(404).send({ error: 'Submission not found' });
      }

      return submission;
    });

    // Delete submission
    protectedRoutes.delete('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };

      const deleted = await contactService.delete(id);

      if (!deleted) {
        return reply.status(404).send({ error: 'Submission not found' });
      }

      return { message: 'Submission deleted successfully' };
    });
  });
}
