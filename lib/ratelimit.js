'use strict';
/**
 * Two layers of rate limiting.
 * 1. memoryLimit: a fast burst limit per server instance (resets when the instance restarts).
 * 2. LIMITS.perEmailDay / perIpDay: durable daily limits counted in the lead store (survive restarts).
 */
const LIMITS = {
  burstPerMinute: 5, // submits per IP per minute, per instance
  perEmailDay: 3, // submits per email address per 24 hours
  perIpDay: 20, // submits per IP per 24 hours
  adminFailsPer15Min: 10, // wrong admin tokens per IP per 15 minutes
};

const buckets = new Map();
const MAX_BUCKETS = 10000;

/** true = over the limit. */
function memoryLimit(key, max, windowMs, now = Date.now()) {
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  b.n += 1;
  return b.n > max;
}

/** Peek without counting (used to block admin after too many failures). */
function isBlocked(key, max, now = Date.now()) {
  const b = buckets.get(key);
  return Boolean(b && now <= b.reset && b.n >= max);
}

function resetLimits() {
  buckets.clear();
}

module.exports = { memoryLimit, isBlocked, resetLimits, LIMITS };
