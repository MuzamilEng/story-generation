import IORedis from 'ioredis';
import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import { assembleStoryAudio } from './assemble';
import { prisma } from './prisma';

const QUEUE_NAME = 'assemble-audio';
const ASSEMBLE_WORKER_CONCURRENCY = Math.max(
  1,
  Number(process.env.ASSEMBLE_WORKER_CONCURRENCY ?? 2) || 2
);
const ASSEMBLE_JOB_ATTEMPTS = Math.max(1, Number(process.env.ASSEMBLE_JOB_ATTEMPTS ?? 3) || 3);
const ASSEMBLE_JOB_BACKOFF_MS = Math.max(
  250,
  Number(process.env.ASSEMBLE_JOB_BACKOFF_MS ?? 5000) || 5000
);

export interface AssembleJobData {
  storyId: string;
  userId: string;
}

function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

const queueConnection = createRedisConnection();
const workerConnection = createRedisConnection();
const eventsConnection = createRedisConnection();

export const assembleQueue = new Queue<AssembleJobData>(QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: ASSEMBLE_JOB_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: ASSEMBLE_JOB_BACKOFF_MS,
    },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600, count: 1000 },
  },
});

export const assembleQueueEvents = new QueueEvents(QUEUE_NAME, {
  connection: eventsConnection,
});

function storyJobId(storyId: string) {
  // BullMQ custom job ids cannot include ':'
  return `assemble_${storyId}`;
}

let workerInitialized = false;
let assembleWorker: Worker<AssembleJobData> | null = null;

