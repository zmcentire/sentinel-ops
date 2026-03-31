import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// ─── GET /api/incidents ───────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  const { status, severity, limit = '50' } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const values:     unknown[] = [];

  if (status)   { conditions.push(`i.status = $${values.length + 1}`);   values.push(status); }
  if (severity) { conditions.push(`i.severity = $${values.length + 1}`); values.push(severity); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT
         i.*,
         e.name AS endpoint_name,
         e.url  AS endpoint_url
       FROM incidents i
       LEFT JOIN endpoints e ON e.id = i.endpoint_id
       ${where}
       ORDER BY i.opened_at DESC
       LIMIT $${values.length + 1}`,
      [...values, parseInt(limit)]
    );
    res.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ─── GET /api/incidents/stats/summary ────────────────────────────────────────
// Must be defined BEFORE /:id or Express will match 'stats' as an id

router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open')                          AS open_count,
        COUNT(*) FILTER (WHERE status = 'acknowledged')                  AS ack_count,
        COUNT(*) FILTER (WHERE status = 'resolved')                      AS resolved_count,
        ROUND(AVG(mttr_minutes) FILTER (WHERE status = 'resolved'), 1)  AS avg_mttr_min,
        ROUND(AVG(mttr_minutes) FILTER (
          WHERE status = 'resolved' AND severity = 'p1'
        ), 1)                                                            AS avg_mttr_p1_min
      FROM incidents
      WHERE opened_at >= NOW() - INTERVAL '30 days'
    `);
    res.json(stats);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ─── GET /api/incidents/:id ───────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { rows: [incident] } = await pool.query(
      `SELECT i.*, e.name AS endpoint_name, e.url AS endpoint_url
       FROM incidents i
       LEFT JOIN endpoints e ON e.id = i.endpoint_id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (!incident) return res.status(404).json({ error: 'Not found' });

    // Fetch raw check results spanning the incident window for postmortem chart
    const { rows: timeline } = await pool.query(
      `SELECT time, latency_ms, success, status_code, error_msg
       FROM check_results
       WHERE endpoint_id = $1
         AND time BETWEEN $2 AND COALESCE($3, NOW())
       ORDER BY time ASC`,
      [incident.endpoint_id, incident.opened_at, incident.resolved_at]
    );

    res.json({ ...incident, timeline });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ─── PATCH /api/incidents/:id/acknowledge ────────────────────────────────────

router.patch('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { rows: [inc] } = await pool.query(
      `UPDATE incidents
       SET status = 'acknowledged'
       WHERE id = $1 AND status = 'open'
       RETURNING *`,
      [req.params.id]
    );
    if (!inc) {
      return res.status(404).json({ error: 'Not found or already past open state' });
    }
    res.json(inc);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ─── PATCH /api/incidents/:id/resolve ────────────────────────────────────────

router.patch('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { rows: [inc] } = await pool.query(
      `UPDATE incidents
       SET status = 'resolved', resolved_at = NOW()
       WHERE id = $1 AND status != 'resolved'
       RETURNING *`,
      [req.params.id]
    );
    if (!inc) {
      return res.status(404).json({ error: 'Not found or already resolved' });
    }
    // mttr_minutes is auto-calculated by the generated column in TimescaleDB
    res.json(inc);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;