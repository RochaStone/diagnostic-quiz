#!/usr/bin/env node
'use strict';
/** Checks quiz.config.json and style.json. Prints QUIZ OK, or the first problem in plain words. Also the Vercel build step. */
const { loadQuiz, maxScore } = require('../lib/quiz');
const { loadStyle, resolveMotif } = require('../lib/style');

try {
  const quiz = loadQuiz();
  const style = loadStyle();
  const motif = resolveMotif(quiz.motif, style);
  const placeholders = JSON.stringify(quiz).split('YOUR WORDS HERE').length - 1;
  process.stdout.write(`QUIZ OK  "${quiz.title}"  ${quiz.questions.length} questions, top score ${maxScore(quiz)}, ${quiz.bands.length} tiers, motif ${motif}\n`);
  process.stdout.write(`style: ${style.source === 'example' ? 'the bundled example (Rocha Coded)' : style.source}\n`);
  if (placeholders) process.stdout.write(`note: "YOUR WORDS HERE" still appears ${placeholders} time(s). Replace it before you share the quiz.\n`);
} catch (e) {
  process.stderr.write(`${e.message}\n`);
  process.exit(1);
}
