'use strict';
/**
 * The quiz engine. Pure functions, no network, no files except loadQuiz().
 *
 *   quiz.config.json  ->  validateQuiz()  ->  publicQuiz()      (what the browser sees: no points)
 *                                          ->  validateAnswers() (what the browser sent back)
 *                                          ->  score()           (total, percent, band, receipt lines)
 *
 * Scoring is neutral on purpose: every option carries 0 or more points, the total becomes a
 * percentage of the highest possible total, and the percentage picks a band. Bands are set in
 * percent so adding or removing a question never breaks them.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'quiz.config.json');

const LIMITS = { title: 120, intro: 400, question: 240, option: 140, bandText: 1200, label: 40, id: 32, questions: 30, options: 8, points: 100 };
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const HTTPS_RE = /^https:\/\/[^\s"'<>]+$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Throws an Error naming the first problem, in plain words. Returns the quiz unchanged. */
function validateQuiz(q) {
  const fail = (msg) => { throw new Error(`quiz.config.json: ${msg}`); };
  if (!q || typeof q !== 'object' || Array.isArray(q)) fail('the file must hold one { } object');
  if (!str(q.title) || q.title.length > LIMITS.title) fail(`"title" is missing or longer than ${LIMITS.title} characters`);
  if (q.intro !== undefined && (typeof q.intro !== 'string' || q.intro.length > LIMITS.intro)) fail(`"intro" must be text under ${LIMITS.intro} characters`);
  if (!Array.isArray(q.questions) || q.questions.length < 1 || q.questions.length > LIMITS.questions) fail(`"questions" needs 1 to ${LIMITS.questions} questions`);

  const seen = new Set();
  for (const [i, item] of q.questions.entries()) {
    const where = `question ${i + 1}`;
    if (!item || typeof item !== 'object') fail(`${where} is not an object`);
    if (!ID_RE.test(item.id || '')) fail(`${where}: "id" must be short lowercase letters, numbers, - or _ (like "q1")`);
    if (seen.has(item.id)) fail(`${where}: the id "${item.id}" is used twice`);
    seen.add(item.id);
    if (!str(item.text) || item.text.length > LIMITS.question) fail(`${where}: "text" is missing or longer than ${LIMITS.question} characters`);
    if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > LIMITS.options) fail(`${where}: needs 2 to ${LIMITS.options} options`);
    for (const [j, o] of item.options.entries()) {
      if (!o || !str(o.label) || o.label.length > LIMITS.option) fail(`${where}, option ${j + 1}: "label" is missing or too long`);
      if (!Number.isInteger(o.points) || o.points < 0 || o.points > LIMITS.points) fail(`${where}, option ${j + 1}: "points" must be a whole number from 0 to ${LIMITS.points}`);
    }
  }
  if (maxScore(q) < 1) fail('every option scores 0, so there is nothing to score. Give some options points.');

  if (!Array.isArray(q.bands) || q.bands.length < 1 || q.bands.length > 6) fail('"bands" needs 1 to 6 result tiers');
  const sorted = [...q.bands].sort((a, b) => a.min - b.min);
  let expect = 0;
  for (const b of sorted) {
    const where = `band "${(b && b.id) || '?'}"`;
    if (!b || !ID_RE.test(b.id || '')) fail(`${where}: "id" must be short lowercase letters, numbers, - or _`);
    if (!Number.isInteger(b.min) || !Number.isInteger(b.max) || b.min > b.max) fail(`${where}: "min" and "max" must be whole percentages with min <= max`);
    if (b.min !== expect) fail(`${where}: starts at ${b.min}% but the tier before ends at ${expect - 1}%. Tiers must cover 0 to 100 with no gaps or overlaps.`);
    for (const k of ['title', 'body', 'next']) {
      if (typeof b[k] !== 'string' || b[k].length > LIMITS.bandText) fail(`${where}: "${k}" must be text under ${LIMITS.bandText} characters`);
    }
    if (!str(b.title)) fail(`${where}: "title" is empty`);
    if (b.label !== undefined && (typeof b.label !== 'string' || b.label.length > LIMITS.label)) fail(`${where}: "label" must be short text`);
    expect = b.max + 1;
  }
  if (expect !== 101) fail(`the last tier ends at ${expect - 1}%. It must end at 100.`);

  const cta = q.cta || {};
  if (str(cta.url) && !HTTPS_RE.test(cta.url)) fail('"cta.url" must start with https:// (or leave it empty)');
  if (str(cta.url) && !str(cta.label)) fail('"cta.label" is empty but "cta.url" is set');
  return q;
}

function maxScore(q) {
  return q.questions.reduce((sum, item) => sum + Math.max(...item.options.map((o) => o.points)), 0);
}

/** What the browser is allowed to see. Points never leave the server. */
function publicQuiz(q) {
  return {
    version: String(q.version || '1'),
    title: q.title,
    intro: q.intro || '',
    questions: q.questions.map((item) => ({ id: item.id, text: item.text, options: item.options.map((o) => o.label) })),
    lead: { button: str(q.lead && q.lead.button) || 'Send me my result', consent_text: str(q.lead && q.lead.consent_text) },
  };
}

/** answers: { q1: 0, q2: 3, ... } option indexes. Exactly the quiz's ids, nothing extra. */
function validateAnswers(q, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'answers must be an object' };
  const keys = Object.keys(raw);
  if (keys.length !== q.questions.length) return { ok: false, error: 'wrong number of answers' };
  const out = {};
  for (const item of q.questions) {
    if (!Object.prototype.hasOwnProperty.call(raw, item.id)) return { ok: false, error: `missing answer: ${item.id}` };
    const v = raw[item.id];
    if (!Number.isInteger(v) || v < 0 || v >= item.options.length) return { ok: false, error: `invalid answer: ${item.id}` };
    out[item.id] = v;
  }
  return { ok: true, answers: out };
}

function bandFor(q, percent) {
  return q.bands.find((b) => percent >= b.min && percent <= b.max) || q.bands[q.bands.length - 1];
}

/** Pure. answers must already be validated. */
function score(q, answers) {
  const max = maxScore(q);
  const lines = q.questions.map((item, i) => {
    const o = item.options[answers[item.id]];
    return { n: i + 1, id: item.id, question: item.text, answer: o.label, points: o.points };
  });
  const total = lines.reduce((s, l) => s + l.points, 0);
  const percent = Math.round((total / max) * 100);
  const b = bandFor(q, percent);
  return {
    total, max, percent, lines,
    band: { id: b.id, label: b.label || '', title: b.title, body: b.body, next: b.next },
  };
}

function loadQuiz(file = CONFIG_PATH) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`quiz.config.json could not be read: ${e.message}`);
  }
  return validateQuiz(raw);
}

module.exports = { validateQuiz, publicQuiz, validateAnswers, score, maxScore, bandFor, loadQuiz, CONFIG_PATH, LIMITS };
