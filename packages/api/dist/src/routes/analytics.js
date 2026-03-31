"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _express = require("express");
const _db = require("../db");
const router = (0, _express.Router)();
// ─── GET /api/analytics/history/:endpointId?window=60 ────────────────────────
// Queries the continuous aggregate — sub-millisecond even with months of data
router.get('/history/:endpointId', async (req, res)=>{
    const { endpointId } = req.params;
    const window = parseInt(req.query.window ?? '60');
    if (isNaN(window) || window < 1) {
        return res.status(400).json({
            error: 'window must be a positive integer (minutes)'
        });
    }
    try {
        const { rows } = await _db.pool.query(`SELECT
         bucket,
         avg_latency::numeric(10,1)  AS avg_latency,
         p50::numeric(10,1)          AS p50,
         p95::numeric(10,1)          AS p95,
         p99::numeric(10,1)          AS p99,
         total_checks,
         successes,
         max_latency,
         CASE WHEN total_checks > 0
           THEN ROUND((successes::numeric / total_checks) * 100, 2)
           ELSE 100
         END                         AS uptime_pct
       FROM check_results_1min
       WHERE endpoint_id = $1
         AND bucket >= NOW() - ($2 || ' minutes')::interval
       ORDER BY bucket ASC`, [
            endpointId,
            window
        ]);
        res.json(rows);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── GET /api/analytics/sla/:endpointId ──────────────────────────────────────
// 30-day uptime SLA summary
router.get('/sla/:endpointId', async (req, res)=>{
    try {
        const { rows: [row] } = await _db.pool.query(`SELECT
         SUM(total_checks)                                                        AS total_checks,
         SUM(successes)                                                           AS successes,
         ROUND(
           SUM(successes)::numeric / NULLIF(SUM(total_checks), 0) * 100
         , 3)                                                                     AS uptime_pct_30d,
         ROUND(AVG(p99)::numeric, 1)                                             AS avg_p99_30d,
         ROUND(AVG(avg_latency)::numeric, 1)                                     AS avg_latency_30d
       FROM check_results_1min
       WHERE endpoint_id = $1
         AND bucket >= NOW() - INTERVAL '30 days'`, [
            req.params.endpointId
        ]);
        res.json(row);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── GET /api/analytics/summary ──────────────────────────────────────────────
// Fleet-wide p50/p99 across all endpoints for the last hour
router.get('/summary', async (_req, res)=>{
    try {
        const { rows } = await _db.pool.query(`
      SELECT
        e.id,
        e.name,
        e.url,
        ROUND(AVG(m.p99)::numeric, 1)         AS p99_1h,
        ROUND(AVG(m.p50)::numeric, 1)         AS p50_1h,
        ROUND(AVG(m.avg_latency)::numeric, 1) AS avg_latency_1h,
        CASE WHEN SUM(m.total_checks) > 0
          THEN ROUND(SUM(m.successes)::numeric / SUM(m.total_checks) * 100, 2)
          ELSE 100
        END                                   AS uptime_pct_1h
      FROM endpoints e
      LEFT JOIN check_results_1min m
        ON m.endpoint_id = e.id
        AND m.bucket >= NOW() - INTERVAL '1 hour'
      WHERE e.active = true
      GROUP BY e.id, e.name, e.url
      ORDER BY e.name ASC
    `);
        res.json(rows);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
const _default = router;
