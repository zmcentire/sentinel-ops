import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { initWss } from './ws';
import endpointsRouter from './routes/endpoints';
import incidentsRouter from './routes/incidents';
import analyticsRouter from './routes/analytics';
import { pool } from '../../db/index';

const app    = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.DASHBOARD_URL ?? 'http://localhost:5173',
}));

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/endpoints', endpointsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/analytics', analyticsRouter);

// ─── WebSocket ────────────────────────────────────────────────────────────────

initWss(server);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001');

server.listen(PORT, () => {
  console.log(`[api] Listening on :${PORT}`);
  console.log(`[api] Dashboard URL: ${process.env.DASHBOARD_URL ?? 'http://localhost:5173'}`);
});