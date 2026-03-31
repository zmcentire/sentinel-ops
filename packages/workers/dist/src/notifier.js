"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
require("dotenv/config");
const _bullmq = require("bullmq");
const _twilio = /*#__PURE__*/ _interop_require_default(require("twilio"));
const _mail = /*#__PURE__*/ _interop_require_default(require("@sendgrid/mail"));
const _queues = require("./queues");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
// ─── Client setup ─────────────────────────────────────────────────────────────
// Clients are initialised once at module load — not inside the worker function,
// so we don't create a new SDK instance for every job.
const twilioClient = (0, _twilio.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
_mail.default.setApiKey(process.env.SENDGRID_API_KEY);
// ─── Worker ───────────────────────────────────────────────────────────────────
const notifierWorker = new _bullmq.Worker('notifications', async (job)=>{
    const { incident, rule } = job.data;
    const dashUrl = `${process.env.DASHBOARD_URL}/incidents/${incident.id}`;
    // Fire SMS and email concurrently — a failure in one does not block the other
    const results = await Promise.allSettled([
        rule.notify_sms ? sendSms(incident, dashUrl) : Promise.resolve(),
        rule.notify_email ? sendEmail(incident, dashUrl) : Promise.resolve()
    ]);
    for (const result of results){
        if (result.status === 'rejected') {
            // Log but don't rethrow — BullMQ will retry the whole job on throw.
            // Logging here lets us see partial failures without losing the other channel.
            console.error('[notifier] Delivery failed:', result.reason);
        }
    }
}, {
    connection: _queues.redisConnection,
    concurrency: 5
});
notifierWorker.on('failed', (job, err)=>{
    console.error(`[notifier] Job ${job?.id} failed:`, err.message);
});
console.log('[notifier] Worker started — concurrency: 5');
// ─── SMS via Twilio ───────────────────────────────────────────────────────────
async function sendSms(incident, dashUrl) {
    const sev = incident.severity.toUpperCase();
    const body = `[SENTINEL ${sev}] ${incident.title} | ${dashUrl}`;
    const message = await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_FROM_NUMBER,
        to: process.env.ON_CALL_PHONE
    });
    console.log(`[notifier] SMS sent — SID: ${message.sid} — incident: ${incident.id}`);
}
// ─── Email via SendGrid ───────────────────────────────────────────────────────
async function sendEmail(incident, dashUrl) {
    const sev = incident.severity.toUpperCase();
    const sevColor = incident.severity === 'p1' ? '#c0392b' : incident.severity === 'p2' ? '#d4860a' : '#2a9d5c';
    await _mail.default.send({
        to: process.env.OPS_EMAIL,
        from: process.env.ALERT_EMAIL_FROM,
        subject: `[${sev}] ${incident.title}`,
        html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">

        <div style="background:${sevColor};padding:16px 24px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">
            [${sev}] ${incident.title}
          </h1>
        </div>

        <div style="padding:24px;background:#f9f9f9;">
          <p style="color:#333;margin-top:0;">${incident.body}</p>

          <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
            <tr style="background:#fff;">
              <td style="padding:10px 12px;color:#666;width:130px;">Incident ID</td>
              <td style="padding:10px 12px;font-family:monospace;color:#333;">${incident.id}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;color:#666;background:#f9f9f9;">Severity</td>
              <td style="padding:10px 12px;font-weight:bold;color:${sevColor};background:#f9f9f9;">${sev}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:10px 12px;color:#666;">Opened at</td>
              <td style="padding:10px 12px;color:#333;">${new Date(incident.opened_at).toUTCString()}</td>
            </tr>
          </table>

          <a href="${dashUrl}"
             style="display:inline-block;margin-top:24px;padding:12px 24px;
                    background:${sevColor};color:#fff;text-decoration:none;
                    border-radius:4px;font-weight:bold;font-size:14px;">
            View Incident &rarr;
          </a>
        </div>

        <div style="padding:12px 24px;background:#eee;font-size:12px;color:#999;">
          SENTINEL/OPS &mdash; automated alert
        </div>

      </div>
    `
    });
    console.log(`[notifier] Email sent — incident: ${incident.id}`);
}
