import { Queue } from 'bullmq';

export const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

export const checksQueue = new Queue('checks', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

export const evaluationsQueue = new Queue('evaluations', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

export const notificationsQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});