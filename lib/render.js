'use strict';
/**
 * One render path. renderCard() draws the same result in three motif families:
 *   analog     a result receipt on blush paper (paper you could hold)
 *   cyberpunk  the girly terminal: plum CRT, block bar, pink block cursor
 *   y2k-blog   a 2003 blog window: title bar, sidebar, mood, hit counter
 * The card is table-based HTML with inline styles, so the SAME markup goes into the email and the result page.
 * Every piece of text is escaped here. Colours and font names arrive validated from lib/style.js.
 */
const { resolveMotif, fontsHref, HOUSE_PIXEL_FONT } = require('./style');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, w = 2) => String(n).padStart(w, '0');
// Font names are validated to letters, numbers and spaces, so they are safe inside a quoted CSS string.
const stack = (name, fallback) => (name ? `'${name}', ${fallback}` : fallback);

function tokens(style) {
  const p = style.palette || {};
  const f = style.fonts || {};
  return {
    ground: p.hero || '#50163C', wine: p.wine || '#682047', ink: p.ink || '#3B1230', cream: p.paper || '#FFF7F4',
    blush: p.paper_pink || '#FFE3F1', candy: p.accent || '#FE9DCA', marker: p.marker || '#C2246E',
    plum: p.plum || p.hero || '#50163C', gold: p.gold || '#E9B949',
    serif: stack(f.masthead, `Georgia, 'Times New Roman', serif`),
    body: stack(f.body, `Georgia, serif`),
    label: stack(f.label, `'Helvetica Neue', Arial, sans-serif`),
    mono: stack(f.mono, `'Courier New', Courier, monospace`),
    scrawl: stack(f.scrawl, `'Marker Felt', 'Comic Sans MS', cursive`),
    pixel: stack(f.pixel || HOUSE_PIXEL_FONT, `'Courier New', monospace`),
  };
}

/** Prompt host for the terminal: her handle, else a neutral word. Never borrowed from the example. */
function promptHost(style) {
  const h = String(style.handle || '').replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 24);
  return h || 'quiz';
}

function ctaButton(cta, bg, fg, font, border) {
  if (!cta || !cta.url || !cta.label) return '';
  return `<tr><td align="center" style="padding:18px 0 4px;"><a href="${esc(cta.url)}" style="display:inline-block;background:${bg};color:${fg};border:2px solid ${border};font:800 15px/1.3 ${font};padding:12px 20px;text-decoration:none;">${esc(cta.label)}</a></td></tr>`;
}

