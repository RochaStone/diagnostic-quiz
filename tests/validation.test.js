'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');
const { validateLead } = require('../lib/lead');

const NOW = 1_800_000_000_000;
const ok = { first_name: 'Ada', email: 'Ada@Example.com', marketing_consent: true, answers: {}, started_at: NOW - 60_000 };

test('a good lead is cleaned: email lowercased, consent kept', () => {
  const r = validateLead(ok, NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.lead, { firstName: 'Ada', email: 'ada@example.com', marketingConsent: true });
});

test('names: accents and hyphens pass, tags, digits and long names fail', () => {
  assert.equal(validateLead({ ...ok, first_name: 'Zoë-Anne' }, NOW).ok, true);
  assert.equal(validateLead({ ...ok, first_name: "O'Hara" }, NOW).ok, true);
  for (const bad of ['', ' ', '<script>', 'a'.repeat(61), 'R2D2', 42, null]) {
    assert.equal(validateLead({ ...ok, first_name: bad }, NOW).ok, false, String(bad));
  }
});

test('emails: shape and length are checked', () => {
  for (const bad of ['nope', 'a@b', 'a b@c.com', 'a@b.c', `${'x'.repeat(250)}@a.com`, 'a@b.com<script>', ['a@b.com'], 7]) {
    assert.equal(validateLead({ ...ok, email: bad }, NOW).ok, false, String(bad));
  }
});

test('consent must be a real true or false', () => {
  assert.equal(validateLead({ ...ok, marketing_consent: 'yes' }, NOW).ok, false);
  assert.equal(validateLead({ ...ok, marketing_consent: undefined }, NOW).lead.marketingConsent, false);
});

test('unknown fields are refused, so nothing unexpected is ever stored', () => {
  assert.equal(validateLead({ ...ok, is_admin: true }, NOW).ok, false);
});

test('honeypot filled: pretend success, mark as bot', () => {
  const r = validateLead({ ...ok, website: 'http://spam.example' }, NOW);
  assert.deepEqual(r, { ok: true, bot: true });
});

test('too fast or missing start time is refused', () => {
  assert.equal(validateLead({ ...ok, started_at: NOW - 2000 }, NOW).status, 429);
  assert.equal(validateLead({ ...ok, started_at: NOW + 60_000 }, NOW).ok, false);
  assert.equal(validateLead({ ...ok, started_at: 'soon' }, NOW).ok, false);
});
