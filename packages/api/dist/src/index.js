"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
require("dotenv/config");
const _express = /*#__PURE__*/ _interop_require_default(require("express"));
const _cors = /*#__PURE__*/ _interop_require_default(require("cors"));
const _http = /*#__PURE__*/ _interop_require_default(require("http"));
const _ws = require("./ws");
const _endpoints = /*#__PURE__*/ _interop_require_default(require("./routes/endpoints"));
const _incidents = /*#__PURE__*/ _interop_require_default(require("./routes/incidents"));
const _analytics = /*#__PURE__*/ _interop_require_default(require("./routes/analytics"));
const _db = require("./db");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const app = (0, _express.default)();
const server = _http.default.createServer(app);
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use((0, _cors.default)({
    origin: process.env.DASHBOARD_URL ?? 'http://localhost:5173'
}));
app.use(_express.default.json());
// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res)=>{
    try {
        await _db.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            db: 'connected',
            ts: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({
            status: 'error',
            db: 'disconnected'
        });
    }
});
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/endpoints', _endpoints.default);
app.use('/api/incidents', _incidents.default);
app.use('/api/analytics', _analytics.default);
// ─── WebSocket ────────────────────────────────────────────────────────────────
(0, _ws.initWss)(server);
// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001');
server.listen(PORT, ()=>{
    console.log(`[api] Listening on :${PORT}`);
    console.log(`[api] Dashboard URL: ${process.env.DASHBOARD_URL ?? 'http://localhost:5173'}`);
});
