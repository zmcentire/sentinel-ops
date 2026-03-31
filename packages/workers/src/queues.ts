import { Queue } from 'bullmq';
import { URL } from 'url';

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const parsed   = new URL(redisUrl);
  return {
    host:     parsed.hostname,
    port:     parseInt(parsed.port ?? '6379'),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  };
}

export const redisConnection = getRedisConnection();

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