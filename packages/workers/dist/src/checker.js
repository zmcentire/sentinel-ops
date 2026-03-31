"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
require("dotenv/config");
const _bullmq = require("bullmq");
const _axios = /*#__PURE__*/ _interop_require_default(require("axios"));
const _db = require("./db");
const _queues = require("./queues");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const broadcast = (_payload)=>{};
const checkerWorker = new _bullmq.Worker('checks', async (job)=>{
    const { endpointId, name, url, method, headers, body, timeoutMs } = job.data;
    const start = Date.now();
    let statusCode = null;
    let success = false; // ← declared here
    let errorMsg = null;
    try {
        const res = await (0, _axios.default)({
            method,
            url,
            headers,
            data: body ?? undefined,
            timeout: timeoutMs,
            validateStatus: ()=>true
        });
        statusCode = res.status;
        success = statusCode >= 200 && statusCode < 400; // ← now in scope
    } catch (err) {
        errorMsg = err instanceof Error ? err.message : String(err);
    }
    const latencyMs = Date.now() - start;
    await _db.pool.query(`INSERT INTO check_results (time, endpoint_id, status_code, latency_ms, success, error_msg)
       VALUES (NOW(), $1, $2, $3, $4, $5)`, [
        endpointId,
        statusCode,
        latencyMs,
        success,
        errorMsg
    ]);
    broadcast({
        type: 'check_result',
        endpointId: endpointId,
        name: name,
        latencyMs: latencyMs,
        success: success,
        statusCode: statusCode,
        errorMsg: errorMsg,
        timestamp: new Date().toISOString()
    });
    await _queues.evaluationsQueue.add('evaluate', {
        endpointId
    }); // ← object, not array
    return {
        latencyMs,
        success,
        statusCode
    };
}, {
    connection: _queues.redisConnection,
    concurrency: 20
});
checkerWorker.on('failed', (job, err)=>{
    console.error(`[checker] Job ${job?.id} failed:`, err.message);
});
console.log('[checker] Worker started — concurrency: 20');
