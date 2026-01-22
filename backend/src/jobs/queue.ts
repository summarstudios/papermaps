import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config.js';
import { scrapeWorker } from './workers/scrape.worker.js';

// Connection configuration for BullMQ
const connectionConfig = config.redisUrl
  ? { url: config.redisUrl }
  : undefined;

// Create the scrape queue
export const scrapeQueue = connectionConfig
  ? new Queue('scrape', {
      connection: connectionConfig as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 60 * 60, // 24 hours
        },
        removeOnFail: {
          count: 50,
        },
      },
    })
  : null;

// Create the worker
export const worker = connectionConfig
  ? new Worker('scrape', scrapeWorker, {
      connection: connectionConfig as any,
      concurrency: 2, // Only 2 concurrent scrape jobs to avoid rate limiting
    })
  : null;

// Worker event handlers
if (worker) {
  worker.on('completed', (job: Job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error: Error) => {
    console.error('Worker error:', error);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  if (worker) await worker.close();
  if (scrapeQueue) await scrapeQueue.close();
});
