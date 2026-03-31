"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
require("dotenv/config");
const _nodecron = /*#__PURE__*/ _interop_require_default(require("node-cron"));
const _db = require("./db");
const _queues = require("./queues");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
async function enqueueChecks() {
    const { rows: endpoints } = await _db.pool.query('SELECT * FROM endpoints WHERE active = true');
    for (const ep of endpoints){
        await _queues.checksQueue.add('check', {
            endpointId: ep.id,
            name: ep.name,
            url: ep.url,
            method: ep.method,
            headers: ep.headers,
            body: ep.body,
            timeoutMs: ep.timeout_ms
        }, {
            jobId: `check:${ep.id}:${Date.now()}`
        });
    }
    console.log(`[scheduler] Enqueued ${endpoints.length} checks`);
}
enqueueChecks();
_nodecron.default.schedule('*/30*****', enqueueChecks);
