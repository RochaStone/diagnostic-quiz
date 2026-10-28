'use strict';
/**
 * style.json: the one file that holds her look, shared by every Rocha Coded tool.
 *
 * Fallback order: ./style.json (the project folder) -> ~/.rocha-coded/style.json -> examples/style.rocha-coded.json.
 * Inheritance rule: a user's file borrows ONLY missing or invalid palette and font entries from the bundled
 * example. Lines, owner, handle, name, references and notes never fall back to the example's.
 * Every colour and font name is validated here, so nothing unchecked reaches a page or an email.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STYLE_EXAMPLE = path.join(ROOT, 'examples', 'style.rocha-coded.json');
const MOTIFS = ['analog', 'cyberpunk', 'y2k-blog'];
// Older motif names from the shared schema map to the nearest family.
const MOTIF_ALIASES = {
  'guest-check': 'analog', 'front-page': 'analog', 'magazine-scrawl': 'analog', 'pink-paper': 'analog',
  rotary: 'analog', leopard: 'analog', neutral: 'analog', 'retro-tv': 'cyberpunk',
  'sticker-collage': 'y2k-blog', y2k: 'y2k-blog', blog: 'y2k-blog',
};
const COLOUR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONT_RE = /^[A-Za-z0-9 ]{1,40}$/;
const PALETTE_KEYS = ['hero', 'accent', 'paper', 'paper_pink', 'ink', 'marker', 'plum', 'wine', 'gold', 'cool'];
const FONT_KEYS = ['masthead', 'label', 'body', 'scrawl', 'script', 'mono', 'pixel'];
const LINE_KEYS = ['masthead', 'headline', 'scrawl', 'todo', 'stamp', 'celebrate', 'affirm', 'invite', 'magazine'];
const HOUSE_PIXEL_FONT = 'Silkscreen';
const TEXT_MAX = 120;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function exampleStyle() {
  try {
    return readJson(STYLE_EXAMPLE);
  } catch (e) {
    throw new Error(`The bundled example style is missing or broken (${e.message}). Re-download the tool.`);
  }
}

/** First style file that exists, in the shared order. */
function findStyle({ explicit, cwd = ROOT, home = os.homedir() } = {}) {
  const candidates = [explicit, path.join(cwd, 'style.json'), path.join(home, '.rocha-coded', 'style.json')].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || STYLE_EXAMPLE;
}

const text = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, TEXT_MAX) : '');

/**
 * Merge a user's style over the example under the inheritance rule. Pure.
 * isExample: true only when the whole bundled example is in use (her lines may then appear).
 */
function inheritStyle(user, example, isExample = false) {
  const u = user && typeof user === 'object' && !Array.isArray(user) ? user : {};
  const ex = example || {};
  const pick = (group, keys, valid) => {
    const mine = u[group] && typeof u[group] === 'object' ? u[group] : {};
    const base = ex[group] && typeof ex[group] === 'object' ? ex[group] : {};
    const out = {};
    for (const k of keys) {
      const m = typeof mine[k] === 'string' ? mine[k].trim() : '';
      const b = typeof base[k] === 'string' ? base[k].trim() : '';
      if (valid(m)) out[k] = m;
      else if (valid(b)) out[k] = b;
    }
    return out;
  };
  const lines = {};
  const srcLines = u.lines && typeof u.lines === 'object' ? u.lines : {};
  for (const k of LINE_KEYS) lines[k] = text(srcLines[k]);
  return {
    isExample,
    name: text(u.name),
    owner: text(u.owner),
    handle: text(u.handle),
    site: text(u.site),
    motif: text(u.motif).toLowerCase(),
    palette: pick('palette', PALETTE_KEYS, (v) => COLOUR_RE.test(v)),
    fonts: pick('fonts', FONT_KEYS, (v) => FONT_RE.test(v)),
    lines,
  };
}

/** Load and resolve. Returns the safe, merged style the renderers use. */
function loadStyle(opts = {}) {
  const file = findStyle(opts);
  const example = exampleStyle();
  if (path.resolve(file) === path.resolve(STYLE_EXAMPLE)) return { ...inheritStyle(example, example, true), source: 'example' };
  let user;
  try {
    user = readJson(file);
  } catch (e) {
    process.stderr.write(`Could not read ${file} (${e.message}). Using the bundled example look.\n`);
    return { ...inheritStyle(example, example, true), source: 'example' };
  }
  return { ...inheritStyle(user, example, false), source: file };
}

/** requested (--motif or quiz config) wins, then style.json motif, then analog. Old names map to a family. */
function resolveMotif(requested, style) {
  const raw = String(requested || (style && style.motif) || 'analog').trim().toLowerCase();
  const m = MOTIF_ALIASES[raw] || raw;
  return MOTIFS.includes(m) ? m : 'analog';
}

/** Google Fonts stylesheet URL for the families a page needs. Names are already validated. */
function fontsHref(style, motif) {
  const f = style.fonts || {};
  const fams = new Set([f.masthead, f.label, f.mono, f.scrawl].filter(Boolean));
  if (motif !== 'analog') fams.add(f.pixel || HOUSE_PIXEL_FONT);
  if (!fams.size) return '';
  const q = [...fams].map((n) => `family=${n.replace(/ /g, '+')}${n === f.masthead ? ':wght@400;900' : ''}`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

module.exports = {
  findStyle, loadStyle, inheritStyle, resolveMotif, fontsHref, exampleStyle,
  MOTIFS, MOTIF_ALIASES, COLOUR_RE, FONT_RE, STYLE_EXAMPLE, HOUSE_PIXEL_FONT, PALETTE_KEYS, FONT_KEYS, LINE_KEYS,
};
