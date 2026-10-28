'use strict';
/**
 * Validates the lead half of a submission: first name, email, consent, honeypot, timing.
 * Every field has a type check and a length cap. Unknown fields are ignored, never stored.
 */
const EMAIL_RE = /^[^\s@<>"',;:()[\]\\]+@[^\s@<>"',;:()[\]\\]+\.[A-Za-z]{2,24}$/;
const NAME_RE = /^[\p{L}\p{M}' .-]{1,60}$/u;
const MIN_SECONDS = 8;
const ALLOWED_KEYS = new Set(['first_name', 'email', 'marketing_consent', 'answers', 'started_at', 'website']);

/** Returns { ok, lead } | { ok:false, error, field? } | { ok:true, bot:true } */
function validateLead(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Bad request.' };
  for (const k of Object.keys(body)) if (!ALLOWED_KEYS.has(k)) return { ok: false, error: 'Bad request.' };

  // Honeypot: a hidden field real people never see. Pretend success, store nothing.
  if (body.website !== undefined && body.website !== '') return { ok: true, bot: true };

  if (typeof body.first_name !== 'string') return { ok: false, error: 'Please add your first name.', field: 'first_name' };
  const firstName = body.first_name.normalize('NFC').trim();
  if (!NAME_RE.test(firstName)) return { ok: false, error: 'Please add your first name (letters only, up to 60).', field: 'first_name' };

  if (typeof body.email !== 'string' || body.email.length > 254) return { ok: false, error: 'That email does not look right.', field: 'email' };
  const email = body.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'That email does not look right.', field: 'email' };

  if (body.marketing_consent !== undefined && typeof body.marketing_consent !== 'boolean') return { ok: false, error: 'Bad request.' };

  if (!Number.isInteger(body.started_at)) return { ok: false, error: 'Bad request.' };
  if (now - body.started_at < MIN_SECONDS * 1000) return { ok: false, error: 'That was quick. Take a breath and send it again.', status: 429 };

  return { ok: true, lead: { firstName, email, marketingConsent: body.marketing_consent === true } };
}

module.exports = { validateLead, MIN_SECONDS };
