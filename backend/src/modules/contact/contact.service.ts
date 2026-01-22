import { prisma } from '../../lib/prisma.js';
import { ContactStatus } from '@prisma/client';

interface CreateContactData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  service?: string;
  budget?: string;
  message: string;
}

interface UpdateContactData {
  status?: ContactStatus;
  notes?: string;
}

interface ListContactsParams {
  page?: number;
  limit?: number;
  status?: ContactStatus;
}

export const contactService = {
  async list(params: ListContactsParams = {}) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return {
      submissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    return prisma.contactSubmission.findUnique({
      where: { id },
    });
  },

  async create(data: CreateContactData) {
    return prisma.contactSubmission.create({
      data: {
        name: data.name,
        email: data.email,
        company: data.company,
        phone: data.phone,
        service: data.service,
        budget: data.budget,
        message: data.message,
        status: 'NEW',
      },
    });
  },

  async update(id: string, data: UpdateContactData) {
    try {
      return await prisma.contactSubmission.update({
        where: { id },
        data,
      });
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return null;
      }
      throw error;
    }
  },

  async delete(id: string) {
    try {
      await prisma.contactSubmission.delete({ where: { id } });
      return true;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return false;
      }
      throw error;
    }
  },

  async getStats() {
    const [total, newCount, readCount, repliedCount, archivedCount] = await Promise.all([
      prisma.contactSubmission.count(),
      prisma.contactSubmission.count({ where: { status: 'NEW' } }),
      prisma.contactSubmission.count({ where: { status: 'READ' } }),
      prisma.contactSubmission.count({ where: { status: 'REPLIED' } }),
      prisma.contactSubmission.count({ where: { status: 'ARCHIVED' } }),
    ]);

    return {
      total,
      new: newCount,
      read: readCount,
      replied: repliedCount,
      archived: archivedCount,
    };
  },
};
