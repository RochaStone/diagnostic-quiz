'use strict';
/**
 * Email drivers.
 *   console  prints the email to the terminal and keeps it in `outbox` (local runs and tests). The default off Vercel.
 *   resend   sends through the Resend API with plain fetch (no SDK). The default on Vercel.
 * Pick one with EMAIL_DRIVER. Resend answers errors in the body, so the status is always checked.
 */
const outbox = [];

function driverName() {
  const d = String(process.env.EMAIL_DRIVER || '').trim().toLowerCase();
  if (d === 'console' || d === 'resend') return d;
  return process.env.VERCEL ? 'resend' : 'console';
}

const clean = (s, max) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

async function sendConsole(msg) {
  outbox.push(msg);
  if (!process.env.QUIET_EMAIL) {
    process.stdout.write(`\n[console email] to: ${msg.to}\n[console email] subject: ${msg.subject}\n${msg.text}\n\n`);
  }
  return { ok: true, id: `console-${outbox.length}` };
}

async function sendResend(msg) {
  const key = process.env.RESEND_API_KEY;
  const from = clean(process.env.EMAIL_FROM, 200);
  if (!key || !from) return { ok: false, reason: 'RESEND_API_KEY or EMAIL_FROM is not set' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: controller.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.id) return { ok: false, reason: `resend ${r.status}: ${clean(data.message || data.name, 200)}` };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, reason: `resend unreachable: ${clean(e.message, 200)}` };
  } finally {
    clearTimeout(timer);
  }
}

/** msg: { to, subject, html, text }. Resolves { ok, id?, reason? }. Never throws. */
async function sendEmail(msg) {
  const safe = { ...msg, to: clean(msg.to, 254), subject: clean(msg.subject, 150) };
  return driverName() === 'resend' ? sendResend(safe) : sendConsole(safe);
}

module.exports = { sendEmail, driverName, outbox };
