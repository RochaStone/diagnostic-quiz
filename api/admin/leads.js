'use strict';
/**
 * GET /api/admin/leads?limit=50&offset=0 : the newest leads, for her eyes only.
 * Auth: "Authorization: Bearer <ADMIN_TOKEN>" only. Same origin only, no CORS headers. Wrong tokens are rate limited.
 */
const { json, methodNotAllowed, clientIp, hashIp, originAllowed } = require('../../lib/http');
const { checkAdmin } = require('../../lib/auth');
const { memoryLimit, isBlocked, LIMITS } = require('../../lib/ratelimit');
const { getStore } = require('../../lib/store');

const WINDOW = 15 * 60 * 1000;

function intParam(v, def, min, max) {
  const n = /^\d{1,6}$/.test(String(v ?? '')) ? Number(v) : def;
  return Math.min(max, Math.max(min, n));
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  if (req.headers.origin && !originAllowed(req)) return json(res, 403, { error: 'Forbidden.' });

  const key = `admin-fail:${hashIp(clientIp(req))}`;
  if (isBlocked(key, LIMITS.adminFailsPer15Min)) return json(res, 429, { error: 'Too many tries. Wait 15 minutes.' });

  const auth = checkAdmin(req);
  if (auth === 'disabled') return json(res, 503, { error: 'Admin is off. Set ADMIN_TOKEN (32 characters or more).' });
  if (auth !== 'ok') {
    memoryLimit(key, LIMITS.adminFailsPer15Min, WINDOW);
    return json(res, 401, { error: 'That token is not right.' });
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const limit = intParam(url.searchParams.get('limit'), 50, 1, 200);
  const offset = intParam(url.searchParams.get('offset'), 0, 0, 100000);
  try {
    const page = await getStore().list({ limit, offset });
    return json(res, 200, { ok: true, limit, offset, total: page.total, leads: page.rows });
  } catch (e) {
    process.stderr.write(`admin: list failed: ${e.message}\n`);
    return json(res, 503, { error: 'Could not load leads right now.' });
  }
};
