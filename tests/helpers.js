'use strict';
/* Shared test setup: local drivers only, no network, no real keys. */
process.env.LEAD_STORE = 'memory';
process.env.EMAIL_DRIVER = 'console';
process.env.QUIET_EMAIL = '1';
process.env.ADMIN_TOKEN = 'test-admin-token-0123456789-abcdefghijklmnop';
process.env.SITE_ORIGIN = 'https://quiz.example.com';
delete process.env.VERCEL;

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const quizConfig = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'quiz.config.json'), 'utf8'));
const allAnswers = (quiz, pick = 0) => Object.fromEntries(quiz.questions.map((q) => [q.id, Math.min(pick, q.options.length - 1)]));

module.exports = { ROOT, quizConfig, allAnswers, ADMIN_TOKEN: process.env.ADMIN_TOKEN };