export function initAssembleWorker() {
  if (workerInitialized) return;
  workerInitialized = true;

  const worker = new Worker<AssembleJobData>(
    QUEUE_NAME,
    async (job) => {
      const attemptNum = job.attemptsMade + 1;
      const maxAttempts = ASSEMBLE_JOB_ATTEMPTS;
      console.log(`[queue] Processing job ${job.id} (attempt ${attemptNum}/${maxAttempts}) for story=${job.data.storyId}`);
      await job.updateProgress({ stage: 'started', message: `Audio job started (attempt ${attemptNum}/${maxAttempts})` });
      try {
        const result = await assembleStoryAudio(job.data.storyId, job.data.userId);
        await job.updateProgress({ stage: 'completed', message: 'Audio is ready' });
        return result;
      } catch (err: any) {
        console.error(`[queue] Job ${job.id} attempt ${attemptNum}/${maxAttempts} failed:`, err.message);
        // Update story status to reflect failure if this is the last attempt
        if (attemptNum >= maxAttempts) {
          try {
            await prisma.story.update({
              where: { id: job.data.storyId },
              data: { status: 'draft' },
            });
            console.log(`[queue] Story ${job.data.storyId} status reset to draft after all retries exhausted`);
          } catch (dbErr) {
            console.error('[queue] Failed to reset story status:', dbErr);
          }
        }
        throw err;
      }
    },
    {
      connection: workerConnection,
      concurrency: ASSEMBLE_WORKER_CONCURRENCY,
      lockDuration: 300000,     // 5 min lock — long enough for full assembly
      stalledInterval: 120000,  // Check for stalled jobs every 2 min
      maxStalledCount: 2,       // Allow 1 stall recovery before failing
    }
  );

  assembleWorker = worker;

  worker.on('completed', (job) => {
    console.log(`[queue] Completed ${job.id} for story=${job.data.storyId}`);
  });

  worker.on('failed', (job, err) => {
    const attempts = job ? `${job.attemptsMade}/${ASSEMBLE_JOB_ATTEMPTS}` : '?';
    const isFinal = job ? job.attemptsMade >= ASSEMBLE_JOB_ATTEMPTS : false;
    console.error(`[queue] Failed ${job?.id} (${attempts} attempts):`, err.message);
    // Log permanent failures to DB for admin visibility
    if (isFinal && job) {
      logJobFailure(job.data.storyId, job.data.userId, err.message).catch(() => {});
    }
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[queue] Stalled job detected: ${jobId} — worker will retry`);
  });

  worker.on('error', (err) => {
    console.error('[queue] Worker error:', err.message);
  });

  assembleQueueEvents.on('error', (err) => {
    console.error('[queue] Queue events error:', err);
  });

  console.log(`[queue] Assemble worker initialized (attempts=${ASSEMBLE_JOB_ATTEMPTS}, concurrency=${ASSEMBLE_WORKER_CONCURRENCY}, lockDuration=300s, stalledInterval=120s)`);

  // Check and fix Redis eviction policy — BullMQ requires noeviction to prevent data loss
  checkRedisEvictionPolicy().catch(() => {});

  // Register graceful shutdown handlers
  registerShutdownHandlers();
}

async function checkRedisEvictionPolicy() {
  try {
    const info = await queueConnection.config('GET', 'maxmemory-policy');
    const policy = Array.isArray(info) ? info[1] : null;
    if (policy && policy !== 'noeviction') {
      console.warn(`\n⚠️  Redis eviction policy is "${policy}". Setting to "noeviction" for BullMQ stability...`);
      await queueConnection.config('SET', 'maxmemory-policy', 'noeviction');
      console.log('[queue] ✅ Redis eviction policy set to "noeviction"');
    }
  } catch (err) {
    console.warn('[queue] Could not check/set Redis eviction policy:', (err as Error).message);
  }
}

export async function enqueueAssembleJob(data: AssembleJobData) {
  const jobId = storyJobId(data.storyId);
  const existing = await assembleQueue.getJob(jobId);

  if (existing) {
    const state = await existing.getState();
    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      return { job: existing, alreadyQueued: true };
    }
    if (state === 'completed' || state === 'failed') {
      await existing.remove();
    }
  }

  const job = await assembleQueue.add('assemble-story-audio', data, {
    jobId,
  });

  return { job, alreadyQueued: false };
}

export async function getAssembleStoryStatus(storyId: string): Promise<{
  storyId: string;
  state: 'not_found' | 'queued' | 'processing' | 'completed' | 'failed';
  queuePosition: number | null;
  message: string;
  failedReason?: string;
}> {
  const job = await assembleQueue.getJob(storyJobId(storyId));
  if (!job) {
    return {
      storyId,
      state: 'not_found',
      queuePosition: null,
      message: 'No active assemble job found',
    };
  }

  const rawState = await job.getState();

  if (rawState === 'waiting' || rawState === 'delayed') {
    const waiting = await assembleQueue.getWaiting();
    const index = waiting.findIndex((j) => j.id === job.id);
    return {
      storyId,
      state: 'queued',
      queuePosition: index >= 0 ? index + 1 : null,
      message: index >= 0 ? `Queued (position ${index + 1})` : 'Queued for processing',
    };
  }

  if (rawState === 'active') {
    return {
      storyId,
      state: 'processing',
      queuePosition: null,
      message: 'Audio is being assembled',
    };
  }

  if (rawState === 'completed') {
    return {
      storyId,
      state: 'completed',
      queuePosition: null,
      message: 'Audio assembly completed',
    };
  }

  if (rawState === 'failed') {
    return {
      storyId,
      state: 'failed',
      queuePosition: null,
      message: 'Audio assembly failed',
      failedReason: job.failedReason || 'Unknown failure',
    };
  }

  return {
    storyId,
    state: 'processing',
    queuePosition: null,
    message: 'Audio is being assembled',
  };
}

export async function waitForAssembleResult(job: Job<AssembleJobData>, timeoutMs = 1000) {
  try {
    const result = await Promise.race([
      job.waitUntilFinished(assembleQueueEvents).catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return result;
  } catch {
    return null;
  }
}

/** Log a permanent job failure to the AppLog table for admin dashboard visibility */
async function logJobFailure(storyId: string, userId: string, reason: string) {
  try {
    await prisma.appLog.create({
      data: {
        level: 'error',
        source: 'assemble-queue',
        message: `Audio assembly permanently failed after ${ASSEMBLE_JOB_ATTEMPTS} attempts: ${reason}`,
        userId,
        meta: { storyId, reason } as any,
      },
    });
    console.log(`[queue] Failure logged to AppLog for story=${storyId}`);
  } catch (err) {
    console.error('[queue] Failed to log job failure to AppLog:', err);
  }
}

/** Graceful shutdown — close worker, queue, and Redis connections cleanly */
let shutdownInProgress = false;

function registerShutdownHandlers() {
  const shutdown = async (signal: string) => {
    if (shutdownInProgress) return;
    shutdownInProgress = true;
    console.log(`\n[queue] ${signal} received — shutting down gracefully...`);

    try {
      // Close worker first — lets active jobs finish current step, then stops taking new ones
      if (assembleWorker) {
        console.log('[queue] Closing worker (waiting for active jobs to finish)...');
        await assembleWorker.close();
        console.log('[queue] Worker closed');
      }

      // Close queue and events
      await assembleQueue.close();
      await assembleQueueEvents.close();
      console.log('[queue] Queue and events closed');

      // Close Redis connections
      queueConnection.disconnect();
      workerConnection.disconnect();
      eventsConnection.disconnect();
      console.log('[queue] Redis connections closed');
    } catch (err) {
      console.error('[queue] Error during shutdown:', err);
    }

    // Give a moment for cleanup, then exit
    setTimeout(() => process.exit(0), 500);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
