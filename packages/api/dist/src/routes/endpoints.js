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
// ─── GET /api/endpoints ───────────────────────────────────────────────────────
// All endpoints with their latest check result attached via LATERAL join
router.get('/', async (_req, res)=>{
    try {
        const { rows } = await _db.pool.query(`
      SELECT
        e.*,
        cr.status_code,
        cr.latency_ms   AS latest_latency_ms,
        cr.success      AS latest_success,
        cr.error_msg    AS latest_error,
        cr.time         AS last_checked_at
      FROM endpoints e
      LEFT JOIN LATERAL (
        SELECT status_code, latency_ms, success, error_msg, time
        FROM check_results
        WHERE endpoint_id = e.id
        ORDER BY time DESC
        LIMIT 1
      ) cr ON true
      ORDER BY e.created_at ASC
    `);
        res.json(rows);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── GET /api/endpoints/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res)=>{
    try {
        const { rows: [endpoint] } = await _db.pool.query(`SELECT * FROM endpoints WHERE id = $1`, [
            req.params.id
        ]);
        if (!endpoint) return res.status(404).json({
            error: 'Not found'
        });
        res.json(endpoint);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── POST /api/endpoints ──────────────────────────────────────────────────────
router.post('/', async (req, res)=>{
    const { name, url, method = 'GET', headers = {}, body, interval_s = 60, timeout_ms = 5000 } = req.body;
    if (!name || !url) {
        return res.status(400).json({
            error: 'name and url are required'
        });
    }
    try {
        const { rows: [endpoint] } = await _db.pool.query(`INSERT INTO endpoints (name, url, method, headers, body, interval_s, timeout_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [
            name,
            url,
            method,
            JSON.stringify(headers),
            body ? JSON.stringify(body) : null,
            interval_s,
            timeout_ms
        ]);
        res.status(201).json(endpoint);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── PATCH /api/endpoints/:id ────────────────────────────────────────────────
router.patch('/:id', async (req, res)=>{
    const allowedFields = [
        'name',
        'url',
        'method',
        'headers',
        'body',
        'interval_s',
        'timeout_ms',
        'active'
    ];
    const updates = Object.entries(req.body).filter(([k])=>allowedFields.includes(k));
    if (updates.length === 0) {
        return res.status(400).json({
            error: 'No valid fields provided'
        });
    }
    const setClauses = updates.map(([k], i)=>`${k} = $${i + 2}`).join(', ');
    const values = [
        req.params.id,
        ...updates.map(([, v])=>v)
    ];
    try {
        const { rows: [ep] } = await _db.pool.query(`UPDATE endpoints SET ${setClauses} WHERE id = $1 RETURNING *`, values);
        if (!ep) return res.status(404).json({
            error: 'Not found'
        });
        res.json(ep);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── DELETE /api/endpoints/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res)=>{
    try {
        await _db.pool.query('DELETE FROM endpoints WHERE id = $1', [
            req.params.id
        ]);
        res.status(204).send();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── GET /api/endpoints/:id/uptime ───────────────────────────────────────────
router.get('/:id/uptime', async (req, res)=>{
    try {
        const { rows: [row] } = await _db.pool.query(`SELECT
        ROUND(
          SUM(CASE WHEN time >= NOW() - INTERVAL '1 day'   AND success THEN 1 ELSE 0 END)::numeric
          / NULLIF(SUM(CASE WHEN time >= NOW() - INTERVAL '1 day'  THEN 1 ELSE 0 END), 0) * 100
        , 3) AS uptime_1d,
        ROUND(
          SUM(CASE WHEN time >= NOW() - INTERVAL '7 days'  AND success THEN 1 ELSE 0 END)::numeric
          / NULLIF(SUM(CASE WHEN time >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) * 100
        , 3) AS uptime_7d,
        ROUND(
          SUM(CASE WHEN time >= NOW() - INTERVAL '30 days' AND success THEN 1 ELSE 0 END)::numeric
          / NULLIF(SUM(CASE WHEN time >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0) * 100
        , 3) AS uptime_30d
       FROM check_results
       WHERE endpoint_id = $1`, [
            req.params.id
        ]);
        res.json(row);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── GET /api/endpoints/:id/rules ────────────────────────────────────────────
router.get('/:id/rules', async (req, res)=>{
    try {
        const { rows } = await _db.pool.query(`SELECT * FROM alert_rules WHERE endpoint_id = $1 ORDER BY metric`, [
            req.params.id
        ]);
        res.json(rows);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── POST /api/endpoints/:id/rules ───────────────────────────────────────────
router.post('/:id/rules', async (req, res)=>{
    const { metric, operator, threshold, window_min = 5, severity = 'p2', cooldown_min = 15, notify_sms = false, notify_email = true } = req.body;
    try {
        const { rows: [rule] } = await _db.pool.query(`INSERT INTO alert_rules
         (endpoint_id, metric, operator, threshold, window_min,
          severity, cooldown_min, notify_sms, notify_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`, [
            req.params.id,
            metric,
            operator,
            threshold,
            window_min,
            severity,
            cooldown_min,
            notify_sms,
            notify_email
        ]);
        res.status(201).json(rule);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
// ─── DELETE /api/endpoints/:id/rules/:ruleId ─────────────────────────────────
router.delete('/:id/rules/:ruleId', async (req, res)=>{
    try {
        await _db.pool.query(`DELETE FROM alert_rules WHERE id = $1 AND endpoint_id = $2`, [
            req.params.ruleId,
            req.params.id
        ]);
        res.status(204).send();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: msg
        });
    }
});
const _default = router;
