'use strict';
/* The Supabase driver against a fake PostgREST on 127.0.0.1: request shapes only, no real project. */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
require('./helpers');
const { supabaseDriver } = require('../lib/store');

function fake(handler) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => { seen.push({ method: req.method, url: req.url, headers: req.headers, body }); handler(req, res); });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, seen, url: `http://127.0.0.1:${server.address().port}` })));
}

test('supabase driver: insert, count, list and update send the right shapes', async () => {
  const f = await fake((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.method === 'HEAD') { res.setHeader('content-range', '0-0/2'); return res.end(); }
    if (req.method === 'POST') return res.end(JSON.stringify([{ id: '11111111-1111-4111-8111-111111111111' }]));
    if (req.method === 'PATCH') { res.statusCode = 204; return res.end(); }
    res.setHeader('content-range', '0-0/1');
    return res.end(JSON.stringify([{ id: 'x', email: 'a@b.com', answers: { q1: 1 }, ip_hash: 'h' }]));
  });
  process.env.SUPABASE_URL = f.url;
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_value';
  try {
    const db = supabaseDriver();
    const row = await db.insert({ email: 'a@b.com' });
    assert.equal(row.id, '11111111-1111-4111-8111-111111111111');
    assert.equal(await db.countSince('email', 'a+b@c.com', '2026-01-01T00:00:00.000Z'), 2);
    const page = await db.list({ limit: 5, offset: 0 });
    assert.equal(page.total, 1);
    assert.ok(!('answers' in page.rows[0]) && !('ip_hash' in page.rows[0]));
    await db.update(row.id, { email_status: 'sent' });
    await assert.rejects(db.update('not-a-uuid', {}), /bad id/);
    await assert.rejects(db.countSince('first_name', 'x', 'y'), /bad count field/);

    const [ins, cnt, lst, upd] = f.seen;
    assert.equal(ins.url, '/rest/v1/quiz_leads');
    assert.equal(ins.headers.apikey, 'sb_secret_test_value');
    assert.equal(ins.headers.authorization, undefined, 'new-style keys are not sent as a Bearer JWT');
    assert.ok(cnt.url.includes('email=eq.a%2Bb%40c.com'), 'filter values are URL-encoded');
    assert.ok(lst.url.includes('order=created_at.desc&limit=5&offset=0'));
    assert.equal(upd.method, 'PATCH');
    assert.ok(upd.url.endsWith('id=eq.11111111-1111-4111-8111-111111111111'));
  } finally {
    f.server.close();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
  }
});

test('supabase driver refuses a plain http address that is not the local test server', () => {
  process.env.SUPABASE_URL = 'http://example.com';
  process.env.SUPABASE_SECRET_KEY = 'k';
  try {
    assert.throws(() => supabaseDriver(), /must be set/);
  } finally {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
  }
});
