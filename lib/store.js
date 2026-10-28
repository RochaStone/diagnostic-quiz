'use strict';
/**
 * Where leads are saved. Pick with LEAD_STORE:
 *   supabase  her own Supabase project, table public.quiz_leads (supabase/migrations). The default on Vercel.
 *   memory    kept in memory until the process stops. The default off Vercel, and what the tests use.
 *   file      a JSON file at .data/leads.json, for local runs that should survive a restart.
 * Every driver has the same four calls: insert, update, countSince, list.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TABLE = 'quiz_leads';
const LIST_COLUMNS = ['id', 'created_at', 'first_name', 'email', 'score', 'max_score', 'percent', 'band', 'marketing_consent', 'email_status'];
const COUNT_FIELDS = new Set(['email', 'ip_hash']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pickList = (row) => Object.fromEntries(LIST_COLUMNS.map((k) => [k, row[k] ?? null]));

function memoryDriver(rows = []) {
  return {
    name: 'memory',
    rows,
    async insert(lead) {
      const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), email_status: 'pending', ...lead };
      rows.push(row);
      return row;
    },
    async update(id, patch) {
      const row = rows.find((r) => r.id === id);
      if (row) Object.assign(row, patch);
      return row || null;
    },
    async countSince(field, value, sinceIso) {
      if (!COUNT_FIELDS.has(field)) throw new Error('bad count field');
      return rows.filter((r) => r[field] === value && r.created_at >= sinceIso).length;
    },
    async list({ limit, offset }) {
      const sorted = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return { total: rows.length, rows: sorted.slice(offset, offset + limit).map(pickList) };
    },
  };
}

function fileDriver(file = path.join(__dirname, '..', '.data', 'leads.json')) {
  let rows = [];
  try {
    rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(rows)) rows = [];
  } catch (e) {
    if (e.code !== 'ENOENT') process.stderr.write(`Could not read ${file} (${e.message}). Starting an empty list.\n`);
    rows = [];
  }
  const mem = memoryDriver(rows);
  const save = () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), { mode: 0o600 });
  };
  return {
    ...mem,
    name: 'file',
    async insert(lead) { const r = await mem.insert(lead); save(); return r; },
    async update(id, patch) { const r = await mem.update(id, patch); save(); return r; },
  };
}

function supabaseDriver() {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || '';
  // https only, except a local test server on 127.0.0.1
  if (!(/^https:\/\/[a-z0-9.-]+$/i.test(base) || /^http:\/\/127\.0\.0\.1:\d+$/.test(base)) || !key) {
    throw new Error('SUPABASE_URL (https://...) and SUPABASE_SECRET_KEY must be set for LEAD_STORE=supabase');
  }
  // New-style secret keys go in the apikey header only. Older JWT keys also go in Authorization.
  const headers = (extra = {}) => ({
    apikey: key,
    ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
    'Content-Type': 'application/json',
    ...extra,
  });
  const call = async (pathAndQuery, init, what) => {
    const r = await fetch(`${base}/rest/v1/${pathAndQuery}`, { ...init, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`supabase ${what} ${r.status}`);
    return r;
  };
  return {
    name: 'supabase',
    async insert(lead) {
      const r = await call(TABLE, { method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(lead) }, 'insert');
      const data = await r.json();
      return Array.isArray(data) ? data[0] : data;
    },
    async update(id, patch) {
      if (!UUID_RE.test(id)) throw new Error('bad id');
      await call(`${TABLE}?id=eq.${id}`, { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(patch) }, 'update');
      return null;
    },
    async countSince(field, value, sinceIso) {
      if (!COUNT_FIELDS.has(field)) throw new Error('bad count field');
      const q = `${TABLE}?select=id&${field}=eq.${encodeURIComponent(value)}&created_at=gte.${encodeURIComponent(sinceIso)}`;
      const r = await call(q, { method: 'HEAD', headers: headers({ Prefer: 'count=exact', Range: '0-0' }) }, 'count');
      const n = parseInt(String(r.headers.get('content-range') || '').split('/')[1], 10);
      if (!Number.isFinite(n)) throw new Error('supabase count unreadable');
      return n;
    },
    async list({ limit, offset }) {
      const q = `${TABLE}?select=${LIST_COLUMNS.join(',')}&order=created_at.desc&limit=${limit}&offset=${offset}`;
      const r = await call(q, { headers: headers({ Prefer: 'count=exact' }) }, 'list');
      const total = parseInt(String(r.headers.get('content-range') || '').split('/')[1], 10);
      return { total: Number.isFinite(total) ? total : null, rows: (await r.json()).map(pickList) };
    },
  };
}

let current = null;

function storeName() {
  const s = String(process.env.LEAD_STORE || '').trim().toLowerCase();
  if (['supabase', 'memory', 'file'].includes(s)) return s;
  return process.env.VERCEL ? 'supabase' : 'memory';
}

function getStore() {
  if (current) return current;
  const name = storeName();
  current = name === 'supabase' ? supabaseDriver() : name === 'file' ? fileDriver() : memoryDriver();
  return current;
}

/** Tests swap in a fresh store. */
function setStore(store) {
  current = store;
}

module.exports = { getStore, setStore, memoryDriver, fileDriver, supabaseDriver, storeName, LIST_COLUMNS };
