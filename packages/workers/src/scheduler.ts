import 'dotenv/config';
import cron from 'node-cron';
import { pool } from '../../db/index';
import { checksQueue } from './queues';

async function enqueueChecks() {
    const { rows: endpoints } = await pool.query<{
        id: string;
        name: string;
        url: string;
        method: string;
        headers: Record<string, string>;
        body: unknown;
        timeout_ms: Number;
        interval_s: Number;
    }>('SELECT * FROM endpoints WHERE active = true');

    for (const ep of endpoints) {
        await checksQueue.add(
            'check',
            {
                endpointId: ep.id,
                name:       ep.name,
                url:        ep.url,
                method:     ep.method,
                headers:    ep.headers,
                body:       ep.body,
                timeoutMs:  ep.timeout_ms,
            },
            {
                jobId:  `check:${ep.id}:${Date.now()}`,
            }
        );
    }
    console.log(`[scheduler] Enqueued ${endpoints.length} checks`);
}

enqueueChecks();
cron.schedule('*/30*****', enqueueChecks);