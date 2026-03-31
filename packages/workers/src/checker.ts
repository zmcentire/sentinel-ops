import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { pool } from './db';
import { redisConnection, evaluationsQueue } from './queues';

const broadcast = (_payload: object): void => {};

interface CheckJobData {
  endpointId: string;
  name:       string;
  url:        string;
  method:     string;
  headers:    Record<string, string>;
  body:       unknown;
  timeoutMs:  number;
}

const checkerWorker = new Worker<CheckJobData>(
  'checks',
  async (job: Job<CheckJobData>) => {
    const { endpointId, name, url, method, headers, body, timeoutMs } = job.data;

    const start                    = Date.now();
    let statusCode: number | null  = null;
    let success                    = false;   // ← declared here
    let errorMsg:   string | null  = null;

    try {
      const res = await axios({
        method,
        url,
        headers,
        data:           body ?? undefined,
        timeout:        timeoutMs,
        validateStatus: () => true,
      });
      statusCode = res.status;
      success    = statusCode >= 200 && statusCode < 400;  // ← now in scope
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    const latencyMs = Date.now() - start;

    await pool.query(
      `INSERT INTO check_results (time, endpoint_id, status_code, latency_ms, success, error_msg)
       VALUES (NOW(), $1, $2, $3, $4, $5)`,
      [endpointId, statusCode, latencyMs, success, errorMsg]
    );

    broadcast({
      type:       'check_result',
      endpointId: endpointId,
      name:       name,
      latencyMs:  latencyMs,
      success:    success,
      statusCode: statusCode,
      errorMsg:   errorMsg,
      timestamp:  new Date().toISOString(),
    });

    await evaluationsQueue.add('evaluate', { endpointId });  // ← object, not array

    return { latencyMs, success, statusCode };
  },
  {
    connection:  redisConnection,
    concurrency: 20,
  }
);

checkerWorker.on('failed', (job, err) => {
  console.error(`[checker] Job ${job?.id} failed:`, err.message);
});

console.log('[checker] Worker started — concurrency: 20');