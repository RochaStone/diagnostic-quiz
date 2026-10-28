'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ROOT } = require('./helpers');
const { findStyle, loadStyle, inheritStyle, exampleStyle, resolveMotif, STYLE_EXAMPLE } = require('../lib/style');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dq-style-'));
}

test('fallback order: ./style.json, then ~/.rocha-coded/style.json, then the bundled example', () => {
  const cwd = tmpdir();
  const home = tmpdir();
  assert.equal(findStyle({ cwd, home }), STYLE_EXAMPLE);
  fs.mkdirSync(path.join(home, '.rocha-coded'));
  fs.writeFileSync(path.join(home, '.rocha-coded', 'style.json'), '{"owner":"Home"}');
  assert.equal(findStyle({ cwd, home }), path.join(home, '.rocha-coded', 'style.json'));
  fs.writeFileSync(path.join(cwd, 'style.json'), '{"owner":"Here"}');
  assert.equal(findStyle({ cwd, home }), path.join(cwd, 'style.json'));
  assert.equal(loadStyle({ cwd, home }).owner, 'Here');
});

test('inheritance: a user file borrows only palette and fonts, never lines, owner, handle or name', () => {
  const s = inheritStyle({ palette: { hero: '#000000' }, lines: { stamp: 'MINE' } }, exampleStyle());
  const ex = exampleStyle();
  assert.equal(s.palette.hero, '#000000');
  assert.equal(s.palette.gold, ex.palette.gold, 'missing palette entry borrows');
  assert.equal(s.fonts.masthead, ex.fonts.masthead, 'missing font borrows');
  assert.equal(s.lines.stamp, 'MINE');
  assert.equal(s.lines.scrawl, '', 'missing line stays blank');
  assert.equal(s.owner, '');
  assert.equal(s.handle, '');
  assert.equal(s.name, '');
  assert.equal(s.isExample, false);
});

test('bad colours and font names are refused and the example value used instead', () => {
  const ex = exampleStyle();
  const s = inheritStyle({ palette: { hero: 'red;}</style><script>', ink: '#12345' }, fonts: { masthead: "Evil'; } body{" } }, ex);
  assert.equal(s.palette.hero, ex.palette.hero);
  assert.equal(s.palette.ink, ex.palette.ink);
  assert.equal(s.fonts.masthead, ex.fonts.masthead);
});

test('a broken style.json falls back to the bundled example look', () => {
  const cwd = tmpdir();
  fs.writeFileSync(path.join(cwd, 'style.json'), '{ not json');
  const write = process.stderr.write;
  process.stderr.write = () => true;
  try {
    assert.equal(loadStyle({ cwd, home: tmpdir() }).source, 'example');
  } finally {
    process.stderr.write = write;
  }
});

test('motif: requested wins, then style.json, then analog; old names map to a family', () => {
  assert.equal(resolveMotif('cyberpunk', { motif: 'analog' }), 'cyberpunk');
  assert.equal(resolveMotif('', { motif: 'y2k-blog' }), 'y2k-blog');
  assert.equal(resolveMotif('', {}), 'analog');
  assert.equal(resolveMotif('retro-tv', {}), 'cyberpunk');
  assert.equal(resolveMotif('guest-check', {}), 'analog');
  assert.equal(resolveMotif('sticker-collage', {}), 'y2k-blog');
  assert.equal(resolveMotif('nonsense', {}), 'analog');
});

test('both bundled style files share the same keys', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort();
  const blank = JSON.parse(fs.readFileSync(path.join(ROOT, 'style.example.json'), 'utf8'));
  assert.deepEqual(keys(blank), keys(exampleStyle()));
});