function analog(d, t, style) {
  const r = d.result;
  const lines = r.lines.map((l) => `<tr>
<td valign="top" style="padding:7px 8px 7px 0;font:13px/1.4 ${t.mono};color:${t.ink};width:28px;">${pad(l.n)}</td>
<td valign="top" style="padding:7px 0;font:600 13px/1.4 ${t.label};color:${t.ink};">${esc(l.question)}<br><span style="font:400 13px/1.4 ${t.mono};">${esc(l.answer)}</span></td>
<td valign="top" align="right" style="padding:7px 0 7px 8px;font:13px/1.4 ${t.mono};color:${t.ink};white-space:nowrap;">${l.points} pts</td></tr>`).join('');
  const scrawl = style.lines.scrawl ? `<tr><td align="center" style="padding:14px 0 0;font:22px/1.2 ${t.scrawl};color:${t.marker};">${esc(style.lines.scrawl)}</td></tr>` : '';
  const stamp = style.lines.stamp ? `<span style="display:inline-block;border:2px solid ${t.gold};color:${t.gold};font:900 15px/1 ${t.serif};letter-spacing:2px;padding:6px 10px;margin-left:8px;">${esc(style.lines.stamp)}</span>` : '';
  const who = [style.owner, style.handle].filter(Boolean).map(esc).join(' &middot; ');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="dq-card" data-motif="analog" style="max-width:600px;margin:0 auto;border-collapse:collapse;">
<tr><td style="background:${t.blush};border:2px solid ${t.ink};padding:26px 26px 22px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
<tr><td align="center" style="font:500 13px/1.6 ${t.mono};letter-spacing:3px;color:${t.ink};">RESULT RECEIPT</td></tr>
<tr><td align="center" style="font:12px/1.6 ${t.mono};color:${t.ink};">${esc(d.date)} &middot; for ${esc(d.firstName)}</td></tr>
<tr><td align="center" style="padding:10px 0 12px;font:900 30px/1.05 ${t.serif};color:${t.wine};">${esc(d.quizTitle)}</td></tr>
<tr><td style="border-top:2px solid ${t.gold};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:8px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${lines}</table></td></tr>
<tr><td style="border-top:2px dashed ${t.ink};padding:12px 0 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td style="font:800 15px/1.4 ${t.label};color:${t.ink};">TOTAL</td>
<td align="right" style="font:500 15px/1.4 ${t.mono};color:${t.ink};">${r.total}/${r.max} &middot; ${r.percent}%</td></tr></table></td></tr>
<tr><td style="padding:18px 0 0;"><span style="display:inline-block;background:${t.candy};color:${t.ink};font:800 12px/1 ${t.label};padding:6px 10px;border-radius:999px;">${esc(r.band.label || 'Your result')}</span>${stamp}</td></tr>
<tr><td style="padding:10px 0 6px;font:900 26px/1.1 ${t.serif};color:${t.wine};">${esc(r.band.title)}</td></tr>
<tr><td style="font:400 16px/1.6 ${t.body};color:${t.ink};">${esc(r.band.body)}</td></tr>
<tr><td style="padding:12px 0 0;font:400 16px/1.6 ${t.body};color:${t.ink};"><span style="font:800 13px/1.4 ${t.label};">Your next step:</span> ${esc(r.band.next)}</td></tr>
${ctaButton(d.cta, t.wine, t.cream, t.label, t.wine)}${scrawl}
<tr><td align="center" style="padding:18px 0 4px;font:900 28px/1 ${t.serif};color:${t.wine};">THANK YOU!</td></tr>
${who ? `<tr><td align="center" style="font:12px/1.6 ${t.mono};color:${t.ink};">${who}</td></tr>` : ''}
</table></td></tr></table>`;
}

function cyberpunk(d, t, style) {
  const r = d.result;
  const host = promptHost(style);
  const filled = Math.round((r.percent / 100) * 20);
  const bar = '&#9608;'.repeat(filled) + '&#9617;'.repeat(20 - filled);
  const lines = r.lines.map((l) => `<tr><td style="padding:5px 0;font:13px/1.5 ${t.mono};color:${t.cream};">[${pad(l.n)}] ${esc(l.question)}<br><span style="color:${t.candy};">&gt;</span> ${esc(l.answer)} <span style="color:${t.gold};">+${l.points}</span></td></tr>`).join('');
  const who = [style.owner, style.handle].filter(Boolean).map(esc).join(' &middot; ');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="dq-card" data-motif="cyberpunk" style="max-width:600px;margin:0 auto;border-collapse:collapse;">
<tr><td style="background:${t.wine};border:2px solid ${t.ink};padding:12px;border-radius:14px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td style="font:11px/1 ${t.pixel};color:${t.gold};">&#9679;</td>
<td align="center" style="font:11px/1 ${t.pixel};color:${t.cream};letter-spacing:2px;">RESULT.TERMINAL</td>
<td align="right" style="font:11px/1 ${t.pixel};color:${t.gold};">&#9679;</td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;border-collapse:collapse;"><tr><td style="background-color:${t.plum};background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.035) 0,rgba(255,255,255,0.035) 1px,transparent 1px,transparent 3px);border:2px solid ${t.gold};border-radius:8px;padding:20px 20px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
<tr><td style="font:13px/1.5 ${t.mono};color:${t.cream};"><span style="color:${t.candy};">${esc(host)}:~$</span> ./result --for &quot;${esc(d.firstName)}&quot;</td></tr>
<tr><td style="font:13px/1.5 ${t.mono};color:${t.cream};">&gt; ${esc(d.quizTitle)} &middot; ${esc(d.date)} &middot; answers ok</td></tr>
<tr><td style="padding:10px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${lines}</table></td></tr>
<tr><td style="font:12px/1.4 ${t.pixel};color:${t.candy};letter-spacing:1px;">SCORE</td></tr>
<tr><td style="font:15px/1.4 ${t.mono};color:${t.candy};word-break:break-all;">${bar}</td></tr>
<tr><td style="font:13px/1.5 ${t.mono};color:${t.cream};">${r.total}/${r.max} &middot; ${r.percent}%</td></tr>
<tr><td style="padding:16px 0 4px;font:12px/1.4 ${t.pixel};color:${t.gold};letter-spacing:1px;">RESULT: ${esc(r.band.label || 'YOUR RESULT')}</td></tr>
<tr><td style="font:800 24px/1.15 ${t.label};color:${t.cream};">${esc(r.band.title)}</td></tr>
<tr><td style="padding:8px 0 0;font:400 15px/1.6 ${t.label};color:${t.cream};">${esc(r.band.body)}</td></tr>
<tr><td style="padding:10px 0 0;font:400 15px/1.6 ${t.label};color:${t.cream};"><span style="color:${t.candy};font-family:${t.mono};">next &gt;</span> ${esc(r.band.next)}</td></tr>
${ctaButton(d.cta, t.candy, t.ink, t.label, t.candy)}
<tr><td style="padding:14px 0 0;font:13px/1.5 ${t.mono};color:${t.cream};"><span style="color:${t.candy};">${esc(host)}:~$</span> <span style="color:${t.candy};">&#9612;</span></td></tr>
</table></td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;"><tr>
<td style="font:10px/1.4 ${t.pixel};color:${t.cream};"><span style="color:${t.candy};">&#9679;</span> ON <span style="color:${t.gold};">&#9679;</span> SAVED</td>
<td align="right" style="font:10px/1.4 ${t.mono};color:${t.cream};">${who}</td></tr></table>
</td></tr></table>`;
}

