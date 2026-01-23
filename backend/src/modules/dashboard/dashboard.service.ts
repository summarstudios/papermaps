import { prisma } from "../../lib/prisma.js";
import { ProspectStatus } from "@prisma/client";

// Only count promoted LEADs in dashboard stats (not raw prospects)
const leadFilter = { prospectStatus: ProspectStatus.LEAD };

export const dashboardService = {
  async getStats() {
    const [
      totalLeads,
      totalProspects,
      newLeads,
      wonLeads,
      activeScrapeJobs,
      totalActivities,
    ] = await Promise.all([
      prisma.lead.count({ where: leadFilter }),
      prisma.lead.count({ where: { prospectStatus: ProspectStatus.PROSPECT } }),
      prisma.lead.count({ where: { ...leadFilter, stage: "NEW" } }),
      prisma.lead.count({ where: { ...leadFilter, stage: "WON" } }),
      prisma.scrapeJob.count({ where: { status: "RUNNING" } }),
      prisma.activity.count(),
    ]);

    // Calculate leads this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const leadsThisMonth = await prisma.lead.count({
      where: { ...leadFilter, createdAt: { gte: startOfMonth } },
    });

    // Calculate average score (only for leads)
    const avgScoreResult = await prisma.lead.aggregate({
      where: leadFilter,
      _avg: { score: true },
    });

    return {
      totalLeads,
      totalProspects, // New: count of raw prospects awaiting review
      newLeads,
      wonLeads,
      leadsThisMonth,
      activeScrapeJobs,
      totalActivities,
      averageScore: Math.round(avgScoreResult._avg.score || 0),
    };
  },

  async getPipelineCounts() {
    const stages = [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "PROPOSAL",
      "NEGOTIATION",
      "WON",
      "LOST",
    ] as const;

    const counts = await prisma.lead.groupBy({
      by: ["stage"],
      where: leadFilter,
      _count: { id: true },
    });

    const pipeline = stages.map((stage) => ({
      stage,
      count: counts.find((c) => c.stage === stage)?._count.id || 0,
    }));

    return pipeline;
  },

  async getLeadsByCategory() {
    const categories = await prisma.lead.groupBy({
      by: ["category"],
      where: leadFilter,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return categories.map((c) => ({
      category: c.category,
      count: c._count.id,
    }));
  },

  async getLeadsBySource() {
    const sources = await prisma.lead.groupBy({
      by: ["source"],
      where: leadFilter,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return sources.map((s) => ({
      source: s.source,
      count: s._count.id,
    }));
  },

  async getRecentActivities(limit = 10) {
    return prisma.activity.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        lead: {
          select: { id: true, businessName: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async getLeadsOverTime(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const leads = await prisma.lead.findMany({
      where: { ...leadFilter, createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const grouped = new Map<string, number>();

    // Initialize all dates
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      grouped.set(dateStr, 0);
    }

    // Count leads per day
    leads.forEach((lead) => {
      const dateStr = lead.createdAt.toISOString().split("T")[0];
      grouped.set(dateStr, (grouped.get(dateStr) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  },

  async getTopPerformers(limit = 5) {
    const performers = await prisma.lead.groupBy({
      by: ["assignedToId"],
      where: {
        ...leadFilter,
        stage: "WON",
        assignedToId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    // Get user details
    const userIds = performers
      .map((p) => p.assignedToId)
      .filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    return performers.map((p) => ({
      user: users.find((u) => u.id === p.assignedToId),
      wonCount: p._count.id,
    }));
  },

  async getConversionRates() {
    const [total, contacted, qualified, proposal, won] = await Promise.all([
      prisma.lead.count({ where: leadFilter }),
      prisma.lead.count({
        where: {
          ...leadFilter,
          stage: {
            in: ["CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"],
          },
        },
      }),
      prisma.lead.count({
        where: {
          ...leadFilter,
          stage: { in: ["QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"] },
        },
      }),
      prisma.lead.count({
        where: {
          ...leadFilter,
          stage: { in: ["PROPOSAL", "NEGOTIATION", "WON"] },
        },
      }),
      prisma.lead.count({ where: { ...leadFilter, stage: "WON" } }),
    ]);

    return {
      newToContacted: total > 0 ? Math.round((contacted / total) * 100) : 0,
      contactedToQualified:
        contacted > 0 ? Math.round((qualified / contacted) * 100) : 0,
      qualifiedToProposal:
        qualified > 0 ? Math.round((proposal / qualified) * 100) : 0,
      proposalToWon: proposal > 0 ? Math.round((won / proposal) * 100) : 0,
      overallConversion: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  },
};
