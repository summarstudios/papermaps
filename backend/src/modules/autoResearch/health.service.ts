import { prisma } from '../../lib/prisma.js';

// ============================================================================
// Types
// ============================================================================

export interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastRunAt: Date | null;
  signalsLast24h: number;
  candidatesLast24h: number;
  proposalsPending: number;
  alertCount: number;
}

export interface SignalStats {
  bySource: Record<string, number>;
  byCity: Record<string, number>;
  byDay: Array<{ date: string; count: number }>;
  total: number;
}

export interface ProposalStats {
  pending: number;
  approved: number;
  rejected: number;
  deferred: number;
  byCity: Record<string, { pending: number; approved: number; rejected: number }>;
  averageScore: number;
  approvalRate: number;
}

export interface Alert {
  type: 'scraper_failure' | 'proposal_backlog' | 'city_stale' | 'low_signal_volume';
  severity: 'warning' | 'critical';
  message: string;
  citySlug?: string;
  details: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

/** Known scraper sources and their expected run interval in hours. */
const SOURCE_SCHEDULES: Record<string, number> = {
  google_reviews: 48,
  instagram_geotag: 24,
  travel_blog: 72,
  zomato: 48,
  reddit: 24,
  local_news: 72,
};

/** How many consecutive missed runs before we alert. */
const MISSED_RUNS_THRESHOLD = 3;

/** Maximum pending proposals before we fire a backlog alert. */
const PROPOSAL_BACKLOG_THRESHOLD = 100;

/** Days without a pipeline run for a published city before we alert. */
const CITY_STALE_DAYS = 7;

/** Minimum signals in 24h before we flag low volume. */
const LOW_SIGNAL_VOLUME_THRESHOLD = 10;

// ============================================================================
// Helpers
// ============================================================================

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ============================================================================
// Service
// ============================================================================

export const autoResearchHealthService = {
  /**
   * Get overall pipeline health. Designed to be fast (< 100ms) for
   * use in health-check endpoints.
   */
  async getHealth(): Promise<PipelineHealth> {
    const now24hAgo = hoursAgo(24);

    const [
      lastSignal,
      signalsLast24h,
      candidatesLast24h,
      proposalsPending,
    ] = await Promise.all([
      // Most recent signal as a proxy for "last pipeline activity"
      prisma.autoResearchSignal.findFirst({
        orderBy: { scrapedAt: 'desc' },
        select: { scrapedAt: true },
      }),
      prisma.autoResearchSignal.count({
        where: { scrapedAt: { gte: now24hAgo } },
      }),
      prisma.autoResearchCandidate.count({
        where: { createdAt: { gte: now24hAgo } },
      }),
      prisma.autoResearchProposal.count({
        where: { status: 'pending' },
      }),
    ]);

    const lastRunAt = lastSignal?.scrapedAt ?? null;
    const alerts = await autoResearchHealthService.checkAlerts();
    const alertCount = alerts.length;

    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

    let status: PipelineHealth['status'] = 'healthy';
    if (criticalAlerts > 0) {
      status = 'unhealthy';
    } else if (alertCount > 0) {
      status = 'degraded';
    }

    return {
      status,
      lastRunAt,
      signalsLast24h,
      candidatesLast24h,
      proposalsPending,
      alertCount,
    };
  },

  /**
   * Get signal volume stats broken down by source, city, and day.
   */
  async getSignalStats(days = 30): Promise<SignalStats> {
    const since = daysAgo(days);

    const [bySourceRows, byCityRows, byDayRows, total] = await Promise.all([
      prisma.autoResearchSignal.groupBy({
        by: ['source'],
        where: { scrapedAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.autoResearchSignal.groupBy({
        by: ['citySlug'],
        where: { scrapedAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE("scraped_at") AS date, COUNT(*)::bigint AS count
        FROM auto_research_signals
        WHERE "scraped_at" >= ${since}
        GROUP BY DATE("scraped_at")
        ORDER BY date DESC
      `,
      prisma.autoResearchSignal.count({
        where: { scrapedAt: { gte: since } },
      }),
    ]);

    const bySource: Record<string, number> = {};
    for (const row of bySourceRows) {
      bySource[row.source] = row._count.id;
    }

    const byCity: Record<string, number> = {};
    for (const row of byCityRows) {
      byCity[row.citySlug] = row._count.id;
    }

    const byDay = byDayRows.map((row) => ({
      date: String(row.date),
      count: Number(row.count),
    }));

    return { bySource, byCity, byDay, total };
  },

  /**
   * Get proposal review stats with per-city breakdown.
   */
  async getProposalStats(): Promise<ProposalStats> {
    const [statusCounts, byCityStatusRows, scoreAggregate] = await Promise.all([
      prisma.autoResearchProposal.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.autoResearchProposal.groupBy({
        by: ['citySlug', 'status'],
        _count: { id: true },
      }),
      prisma.autoResearchProposal.aggregate({
        _avg: { llmScore: true },
      }),
    ]);

    // Parse top-level status counts
    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) {
      statusMap[row.status] = row._count.id;
    }

    const pending = statusMap['pending'] ?? 0;
    const approved = statusMap['approved'] ?? 0;
    const rejected = statusMap['rejected'] ?? 0;
    const deferred = statusMap['deferred'] ?? 0;

    // Build per-city breakdown
    const byCity: Record<string, { pending: number; approved: number; rejected: number }> = {};
    for (const row of byCityStatusRows) {
      if (!byCity[row.citySlug]) {
        byCity[row.citySlug] = { pending: 0, approved: 0, rejected: 0 };
      }
      const status = row.status as string;
      if (status === 'pending' || status === 'approved' || status === 'rejected') {
        byCity[row.citySlug][status] = row._count.id;
      }
    }

    const averageScore = scoreAggregate._avg.llmScore ?? 0;
    const totalDecided = approved + rejected;
    const approvalRate = totalDecided > 0 ? approved / totalDecided : 0;

    return {
      pending,
      approved,
      rejected,
      deferred,
      byCity,
      averageScore,
      approvalRate,
    };
  },

  /**
   * Check for alert conditions across the pipeline. Returns an array of
   * active alerts sorted by severity (critical first).
   */
  async checkAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const [
      scraperAlerts,
      backlogAlert,
      staleAlerts,
      volumeAlert,
    ] = await Promise.all([
      checkScraperFailures(),
      checkProposalBacklog(),
      checkStaleCities(),
      checkLowSignalVolume(),
    ]);

    alerts.push(...scraperAlerts, ...backlogAlert, ...staleAlerts, ...volumeAlert);

    // Sort: critical first, then warning
    alerts.sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === 'critical' ? -1 : 1;
    });

    return alerts;
  },
};

// ============================================================================
// Alert Check Helpers
// ============================================================================

/**
 * Check if any known scraper source has gone silent for longer than
 * MISSED_RUNS_THRESHOLD consecutive expected intervals.
 */
async function checkScraperFailures(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Get the most recent signal per source
  const latestBySource = await prisma.autoResearchSignal.groupBy({
    by: ['source'],
    _max: { scrapedAt: true },
  });

  const latestMap: Record<string, Date | null> = {};
  for (const row of latestBySource) {
    latestMap[row.source] = row._max.scrapedAt;
  }

  const now = Date.now();

  for (const [source, intervalHours] of Object.entries(SOURCE_SCHEDULES)) {
    const lastSeen = latestMap[source];
    const maxSilenceHours = intervalHours * MISSED_RUNS_THRESHOLD;

    if (!lastSeen) {
      // Source has never produced a signal -- only alert if we have *any*
      // signals at all (i.e., the system has been running)
      const anySignals = await prisma.autoResearchSignal.count({ take: 1 });
      if (anySignals > 0) {
        alerts.push({
          type: 'scraper_failure',
          severity: 'critical',
          message: `Source "${source}" has never produced any signals`,
          details: { source, expectedIntervalHours: intervalHours },
        });
      }
      continue;
    }

    const silenceHours = (now - lastSeen.getTime()) / (1000 * 60 * 60);
    if (silenceHours >= maxSilenceHours) {
      alerts.push({
        type: 'scraper_failure',
        severity: 'critical',
        message: `Source "${source}" has been silent for ${Math.round(silenceHours)}h (expected every ${intervalHours}h, threshold ${maxSilenceHours}h)`,
        details: {
          source,
          lastSeenAt: lastSeen.toISOString(),
          silenceHours: Math.round(silenceHours),
          expectedIntervalHours: intervalHours,
          missedRuns: Math.floor(silenceHours / intervalHours),
        },
      });
    }
  }

  return alerts;
}

/**
 * Check if pending proposals exceed the backlog threshold.
 */
async function checkProposalBacklog(): Promise<Alert[]> {
  const pendingCount = await prisma.autoResearchProposal.count({
    where: { status: 'pending' },
  });

  if (pendingCount > PROPOSAL_BACKLOG_THRESHOLD) {
    return [{
      type: 'proposal_backlog',
      severity: 'warning',
      message: `${pendingCount} proposals pending review (threshold: ${PROPOSAL_BACKLOG_THRESHOLD})`,
      details: {
        pendingCount,
        threshold: PROPOSAL_BACKLOG_THRESHOLD,
      },
    }];
  }

  return [];
}

/**
 * Check if any published city has not had a signal scraped in CITY_STALE_DAYS.
 */
async function checkStaleCities(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const staleThreshold = daysAgo(CITY_STALE_DAYS);

  // Get all published cities
  const publishedCities = await prisma.city.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, name: true },
  });

  if (publishedCities.length === 0) return [];

  // Get the latest signal per city
  const latestByCityRows = await prisma.autoResearchSignal.groupBy({
    by: ['citySlug'],
    _max: { scrapedAt: true },
  });

  const latestByCity: Record<string, Date | null> = {};
  for (const row of latestByCityRows) {
    latestByCity[row.citySlug] = row._max.scrapedAt;
  }

  for (const city of publishedCities) {
    const lastSignalAt = latestByCity[city.slug];

    if (!lastSignalAt || lastSignalAt < staleThreshold) {
      alerts.push({
        type: 'city_stale',
        severity: 'warning',
        message: `City "${city.name}" (${city.slug}) has had no pipeline activity for ${CITY_STALE_DAYS}+ days`,
        citySlug: city.slug,
        details: {
          citySlug: city.slug,
          cityName: city.name,
          lastSignalAt: lastSignalAt?.toISOString() ?? null,
          staleDays: CITY_STALE_DAYS,
        },
      });
    }
  }

  return alerts;
}

/**
 * Check if total signal volume in the last 24h is below the low threshold.
 */
async function checkLowSignalVolume(): Promise<Alert[]> {
  const since = hoursAgo(24);

  const count = await prisma.autoResearchSignal.count({
    where: { scrapedAt: { gte: since } },
  });

  if (count < LOW_SIGNAL_VOLUME_THRESHOLD) {
    return [{
      type: 'low_signal_volume',
      severity: 'warning',
      message: `Only ${count} signal(s) received in the last 24h (threshold: ${LOW_SIGNAL_VOLUME_THRESHOLD})`,
      details: {
        signalCount: count,
        threshold: LOW_SIGNAL_VOLUME_THRESHOLD,
        periodHours: 24,
      },
    }];
  }

  return [];
}
