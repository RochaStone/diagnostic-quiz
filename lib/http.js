'use strict';
/**
 * Request and response helpers. Behave the same under Vercel's Node runtime and scripts/dev-server.js.
 * Security notes for each helper live in SECURITY.md.
 */
const crypto = require('crypto');

const MAX_BODY_BYTES = 16 * 1024;

/** Reads a JSON body of at most MAX_BODY_BYTES. Returns { ok, body } or { ok:false, status, error }. */
async function readJson(req) {
  const type = String(req.headers['content-type'] || '').toLowerCase();
  if (!type.startsWith('application/json')) return { ok: false, status: 415, error: 'Send JSON.' };
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return { ok: false, status: 413, error: 'Too large.' };

  // Vercel may have parsed the body already.
  if (req.body !== undefined && req.body !== null) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return { ok: false, status: 413, error: 'Too large.' };
    if (typeof req.body === 'string') return parse(raw);
    return { ok: true, body: req.body };
  }
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { finish({ ok: false, status: 413, error: 'Too large.' }); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => finish(parse(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', () => finish({ ok: false, status: 400, error: 'Bad request.' }));
  });
}

function parse(raw) {
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, error: 'Bad request.' };
    return { ok: true, body };
  } catch (e) {
    return { ok: false, status: 400, error: `Bad request (${e.name}).` };
  }
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res, allow) {
  res.setHeader('Allow', allow);
  return json(res, 405, { error: 'Method not allowed.' });
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim().slice(0, 64);
  return ((req.socket && req.socket.remoteAddress) || 'unknown').slice(0, 64);
}

/** IPs are never stored raw. A keyed hash lets the rate limit count them without keeping them. */
function hashIp(ip) {
  const key = process.env.ADMIN_TOKEN || 'local-dev-only';
  return crypto.createHmac('sha256', key).update(String(ip)).digest('hex').slice(0, 32);
}

/** The one origin allowed to call the API from a browser: SITE_ORIGIN, or the same host. Never a wildcard. */
function siteOrigin() {
  return String(process.env.SITE_ORIGIN || '').trim().replace(/\/$/, '');
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin GETs and non-browser clients send no Origin
  if (siteOrigin() && origin === siteOrigin()) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  try {
    return new URL(origin).host === host;
  } catch (e) {
    return false;
  }
}

/** CORS for the public API. Answers preflight. Returns true when the request is finished (preflight or refused). */
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && originAllowed(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (!originAllowed(req)) { json(res, 403, { error: 'Forbidden.' }); return true; }
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
  return false;
}

module.exports = { readJson, json, methodNotAllowed, clientIp, hashIp, originAllowed, cors, siteOrigin, MAX_BODY_BYTES };
