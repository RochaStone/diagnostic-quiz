'use strict';
/* Local end to end: the real dev server, the real handlers, the in-memory lead store and the console email driver. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { quizConfig, allAnswers, ADMIN_TOKEN } = require('./helpers');
const { createServer } = require('../scripts/dev-server');
const { setStore, memoryDriver } = require('../lib/store');
const { outbox } = require('../lib/email');
const { resetLimits, LIMITS } = require('../lib/ratelimit');
const { MAX_BODY_BYTES } = require('../lib/http');

let server;
let base;
let store;
const quiz = quizConfig();

test.before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((r) => server.close(r)));
test.beforeEach(() => {
  store = memoryDriver();
  setStore(store);
  resetLimits();
  outbox.length = 0;
});

let n = 0;
const lead = (over = {}) => ({ first_name: 'Ada', email: `ada${(n += 1)}@example.com`, marketing_consent: true, answers: allAnswers(quiz, 3), started_at: Date.now() - 30_000, ...over });
const post = (body, headers = {}) => fetch(`${base}/api/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const admin = (qs = '', headers = {}) => fetch(`${base}/api/admin/leads${qs}`, { headers });

test('GET /api/quiz: questions and labels, no points, plus the look', async () => {
  const r = await fetch(`${base}/api/quiz`);
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.quiz.questions.length, 6);
  assert.ok(!JSON.stringify(data).includes('points'));
  assert.equal(data.look.motif, 'analog');
  assert.ok(!JSON.stringify(data.look).includes('rocheverse'), 'the look carries no owner details');
});

test('the full journey: submit -> scored -> saved -> emailed -> listed in admin', async () => {
  const r = await post(lead({ first_name: 'Juniper', email: 'Juniper@Example.com' }));
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.ok, true);
  assert.equal(data.emailed, true);
  assert.deepEqual([data.result.total, data.result.percent, data.result.band.id], [18, 100, 'tier-3']);
  assert.ok(data.card_html.includes('RESULT RECEIPT'));

  assert.equal(store.rows.length, 1);
  const row = store.rows[0];
  assert.equal(row.email, 'juniper@example.com');
  assert.equal(row.band, 'tier-3');
  assert.equal(row.email_status, 'sent');
  assert.equal(row.marketing_consent, true);
  assert.equal(typeof row.ip_hash, 'string');
  assert.ok(!JSON.stringify(row).includes('127.0.0.1'), 'raw IP is never stored');

  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, 'juniper@example.com');
  assert.ok(outbox[0].html.includes('RESULT RECEIPT'));
  assert.ok(outbox[0].text.includes('Hi Juniper,'));

  const list = await admin('', { Authorization: `Bearer ${ADMIN_TOKEN}` });
  assert.equal(list.status, 200);
  const page = await list.json();
  assert.equal(page.total, 1);
  assert.equal(page.leads[0].email, 'juniper@example.com');
  assert.ok(!('answers' in page.leads[0]) && !('ip_hash' in page.leads[0]), 'admin list shows only list columns');
});

test('admin: no token, wrong token, token in the URL, and lowercase scheme are all refused', async () => {
  assert.equal((await admin()).status, 401);
  assert.equal((await admin('', { Authorization: 'Bearer nope' })).status, 401);
  assert.equal((await admin(`?token=${ADMIN_TOKEN}`)).status, 401);
  assert.equal((await admin(`?access_token=${ADMIN_TOKEN}`)).status, 401);
  assert.equal((await admin('', { Authorization: ADMIN_TOKEN })).status, 401);
  assert.equal((await admin('', { Authorization: `Bearer ${ADMIN_TOKEN}x` })).status, 401);
});

test('admin: wrong tokens are rate limited, then even the right one waits', async () => {
  for (let i = 0; i < LIMITS.adminFailsPer15Min; i += 1) await admin('', { Authorization: 'Bearer wrong' });
  assert.equal((await admin('', { Authorization: `Bearer ${ADMIN_TOKEN}` })).status, 429);
});

test('admin: a short or missing ADMIN_TOKEN switches the admin off', async () => {
  const saved = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = 'short';
  try {
    assert.equal((await admin('', { Authorization: 'Bearer short' })).status, 503);
    delete process.env.ADMIN_TOKEN;
    assert.equal((await admin('', { Authorization: 'Bearer ' })).status, 503);
  } finally {
    process.env.ADMIN_TOKEN = saved;
  }
});

test('admin: limit and offset are clamped, bad values ignored', async () => {
  const r = await admin('?limit=99999&offset=-5', { Authorization: `Bearer ${ADMIN_TOKEN}` });
  const page = await r.json();
  assert.equal(page.limit, 200);
  assert.equal(page.offset, 0);
});

test('admin: refuses a cross-origin browser call and sends no CORS headers', async () => {
  const r = await admin('', { Authorization: `Bearer ${ADMIN_TOKEN}`, Origin: 'https://evil.example' });
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('CORS: the site origin is echoed, any other origin is refused, never a wildcard', async () => {
  const good = await post(lead(), { Origin: 'https://quiz.example.com' });
  assert.equal(good.status, 200);
  assert.equal(good.headers.get('access-control-allow-origin'), 'https://quiz.example.com');
  const bad = await post(lead(), { Origin: 'https://evil.example' });
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  const pre = await fetch(`${base}/api/submit`, { method: 'OPTIONS', headers: { Origin: 'https://quiz.example.com' } });
  assert.equal(pre.status, 204);
  assert.notEqual(pre.headers.get('access-control-allow-origin'), '*');
});

test('submit: bad input gets a 4xx and nothing is saved or sent', async () => {
  const cases = [
    [lead({ email: 'nope' }), 400],
    [lead({ first_name: '<b>' }), 400],
    [lead({ answers: { q1: 9 } }), 400],
    [lead({ extra: 1 }), 400],
    [lead({ started_at: Date.now() }), 429],
    ['{not json', 400],
    ['[]', 400],
  ];
  for (const [body, status] of cases) {
    resetLimits();
    const r = await post(body);
    assert.equal(r.status, status, typeof body === 'string' ? body : JSON.stringify(body).slice(0, 80));
  }
  assert.equal(store.rows.length, 0);
  assert.equal(outbox.length, 0);
});

test('submit: wrong content type is 415, oversized body is 413', async () => {
  const r1 = await fetch(`${base}/api/submit`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(r1.status, 415);
  const big = JSON.stringify(lead({ first_name: 'A'.repeat(MAX_BODY_BYTES) }));
  const r2 = await post(big);
  assert.equal(r2.status, 413);
});

test('submit: GET is not allowed', async () => {
  assert.equal((await fetch(`${base}/api/submit`)).status, 405);
});

test('submit: honeypot gets a quiet 200 and nothing is saved', async () => {
  const r = await post(lead({ website: 'spam' }));
  assert.equal(r.status, 200);
  assert.equal(store.rows.length, 0);
  assert.equal(outbox.length, 0);
});

test('submit: burst limit per IP per minute', async () => {
  const statuses = [];
  for (let i = 0; i < LIMITS.burstPerMinute + 1; i += 1) statuses.push((await post(lead())).status);
  assert.deepEqual(statuses.slice(0, LIMITS.burstPerMinute), Array(LIMITS.burstPerMinute).fill(200));
  assert.equal(statuses[LIMITS.burstPerMinute], 429);
});

test('submit: durable daily limit per email address', async () => {
  for (let i = 0; i < LIMITS.perEmailDay; i += 1) {
    resetLimits();
    assert.equal((await post(lead({ email: 'same@example.com' }))).status, 200);
  }
  resetLimits();
  assert.equal((await post(lead({ email: 'same@example.com' }))).status, 429);
  assert.equal(store.rows.length, LIMITS.perEmailDay);
});

test('submit: if the store is down, the visitor gets a kind 503 and no email goes out', async () => {
  setStore({ ...memoryDriver(), async insert() { throw new Error('down'); } });
  const write = process.stderr.write;
  process.stderr.write = () => true;
  try {
    const r = await post(lead());
    assert.equal(r.status, 503);
  } finally {
    process.stderr.write = write;
  }
  assert.equal(outbox.length, 0);
});

test('security headers are set on pages (CSP with script-src self, no framing)', async () => {
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  assert.ok(r.headers.get('content-security-policy').includes("script-src 'self'"));
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});
