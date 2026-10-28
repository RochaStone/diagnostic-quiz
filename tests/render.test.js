'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { quizConfig, allAnswers } = require('./helpers');
const { score } = require('../lib/quiz');
const { loadStyle, inheritStyle, exampleStyle, MOTIFS } = require('../lib/style');
const { renderCard, renderEmail, renderPreviewPage } = require('../lib/render');

const quiz = quizConfig();
const example = loadStyle({ cwd: '/nonexistent', home: '/nonexistent' });
const data = (over = {}) => ({ quizTitle: quiz.title, firstName: 'Juniper', date: '2026-10-28', result: score(quiz, allAnswers(quiz, 2)), cta: { label: 'Book a call', url: 'https://example.com/book' }, ...over });

const SIGNATURE = { analog: 'RESULT RECEIPT', cyberpunk: ':~$</span> ./result', 'y2k-blog': '000,777' };

for (const m of MOTIFS) {
  test(`${m}: the card carries its signature marker and only its own`, () => {
    const html = renderCard(data(), example, m);
    assert.ok(html.includes(`data-motif="${m}"`));
    assert.ok(html.includes(SIGNATURE[m]), SIGNATURE[m]);
    for (const other of MOTIFS.filter((x) => x !== m)) assert.ok(!html.includes(SIGNATURE[other]), `${m} has ${other} marker`);
  });

  test(`${m}: same data in every motif (score, tier, every answer)`, () => {
    const html = renderCard(data(), example, m);
    assert.ok(html.includes('12/18'));
    assert.ok(html.includes('67%'));
    assert.ok(html.includes('Tier 02'));
    for (const q of quiz.questions) assert.ok(html.includes(q.options[2].label.replace(/'/g, '&#39;')), q.options[2].label);
    assert.ok(html.includes('href="https://example.com/book"'));
  });

  test(`${m}: every piece of text is escaped`, () => {
    const evil = '<img src=x onerror=alert(1)>';
    const r = score(quiz, allAnswers(quiz, 0));
    r.band.title = evil; r.band.body = '"quoted" & <b>'; r.lines[0].question = '<script>x</script>';
    const html = renderCard(data({ firstName: evil, quizTitle: evil, result: r, cta: { label: evil, url: 'https://e.com/"onmouseover="x' } }), { ...example, owner: evil, handle: '@<x>' }, m);
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('"onmouseover="'));
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  });

  test(`${m}: the email is table-based, inline-styled, script-free, with a plain text twin`, () => {
    const mail = renderEmail(data(), example, m, quiz.email);
    assert.ok(mail.html.startsWith('<!doctype html>'));
    assert.ok(mail.html.includes('role="presentation"'));
    assert.ok(!/<script/i.test(mail.html));
    assert.ok(!/<link/i.test(mail.html), 'no external stylesheets in email');
    assert.ok(!/class="[^"]*"[^>]*>/.test(mail.html.replace(/class="dq-(card|col)"/g, '')), 'only the two stacking classes');
    assert.equal(mail.subject, 'Your result: YOUR WORDS HERE');
    assert.ok(mail.text.includes('12/18 (67%)'));
    assert.ok(mail.text.includes('Hi Juniper,'));
  });

  test(`${m}: no glow, no coloured text shadow`, () => {
    const html = renderPreviewPage(data(), example, m) + renderEmail(data(), example, m).html;
    assert.ok(!/text-shadow/i.test(html));
    assert.ok(!/box-shadow/i.test(html));
  });
}

test('the email subject cannot carry a header break', () => {
  const r = score(quiz, allAnswers(quiz, 0));
  r.band.title = 'Hi\r\nBcc: someone@example.com';
  const mail = renderEmail(data({ result: r }), example, 'analog', { subject: 'Result: {band}' });
  assert.ok(!/[\r\n]/.test(mail.subject));
});

test('a user style re-tones every motif and never borrows the example lines', () => {
  const user = inheritStyle({ owner: 'Fern', handle: '@fernhollow', palette: { hero: '#112233', accent: '#00ff88' }, fonts: { masthead: 'Bodoni Moda' } }, exampleStyle());
  for (const m of MOTIFS) {
    const html = renderPreviewPage(data(), user, m);
    assert.ok(html.includes('#112233'), `${m} ground`);
    assert.ok(html.includes('Bodoni'), `${m} font`);
    assert.ok(!html.includes('rocheverse'), `${m} leaks the example handle`);
    assert.ok(!html.includes('LORE'), `${m} leaks the example stamp`);
    assert.ok(!html.includes('build your founder world'), `${m} leaks the example scrawl`);
  }
  assert.ok(renderCard(data(), user, 'cyberpunk').includes('fernhollow:~$'));
  assert.ok(renderCard(data(), inheritStyle({}, exampleStyle()), 'cyberpunk').includes('quiz:~$'));
});

test('the bundled example, in full, shows her stamp and scrawl on the analog receipt', () => {
  const html = renderCard(data(), example, 'analog');
  assert.ok(html.includes('LORE'));
  assert.ok(html.includes('build your founder world'));
});

test('y2k sidebar stacks on phones (390px) through the shared media query', () => {
  const page = renderPreviewPage(data(), example, 'y2k-blog');
  assert.ok(page.includes('@media (max-width:480px){.dq-col{display:block!important'));
  assert.ok((page.match(/class="dq-col"/g) || []).length === 2);
});
