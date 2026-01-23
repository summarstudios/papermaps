/**
 * API Call Logger
 *
 * Tracks all external API calls for cost monitoring and debugging.
 * Logs to both console and database.
 */

import { prisma } from "./prisma.js";

export type ApiProvider =
  | "GOOGLE_PLACES"
  | "PERPLEXITY"
  | "GOOGLE_MAPS"
  | "LIGHTHOUSE";

export interface ApiCallLog {
  provider: ApiProvider;
  endpoint: string;
  method: "GET" | "POST";
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
  scrapeJobId?: string;
}

// Cost per API call (approximate)
const API_COSTS: Record<ApiProvider, number> = {
  GOOGLE_PLACES: 0.032, // Text Search $0.032 per call
  PERPLEXITY: 0.005, // ~$0.005 per call (estimate)
  GOOGLE_MAPS: 0, // Free (Playwright scraping)
  LIGHTHOUSE: 0, // Free (local CLI)
};

// In-memory buffer for batch inserts
const logBuffer: ApiCallLog[] = [];
let flushTimer: NodeJS.Timeout | null = null;

/**
 * Log an API call
 */
export async function logApiCall(log: ApiCallLog): Promise<void> {
  // Only count cost for successful calls
  const cost = log.success ? API_COSTS[log.provider] || 0 : 0;

  // Console log for immediate visibility
  const emoji = log.success ? "✓" : "✗";
  const costStr = cost > 0 ? ` ($${cost.toFixed(4)})` : "";
  console.log(
    `[API ${emoji}] ${log.provider} ${log.method} ${log.endpoint} - ${log.statusCode} (${log.responseTimeMs}ms)${costStr}`,
  );

  if (!log.success && log.error) {
    console.error(`[API ERROR] ${log.provider}: ${log.error}`);
  }

  // Add to buffer
  logBuffer.push(log);

  // Schedule flush
  if (!flushTimer) {
    flushTimer = setTimeout(flushLogs, 5000); // Flush every 5 seconds
  }
}

/**
 * Flush logs to database
 */
async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0) {
    flushTimer = null;
    return;
  }

  const logsToInsert = [...logBuffer];
  logBuffer.length = 0;
  flushTimer = null;

  try {
    await prisma.apiCallLog.createMany({
      data: logsToInsert.map((log) => ({
        provider: log.provider,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        responseTimeMs: log.responseTimeMs,
        success: log.success,
        error: log.error,
        metadata: log.metadata ? JSON.stringify(log.metadata) : null,
        scrapeJobId: log.scrapeJobId,
        // Only count cost for successful calls - failed calls aren't charged
        estimatedCost: log.success ? API_COSTS[log.provider] || 0 : 0,
      })),
    });
  } catch (error) {
    console.error("[API Logger] Failed to flush logs to database:", error);
    // Put logs back in buffer to retry
    logBuffer.push(...logsToInsert);
  }
}

/**
 * Force flush logs (call before shutdown)
 */
export async function forceFlushLogs(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushLogs();
}

/**
 * Get API call statistics
 */
export async function getApiStats(options?: {
  startDate?: Date;
  endDate?: Date;
  provider?: ApiProvider;
  scrapeJobId?: string;
}): Promise<{
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalCost: number;
  byProvider: Record<string, { calls: number; cost: number; errors: number }>;
}> {
  const where: Record<string, unknown> = {};

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = options.startDate;
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = options.endDate;
    }
  }

  if (options?.provider) {
    where.provider = options.provider;
  }

  if (options?.scrapeJobId) {
    where.scrapeJobId = options.scrapeJobId;
  }

  const logs = await prisma.apiCallLog.findMany({ where });

  const stats = {
    totalCalls: logs.length,
    successfulCalls: logs.filter((l) => l.success).length,
    failedCalls: logs.filter((l) => !l.success).length,
    totalCost: logs.reduce((sum, l) => sum + (l.estimatedCost || 0), 0),
    byProvider: {} as Record<
      string,
      { calls: number; cost: number; errors: number }
    >,
  };

  for (const log of logs) {
    if (!stats.byProvider[log.provider]) {
      stats.byProvider[log.provider] = { calls: 0, cost: 0, errors: 0 };
    }
    stats.byProvider[log.provider].calls++;
    stats.byProvider[log.provider].cost += log.estimatedCost || 0;
    if (!log.success) {
      stats.byProvider[log.provider].errors++;
    }
  }

  return stats;
}

/**
 * Get recent API calls
 */
export async function getRecentApiCalls(limit: number = 100): Promise<
  {
    id: string;
    provider: string;
    endpoint: string;
    statusCode: number;
    responseTimeMs: number;
    success: boolean;
    error: string | null;
    estimatedCost: number | null;
    createdAt: Date;
    scrapeJobId: string | null;
  }[]
> {
  return prisma.apiCallLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Wrapper to measure and log API calls
 */
export async function withApiLogging<T>(
  provider: ApiProvider,
  endpoint: string,
  method: "GET" | "POST",
  scrapeJobId: string | undefined,
  apiCall: () => Promise<{ response: Response; data: T }>,
): Promise<T> {
  const startTime = Date.now();

  try {
    const { response, data } = await apiCall();
    const responseTimeMs = Date.now() - startTime;

    await logApiCall({
      provider,
      endpoint,
      method,
      statusCode: response.status,
      responseTimeMs,
      success: response.ok,
      scrapeJobId,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    });

    return data;
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    await logApiCall({
      provider,
      endpoint,
      method,
      statusCode: 0,
      responseTimeMs,
      success: false,
      scrapeJobId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}
