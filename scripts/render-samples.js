#!/usr/bin/env node
'use strict';
/**
 * Renders the result page and the email for a made-up taker, in one motif or all three. No server, no sending.
 *   npm run preview                         -> out/preview/ (all three motifs)
 *   node scripts/render-samples.js --motif cyberpunk --out out/preview --fit
 * Writes result-<motif>.html (the card on a page) and email-<motif>.html (the full email).
 */
const fs = require('fs');
const path = require('path');
const { loadQuiz, score } = require('../lib/quiz');
const { loadStyle, MOTIFS, resolveMotif } = require('../lib/style');
const { renderPreviewPage, renderEmail } = require('../lib/render');

const SAMPLE_TAKER = { firstName: 'Juniper', answers: [2, 1, 2, 3, 1, 2] };

function args(argv) {
  const out = { motif: null, out: path.join('out', 'preview'), fit: false, style: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--motif') out.motif = argv[++i];
    else if (argv[i] === '--out') out.out = argv[++i];
    else if (argv[i] === '--style') out.style = argv[++i];
    else if (argv[i] === '--fit') out.fit = true;
  }
  return out;
}

function sampleData(quiz) {
  const answers = Object.fromEntries(quiz.questions.map((q, i) => [q.id, Math.min(SAMPLE_TAKER.answers[i % SAMPLE_TAKER.answers.length], q.options.length - 1)]));
  return { quizTitle: quiz.title, firstName: SAMPLE_TAKER.firstName, date: '2026-10-28', result: score(quiz, answers), cta: quiz.cta };
}

function main() {
  const a = args(process.argv.slice(2));
  const quiz = loadQuiz();
  const style = loadStyle(a.style ? { explicit: a.style } : {});
  const data = sampleData(quiz);
  const motifs = a.motif ? [resolveMotif(a.motif, style)] : MOTIFS;
  fs.mkdirSync(a.out, { recursive: true });
  for (const m of motifs) {
    fs.writeFileSync(path.join(a.out, `result-${m}.html`), renderPreviewPage(data, style, m, { fit: a.fit }));
    fs.writeFileSync(path.join(a.out, `email-${m}.html`), renderEmail(data, style, m, quiz.email).html);
  }
  process.stdout.write(`Previews written to ${a.out}/ (${motifs.join(', ')}). Open result-${motifs[0]}.html in your browser.\n`);
}

if (require.main === module) main();

module.exports = { sampleData };
