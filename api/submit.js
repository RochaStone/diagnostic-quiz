'use strict';
/**
 * POST /api/submit: answers + first name + email in, result out.
 * Order: origin -> burst limit -> size + shape -> lead fields -> answers -> daily limits -> score -> SAVE -> email.
 * The lead is saved before the email is tried, so a slow or failed email never loses a lead.
 */
const { readJson, json, methodNotAllowed, clientIp, hashIp, cors } = require('../lib/http');
const { validateAnswers, score } = require('../lib/quiz');
const { validateLead } = require('../lib/lead');
const { memoryLimit, LIMITS } = require('../lib/ratelimit');
const { getStore } = require('../lib/store');
const { sendEmail } = require('../lib/email');
const { renderCard, renderEmail } = require('../lib/render');
const { site } = require('../lib/site');

const DAY_MS = 24 * 60 * 60 * 1000;

function today() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST, OPTIONS');

  const ipHash = hashIp(clientIp(req));
  if (memoryLimit(`submit:${ipHash}`, LIMITS.burstPerMinute, 60 * 1000)) return json(res, 429, { error: 'A few too many tries. Wait a minute and send it again.' });

  const parsed = await readJson(req);
  if (!parsed.ok) return json(res, parsed.status, { error: parsed.error });

  const checked = validateLead(parsed.body);
  if (!checked.ok) return json(res, checked.status || 400, { error: checked.error, field: checked.field });
  if (checked.bot) return json(res, 200, { ok: true });

  let ctx;
  try {
    ctx = site();
  } catch (e) {
    process.stderr.write(`submit: ${e.message}\n`);
    return json(res, 500, { error: 'The quiz is not set up yet.' });
  }
  const { quiz, style, motif } = ctx;

  const answers = validateAnswers(quiz, parsed.body.answers);
  if (!answers.ok) return json(res, 400, { error: 'Some answers are missing. Go back and answer every question.' });

  const store = getStore();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  try {
    const [byEmail, byIp] = await Promise.all([
      store.countSince('email', checked.lead.email, since),
      store.countSince('ip_hash', ipHash, since),
    ]);
    if (byEmail >= LIMITS.perEmailDay || byIp >= LIMITS.perIpDay) {
      return json(res, 429, { error: 'This quiz has been taken a lot from here today. Try again tomorrow.' });
    }
  } catch (e) {
    process.stderr.write(`submit: rate check failed: ${e.message}\n`);
    return json(res, 503, { error: 'We could not save your result right now. Try again in a moment.' });
  }

  const result = score(quiz, answers.answers);
  const { lead } = checked;
  let saved;
  try {
    saved = await store.insert({
      quiz_version: String(quiz.version || '1'),
      first_name: lead.firstName,
      email: lead.email,
      answers: answers.answers,
      score: result.total,
      max_score: result.max,
      percent: result.percent,
      band: result.band.id,
      marketing_consent: lead.marketingConsent,
      consent_text: lead.marketingConsent ? String((quiz.lead && quiz.lead.consent_text) || '').slice(0, 500) : null,
      consented_at: lead.marketingConsent ? new Date().toISOString() : null,
      ip_hash: ipHash,
    });
  } catch (e) {
    process.stderr.write(`submit: save failed: ${e.message}\n`);
    return json(res, 503, { error: 'We could not save your result right now. Try again in a moment.' });
  }

  const data = { quizTitle: quiz.title, firstName: lead.firstName, date: today(), result, cta: quiz.cta };
  const mail = renderEmail(data, style, motif, quiz.email);
  const sent = await sendEmail({ to: lead.email, subject: mail.subject, html: mail.html, text: mail.text });
  if (!sent.ok) process.stderr.write(`submit: email not sent: ${sent.reason}\n`);
  try {
    await store.update(saved.id, { email_status: sent.ok ? 'sent' : 'failed' });
  } catch (e) {
    process.stderr.write(`submit: could not record email status: ${e.message}\n`);
  }

  return json(res, 200, {
    ok: true,
    emailed: sent.ok,
    result: { total: result.total, max: result.max, percent: result.percent, band: result.band },
    card_html: renderCard(data, style, motif),
  });
};
