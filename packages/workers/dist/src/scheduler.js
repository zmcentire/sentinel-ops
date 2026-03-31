"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
require("dotenv/config");
const _db = require("./db");
const _queues = require("./queues");
async function enqueueChecks() {
    const { rows: endpoints } = await _db.pool.query(`SELECT * FROM endpoints WHERE active = true`);
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
// Run immediately on startup
enqueueChecks().catch(console.error);
// Then every 30 seconds
setInterval(()=>{
    enqueueChecks().catch(console.error);
}, 30_000);
console.log('[scheduler] Started — interval: 30s');
