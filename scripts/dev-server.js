#!/usr/bin/env node
'use strict';
/**
 * Runs the whole quiz on your computer, the same way Vercel will: public/ as pages, api/ as functions.
 * Reads .env.local if you made one. Defaults: leads kept in memory, emails printed here instead of sent.
 *   npm run dev   ->  http://localhost:3939
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const API = path.join(ROOT, 'api');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const HEADERS = require('../vercel.json').headers[0].headers;

function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

function serveStatic(res, pathname) {
  let file = path.normalize(path.join(PUBLIC, pathname));
  if (!file.startsWith(PUBLIC)) { res.statusCode = 403; return res.end('forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  return fs.createReadStream(file).pipe(res);
}

function createServer() {
  return http.createServer(async (req, res) => {
    HEADERS.forEach((h) => res.setHeader(h.key, h.value));
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.statusCode = 400;
      return res.end('bad url');
    }
    if (!pathname.startsWith('/api/')) return serveStatic(res, pathname);
    const file = path.normalize(path.join(API, `${pathname.slice(5).replace(/\/$/, '')}.js`));
    if (!file.startsWith(API) || !fs.existsSync(file)) { res.statusCode = 404; return res.end('{"error":"no such function"}'); }
    try {
      await require(file)(req, res);
    } catch (e) {
      process.stderr.write(`handler error: ${e.stack}\n`);
      if (!res.headersSent) { res.statusCode = 500; res.end('{"error":"handler crashed"}'); }
    }
    return undefined;
  });
}

if (require.main === module) {
  loadEnvLocal();
  const port = Number(process.env.PORT) || 3939;
  const { storeName } = require('../lib/store');
  const { driverName } = require('../lib/email');
  createServer().listen(port, '127.0.0.1', () => {
    process.stdout.write(`READY  http://localhost:${port}\n       leads: ${storeName()}  ·  email: ${driverName()}  ·  admin: http://localhost:${port}/admin/\n`);
  });
}

module.exports = { createServer };
