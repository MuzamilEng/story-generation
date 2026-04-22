import IORedis from 'ioredis';
import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import { assembleStoryAudio } from './assemble';

const QUEUE_NAME = 'assemble-audio';
const ASSEMBLE_WORKER_CONCURRENCY = Math.max(
  1,
  Number(process.env.ASSEMBLE_WORKER_CONCURRENCY ?? 1) || 1
);
const ASSEMBLE_JOB_ATTEMPTS = Math.max(1, Number(process.env.ASSEMBLE_JOB_ATTEMPTS ?? 2) || 2);
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

export function initAssembleWorker() {
  if (workerInitialized) return;
  workerInitialized = true;

  const worker = new Worker<AssembleJobData>(
    QUEUE_NAME,
    async (job) => {
      await job.updateProgress({ stage: 'started', message: 'Audio job started' });
      const result = await assembleStoryAudio(job.data.storyId, job.data.userId);
      await job.updateProgress({ stage: 'completed', message: 'Audio is ready' });
      return result;
    },
    {
      connection: workerConnection,
      concurrency: ASSEMBLE_WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[queue] Completed ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[queue] Failed ${job?.id}:`, err.message);
  });

  assembleQueueEvents.on('error', (err) => {
    console.error('[queue] Queue events error:', err);
  });

  console.log('[queue] Assemble worker initialized');
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
  const result = await Promise.race([
    job.waitUntilFinished(assembleQueueEvents),
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
  return result;
}