function y2kBlog(d, t, style) {
  const r = d.result;
  const lines = r.lines.map((l) => `<tr><td style="padding:5px 0;font:400 14px/1.5 ${t.label};color:${t.ink};"><span style="color:${t.gold};">&#10023;</span> ${esc(l.question)} <span style="font:13px ${t.mono};color:${t.wine};">${esc(l.answer)} (${l.points})</span></td></tr>`).join('');
  const btn = `<span style="display:inline-block;width:12px;height:12px;background:${t.gold};border:1px solid ${t.ink};margin-left:4px;">&nbsp;</span>`;
  const about = [style.owner, style.handle].filter(Boolean).map(esc).join('<br>') || 'this quiz';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="dq-card" data-motif="y2k-blog" style="max-width:600px;margin:0 auto;border-collapse:collapse;">
<tr><td style="background:${t.cream};border:2px solid ${t.ink};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>
<td style="background:${t.plum};padding:7px 10px;font:12px/1.2 ${t.pixel};color:${t.cream};letter-spacing:1px;">result.exe</td>
<td align="right" style="background:${t.plum};padding:7px 10px;white-space:nowrap;">${btn}${btn}${btn}</td></tr>
<tr><td colspan="2" style="background:${t.blush};border-bottom:2px solid ${t.ink};padding:5px 10px;font:12px/1.4 ${t.mono};color:${t.wine};">&#10023; new result posted &#10023; last updated ${esc(d.date)} &#10023;</td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>
<td class="dq-col" valign="top" width="66%" style="padding:20px 18px;">
<div style="font:900 26px/1.1 ${t.serif};color:${t.wine};">${esc(d.quizTitle)}</div>
<div style="padding:4px 0 14px;font:12px/1.5 ${t.mono};color:${t.ink};">posted for ${esc(d.firstName)} &middot; score ${r.total}/${r.max} &middot; ${r.percent}%</div>
<div style="display:inline-block;background:${t.candy};color:${t.ink};font:800 12px/1 ${t.label};padding:6px 10px;border-radius:999px;">${esc(r.band.label || 'Your result')}</div>
<div style="padding:10px 0 6px;font:900 22px/1.15 ${t.serif};color:${t.ink};">${esc(r.band.title)}</div>
<div style="font:400 15px/1.6 ${t.label};color:${t.ink};">${esc(r.band.body)}</div>
<div style="padding:10px 0 0;font:400 15px/1.6 ${t.label};color:${t.ink};"><b>Your next step:</b> ${esc(r.band.next)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;border-top:1px dashed ${t.wine};">${lines}${ctaButton(d.cta, t.plum, t.cream, t.label, t.ink)}</table>
</td>
<td class="dq-col" valign="top" width="34%" style="background:${t.blush};border-left:2px solid ${t.ink};padding:16px 14px;">
<div style="font:11px/1.4 ${t.pixel};color:${t.wine};letter-spacing:1px;">ABOUT ME</div>
<div style="padding:4px 0 12px;font:13px/1.5 ${t.label};color:${t.ink};">${about}</div>
<div style="font:11px/1.4 ${t.pixel};color:${t.wine};letter-spacing:1px;">MOOD</div>
<div style="padding:4px 0 12px;font:13px/1.5 ${t.label};color:${t.ink};">&#10023; ${esc(r.band.label || 'result day')}</div>
<div style="font:11px/1.4 ${t.pixel};color:${t.wine};letter-spacing:1px;">CURRENTLY READING</div>
<div style="padding:4px 0 14px;font:13px/1.5 ${t.label};color:${t.ink};">${esc(d.quizTitle)}</div>
<div style="background:${t.ink};color:${t.gold};font:13px/1.4 ${t.mono};padding:8px;text-align:center;">you are visitor no.<br><span style="font-size:18px;letter-spacing:2px;">000,777</span></div>
<div style="padding:10px 0 0;text-align:center;color:${t.gold};font-size:16px;">&#9829; &#9733; &#9829;</div>
</td></tr></table>
</td></tr></table>`;
}

const SKINS = { analog, cyberpunk, 'y2k-blog': y2kBlog };

/**
 * data: { quizTitle, firstName, date, result (from lib/quiz score()), cta? }
 * Returns an HTML fragment. Same data, three structures.
 */
function renderCard(data, style, motif) {
  const m = resolveMotif(motif, style);
  return SKINS[m](data, tokens(style), style);
}

/** CSS shared by the page and the email: stack the y2k sidebar on phones. */
const STACK_CSS = '@media (max-width:480px){.dq-col{display:block!important;width:100%!important;box-sizing:border-box;border-left:0!important;}}';

const oneLine = (s, max) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

/** The email: subject, table-based HTML with inline styles, and a plain text twin. */
function renderEmail(data, style, motif, emailCfg = {}) {
  const t = tokens(style);
  const r = data.result;
  const subject = oneLine(String(emailCfg.subject || 'Your result: {band}').replace('{band}', r.band.title), 150);
  const intro = String(emailCfg.intro || '').trim();
  const footer = String(emailCfg.footer || '').trim();
  const card = renderCard(data, style, motif);
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title><style>${STACK_CSS}</style></head>
<body style="margin:0;padding:0;background:${t.ground};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(r.band.title)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${t.ground};"><tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
<tr><td style="padding:0 4px 18px;font:400 16px/1.6 ${t.body};color:${t.cream};">Hi ${esc(data.firstName)},${intro ? `<br>${esc(intro)}` : ''}</td></tr>
<tr><td>${card}</td></tr>
<tr><td style="padding:20px 4px 0;font:12px/1.6 ${t.mono};color:${t.cream};">${footer ? `${esc(footer)}<br>` : ''}You got this email because you took ${esc(data.quizTitle)}.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    `Hi ${data.firstName},`, intro, '',
    `${data.quizTitle}: ${r.total}/${r.max} (${r.percent}%)`,
    `${r.band.label ? `${r.band.label}: ` : ''}${r.band.title}`, r.band.body, '',
    `Your next step: ${r.band.next}`,
    data.cta && data.cta.url ? `${data.cta.label}: ${data.cta.url}` : '', '',
    ...r.lines.map((l) => `${pad(l.n)}. ${l.question} | ${l.answer} (${l.points})`), '',
    footer, `You got this email because you took ${data.quizTitle}.`,
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
  return { subject, html, text };
}

/** A whole standalone page around the card, for previews and README images. fit=true scales it to the window. */
function renderPreviewPage(data, style, motif, { fit = false } = {}) {
  const m = resolveMotif(motif, style);
  const t = tokens(style);
  const href = fontsHref(style, m);
  const fitScript = fit ? `<script>(function(){function f(){var c=document.querySelector('.wrap');var s=Math.min(window.innerWidth/c.offsetWidth,window.innerHeight/c.offsetHeight)*0.94;c.style.zoom=s;}(document.fonts?document.fonts.ready:Promise.resolve()).then(f);})();</script>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(data.quizTitle)}</title>
${href ? `<link rel="stylesheet" href="${esc(href)}">` : ''}
<style>html,body{margin:0;}body{background:${t.ground};min-height:100vh;display:flex;align-items:center;justify-content:center;}.wrap{width:600px;max-width:100%;padding:16px;box-sizing:border-box;}${STACK_CSS}</style></head>
<body><div class="wrap">${renderCard(data, style, m)}</div>${fitScript}</body></html>`;
}

module.exports = { renderCard, renderEmail, renderPreviewPage, esc, tokens, promptHost, STACK_CSS };
