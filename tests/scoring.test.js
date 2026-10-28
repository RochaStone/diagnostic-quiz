'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { quizConfig, allAnswers } = require('./helpers');
const { validateQuiz, publicQuiz, validateAnswers, score, maxScore } = require('../lib/quiz');

test('the shipped sample config is valid: 6 questions, 3 tiers, top score 18', () => {
  const q = validateQuiz(quizConfig());
  assert.equal(q.questions.length, 6);
  assert.equal(q.bands.length, 3);
  assert.equal(maxScore(q), 18);
});

test('the sample tiers hold placeholder copy only, never invented result text', () => {
  for (const b of quizConfig().bands) {
    for (const k of ['title', 'body', 'next']) assert.equal(b[k], 'YOUR WORDS HERE');
  }
});

test('score is pure: lowest, highest and middle answers land in the right tiers', () => {
  const q = quizConfig();
  const low = score(q, allAnswers(q, 0));
  assert.deepEqual([low.total, low.percent, low.band.id], [0, 0, 'tier-1']);
  const high = score(q, allAnswers(q, 3));
  assert.deepEqual([high.total, high.percent, high.band.id], [18, 100, 'tier-3']);
  const mid = score(q, allAnswers(q, 2));
  assert.deepEqual([mid.total, mid.percent, mid.band.id], [12, 67, 'tier-2']);
  assert.deepEqual(score(q, allAnswers(q, 2)), mid, 'same input, same output');
});

test('tier edges: 39% is tier 1, 40% is tier 2, 74% is tier 2, 75% is tier 3', () => {
  const q = { title: 'T', questions: [{ id: 'q1', text: 'x', options: Array.from({ length: 8 }, (_, i) => ({ label: `o${i}`, points: [0, 39, 40, 74, 75, 100, 1, 2][i] })) }],
    bands: quizConfig().bands };
  validateQuiz(q);
  const at = (idx) => score(q, { q1: idx }).band.id;
  assert.equal(at(1), 'tier-1');
  assert.equal(at(2), 'tier-2');
  assert.equal(at(3), 'tier-2');
  assert.equal(at(4), 'tier-3');
});

test('receipt lines carry the question, the chosen answer and its points', () => {
  const q = quizConfig();
  const r = score(q, allAnswers(q, 1));
  assert.equal(r.lines.length, 6);
  assert.deepEqual(r.lines[0], { n: 1, id: 'q1', question: q.questions[0].text, answer: q.questions[0].options[1].label, points: 1 });
});

test('publicQuiz never sends points to the browser', () => {
  const pub = JSON.stringify(publicQuiz(quizConfig()));
  assert.ok(!pub.includes('points'));
  assert.ok(!pub.includes('bands'));
});

test('config validation names the problem in plain words', () => {
  const bad = (mutate, re) => {
    const q = quizConfig();
    mutate(q);
    assert.throws(() => validateQuiz(q), re);
  };
  bad((q) => { q.bands[1].min = 45; }, /gaps or overlaps/);
  bad((q) => { q.bands[2].max = 99; }, /must end at 100/);
  bad((q) => { q.questions[1].id = 'q1'; }, /used twice/);
  bad((q) => { q.questions[0].options[0].points = -1; }, /whole number/);
  bad((q) => { q.questions[0].options[0].points = 1.5; }, /whole number/);
  bad((q) => { q.questions[0].options = [{ label: 'only one', points: 1 }]; }, /2 to 8 options/);
  bad((q) => { q.questions.forEach((x) => x.options.forEach((o) => { o.points = 0; })); }, /nothing to score/);
  bad((q) => { q.cta = { label: 'Go', url: 'javascript:alert(1)' }; }, /https/);
  bad((q) => { q.title = ''; }, /title/);
});

test('validateAnswers: exact ids, integer indexes in range, nothing extra', () => {
  const q = quizConfig();
  assert.equal(validateAnswers(q, allAnswers(q, 3)).ok, true);
  const missing = allAnswers(q); delete missing.q6;
  assert.equal(validateAnswers(q, missing).ok, false);
  assert.equal(validateAnswers(q, { ...allAnswers(q), q7: 1 }).ok, false);
  assert.equal(validateAnswers(q, { ...allAnswers(q), q1: 4 }).ok, false);
  assert.equal(validateAnswers(q, { ...allAnswers(q), q1: -1 }).ok, false);
  assert.equal(validateAnswers(q, { ...allAnswers(q), q1: '1' }).ok, false);
  assert.equal(validateAnswers(q, { ...allAnswers(q), q1: 1.5 }).ok, false);
  assert.equal(validateAnswers(q, null).ok, false);
  assert.equal(validateAnswers(q, [1, 2]).ok, false);
  const proto = JSON.parse('{"__proto__": 1, "q1":0,"q2":0,"q3":0,"q4":0,"q5":0}');
  assert.equal(validateAnswers(q, proto).ok, false);
});
