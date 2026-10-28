'use strict';
/** Loads quiz.config.json and style.json once per server instance. Motif: quiz config, then style.json, then analog. */
const { loadQuiz, publicQuiz } = require('./quiz');
const { loadStyle, resolveMotif, fontsHref } = require('./style');

let cached = null;

function site() {
  if (cached) return cached;
  const quiz = loadQuiz();
  const style = loadStyle();
  const motif = resolveMotif(quiz.motif, style);
  cached = { quiz, style, motif, publicQuiz: publicQuiz(quiz) };
  return cached;
}

/** The look the quiz page needs: motif, validated colours and the fonts link. No lines, no owner details. */
function publicLook() {
  const { style, motif } = site();
  return { motif, palette: style.palette, fonts: style.fonts, fontsHref: fontsHref(style, motif) };
}

function resetSite() {
  cached = null;
}

module.exports = { site, publicLook, resetSite };
