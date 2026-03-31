import 'dotenv/config';
import { Worker } from 'bullmq';
import { pool } from './db';
import { redisConnection, notificationsQueue } from './queues';

interface EvalJobData {
  endpointId: string;
}

const evaluatorWorker = new Worker<EvalJobData>(
  'evaluations',
  async (job) => {
    const { endpointId } = job.data;

    // Fetch all active rules for this endpoint
    const { rows: rules } = await pool.query(
      `SELECT * FROM alert_rules WHERE endpoint_id = $1 AND active = true`,
      [endpointId]
    );

    for (const rule of rules) {
      // Query the continuous aggregate — much faster than scanning raw check_results
      const { rows } = await pool.query(
        `SELECT
           AVG(p99)::numeric(10,2)                                          AS p99,
           AVG(avg_latency)::numeric(10,2)                                  AS avg_latency,
           SUM(total_checks)                                                AS total_checks,
           SUM(successes)                                                   AS successes,
           CASE WHEN SUM(total_checks) > 0
             THEN (SUM(successes)::float / SUM(total_checks)) * 100
             ELSE 100
           END                                                              AS uptime_pct,
           CASE WHEN SUM(total_checks) > 0
             THEN ((SUM(total_checks) - SUM(successes))::float / SUM(total_checks)) * 100
             ELSE 0
           END                                                              AS error_rate
         FROM check_results_1min
         WHERE endpoint_id = $1
           AND bucket >= NOW() - ($2 || ' minutes')::interval`,
        [endpointId, rule.window_min]
      );

      const metrics = rows[0];

      // No data yet for this window — skip
      if (!metrics || !metrics.total_checks) continue;

      // Evaluate the rule operator against the metric value
      const value: number = parseFloat(metrics[rule.metric]);
      const violated =
        rule.operator === 'gt' ? value > rule.threshold :
        rule.operator === 'lt' ? value < rule.threshold : false;

      if (!violated) continue;

      // Check cooldown — is there already an open/acknowledged incident
      // opened within the cooldown window for this endpoint?
      const { rows: recentIncidents } = await pool.query(
        `SELECT id FROM incidents
         WHERE endpoint_id = $1
           AND status != 'resolved'
           AND opened_at > NOW() - ($2 || ' minutes')::interval`,
        [endpointId, rule.cooldown_min]
      );

      if (recentIncidents.length > 0) continue;

      // Open a new incident
      const title = buildTitle(rule, value);
      const body  = `Auto-opened by alert rule ${rule.id}. ` +
                    `${rule.metric}=${value.toFixed(1)} ` +
                    `(threshold: ${rule.operator} ${rule.threshold})`;

      const { rows: [incident] } = await pool.query(
        `INSERT INTO incidents (endpoint_id, severity, title, body)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [endpointId, rule.severity, title, body]
      );

      console.log(`[evaluator] Incident opened: ${incident.id} — ${title}`);

      // Enqueue notification
      await notificationsQueue.add('notify', {
        incident,
        rule,
        currentValue: value,
      });
    }
  },
  {
    connection:  redisConnection,
    concurrency: 10,
  }
);

evaluatorWorker.on('failed', (job, err) => {
  console.error(`[evaluator] Job ${job?.id} failed:`, err.message);
});

console.log('[evaluator] Worker started — concurrency: 10');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildTitle(rule: Record<string, unknown>, value: number): string {
  const metricLabel: Record<string, string> = {
    latency_p99: 'P99 latency',
    uptime_pct:  'Uptime',
    error_rate:  'Error rate',
  };

  const label  = metricLabel[rule.metric as string] ?? String(rule.metric);
  const direction = rule.operator === 'gt' ? 'above' : 'below';
  const unit   = String(rule.metric).includes('pct') ||
                 String(rule.metric).includes('rate') ? '%' : 'ms';

  return `${label} ${direction} threshold (${value.toFixed(0)}${unit})`;
}