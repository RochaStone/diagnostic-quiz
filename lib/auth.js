'use strict';
/**
 * The admin list sits behind ONE token, kept in the ADMIN_TOKEN environment variable.
 * - The token travels only in the Authorization header ("Bearer <token>"). A token in the URL is ignored.
 * - Comparison is constant time: both sides are hashed to 32 bytes, then crypto.timingSafeEqual.
 * - A token shorter than 32 characters switches the admin off (503), so a weak token can never be in use.
 * - Wrong guesses are rate limited per IP in lib/ratelimit.js (see api/admin/leads.js).
 */
const crypto = require('crypto');

const MIN_TOKEN_LENGTH = 32;

const digest = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest();

function configuredToken() {
  const t = process.env.ADMIN_TOKEN || '';
  return t.length >= MIN_TOKEN_LENGTH ? t : null;
}

function bearer(req) {
  const h = req.headers.authorization;
  if (typeof h !== 'string' || h.length > 512) return null;
  const m = /^Bearer ([\x21-\x7e]+)$/.exec(h.trim());
  return m ? m[1] : null;
}

/** 'ok' | 'denied' | 'disabled'. Never throws, never logs the token. */
function checkAdmin(req) {
  const expected = configuredToken();
  if (!expected) return 'disabled';
  const given = bearer(req);
  if (!given) return 'denied';
  return crypto.timingSafeEqual(digest(given), digest(expected)) ? 'ok' : 'denied';
}

module.exports = { checkAdmin, bearer, MIN_TOKEN_LENGTH };
