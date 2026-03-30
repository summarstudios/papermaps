import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { pipelineService } from './pipeline.service.js';
import type { PipelineRunResult } from './pipeline.service.js';

// =============================================================================
// Types
// =============================================================================

export interface OrchestratorJob {
  id: string;
  citySlug: string;
  status: 'running' | 'completed' | 'failed';
  triggeredBy: string;
  startedAt: Date;
  completedAt?: Date;
  result?: PipelineRunResult;
  error?: string;
}

// =============================================================================
// In-Memory Job Store
// =============================================================================

const activeJobs = new Map<string, OrchestratorJob>();

// Keep at most 100 completed/failed jobs to prevent unbounded memory growth.
const MAX_RETAINED_JOBS = 100;

function pruneOldJobs(): void {
  if (activeJobs.size <= MAX_RETAINED_JOBS) return;

  // Collect finished jobs sorted oldest-first
  const finishedJobs = [...activeJobs.values()]
    .filter((j) => j.status !== 'running')
    .sort((a, b) => (a.startedAt.getTime()) - (b.startedAt.getTime()));

  const toRemove = activeJobs.size - MAX_RETAINED_JOBS;
  for (let i = 0; i < toRemove && i < finishedJobs.length; i++) {
    activeJobs.delete(finishedJobs[i].id);
  }
}

// =============================================================================
// Orchestrator Service
// =============================================================================

export const orchestratorService = {
  /**
   * Register and execute a pipeline run for a single city.
   * The pipeline runs asynchronously; callers get back the jobId immediately.
   */
  async triggerCityRun(
    citySlug: string,
    triggeredBy: string,
  ): Promise<{ jobId: string }> {
    // Prevent duplicate concurrent runs for the same city
    for (const job of activeJobs.values()) {
      if (job.citySlug === citySlug && job.status === 'running') {
        return { jobId: job.id };
      }
    }

    const jobId = randomUUID();
    const job: OrchestratorJob = {
      id: jobId,
      citySlug,
      status: 'running',
      triggeredBy,
      startedAt: new Date(),
    };

    activeJobs.set(jobId, job);

    // Fire-and-forget: run the pipeline asynchronously
    executePipelineRun(job).catch((err) => {
      console.error(
        `Orchestrator: unhandled error in pipeline run ${jobId}:`,
        err instanceof Error ? err.message : String(err),
      );
    });

    return { jobId };
  },

  /**
   * Get status of a specific job by ID, or all recent jobs if no ID provided.
   */
  async getJobStatus(jobId?: string): Promise<OrchestratorJob | OrchestratorJob[]> {
    if (jobId) {
      const job = activeJobs.get(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      return { ...job };
    }

    // Return all jobs sorted by most recent first
    return [...activeJobs.values()]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .map((j) => ({ ...j }));
  },

  /**
   * The main scheduled pipeline entry point.
   * Runs the pipeline for all active (published) cities sequentially.
   * Intended to be called by a cron job or manual trigger.
   */
  async runScheduledPipeline(): Promise<void> {
    const activeCities = await prisma.city.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (activeCities.length === 0) {
      console.log('Orchestrator: no active cities to process.');
      return;
    }

    console.log(
      `Orchestrator: starting scheduled pipeline for ${activeCities.length} cities.`,
    );

    for (const city of activeCities) {
      try {
        // Check if already running for this city
        const alreadyRunning = [...activeJobs.values()].some(
          (j) => j.citySlug === city.slug && j.status === 'running',
        );

        if (alreadyRunning) {
          console.log(
            `Orchestrator: skipping "${city.slug}" — pipeline already running.`,
          );
          continue;
        }

        const jobId = randomUUID();
        const job: OrchestratorJob = {
          id: jobId,
          citySlug: city.slug,
          status: 'running',
          triggeredBy: 'scheduled',
          startedAt: new Date(),
        };

        activeJobs.set(jobId, job);

        // Run synchronously within the scheduled loop so we don't overwhelm
        // the LLM API with parallel city runs
        await executePipelineRun(job);

        console.log(
          `Orchestrator: completed "${city.slug}" — ` +
          `signals=${job.result?.signals.processed ?? 0}, ` +
          `scored=${job.result?.scoring.scored ?? 0}, ` +
          `proposed=${job.result?.scoring.proposed ?? 0}`,
        );
      } catch (err) {
        console.error(
          `Orchestrator: failed for "${city.slug}":`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    pruneOldJobs();
    console.log('Orchestrator: scheduled pipeline complete.');
  },
};

// =============================================================================
// Internal: Pipeline Execution
// =============================================================================

async function executePipelineRun(job: OrchestratorJob): Promise<void> {
  try {
    const result = await pipelineService.runForCity(job.citySlug);

    job.status = 'completed';
    job.completedAt = new Date();
    job.result = result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    job.status = 'failed';
    job.completedAt = new Date();
    job.error = errorMessage;

    console.error(
      `Orchestrator: pipeline run ${job.id} failed for "${job.citySlug}": ${errorMessage}`,
    );
  }
}
