'use strict';
/** GET /api/quiz: the questions and option labels (never the points), plus the look. */
const { json, methodNotAllowed, cors } = require('../lib/http');
const { site, publicLook } = require('../lib/site');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET, OPTIONS');
  try {
    return json(res, 200, { quiz: site().publicQuiz, look: publicLook() });
  } catch (e) {
    process.stderr.write(`quiz: ${e.message}\n`);
    return json(res, 500, { error: 'The quiz is not set up yet.' });
  }
};
