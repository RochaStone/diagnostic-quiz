'use strict';
/* The quiz page. Vanilla JS, no build step. No scoring here: answers go to the server, the result comes back.
   Quiz text is placed with textContent. The only innerHTML is the result card, which the server escaped. */
(function () {
  const app = document.getElementById('app');
  const KEY = 'diagnostic-quiz-progress';
  const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const FONT = /^[A-Za-z0-9 ]{1,40}$/;
  let quiz = null;
  let state = { i: -1, answers: {}, startedAt: null };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object' && saved.answers) state = saved;
    } catch (e) {
      state = { i: -1, answers: {}, startedAt: null }; // private mode or a broken save: start fresh
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { return false; }
    return true;
  }
  function clearSave() {
    try { localStorage.removeItem(KEY); } catch (e) { return false; }
    return true;
  }

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'text') n.textContent = v;
      else if (k === 'on') Object.entries(v).forEach(([ev, fn]) => n.addEventListener(ev, fn));
      else n.setAttribute(k, v);
    });
    (children || []).forEach((c) => c && n.appendChild(c));
    return n;
  }
  function screen(...children) {
    app.replaceChildren(el('div', { class: 'window' }, [el('div', { class: 'bar' }, [
      el('span', { class: 'bar-title', text: 'quiz.exe' }),
      el('span', { class: 'dots' }, [el('i'), el('i'), el('i')]),
    ]), el('div', { class: 'pane' }, children)]));
    const h = app.querySelector('h1, h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  function applyLook(look) {
    document.body.className = `motif-${['analog', 'cyberpunk', 'y2k-blog'].includes(look.motif) ? look.motif : 'analog'}`;
    const map = { hero: '--ground', wine: '--wine', ink: '--ink', paper: '--cream', paper_pink: '--blush', accent: '--candy', marker: '--marker', plum: '--plum', gold: '--gold' };
    Object.entries(map).forEach(([k, v]) => { if (HEX.test(look.palette[k] || '')) document.documentElement.style.setProperty(v, look.palette[k]); });
    const fonts = { masthead: '--serif', label: '--label', mono: '--mono', pixel: '--pixel' };
    Object.entries(fonts).forEach(([k, v]) => { if (FONT.test(look.fonts[k] || '')) document.documentElement.style.setProperty(v, `'${look.fonts[k]}'`); });
    if (typeof look.fontsHref === 'string' && look.fontsHref.startsWith('https://fonts.googleapis.com/')) {
      document.head.appendChild(el('link', { rel: 'stylesheet', href: look.fontsHref }));
    }
  }

  function intro() {
    screen(
      el('p', { class: 'kicker', text: `${quiz.questions.length} questions` }),
      el('h1', { text: quiz.title }),
      quiz.intro ? el('p', { class: 'lede', text: quiz.intro }) : null,
      el('button', { class: 'go', type: 'button', text: state.i >= 0 ? 'Carry on' : 'Start', on: { click: () => {
        if (!state.startedAt) state.startedAt = Date.now();
        state.i = Math.max(0, state.i);
        save(); question();
      } } }),
    );
  }

  function question() {
    const q = quiz.questions[state.i];
    const n = String(state.i + 1).padStart(2, '0');
    const total = String(quiz.questions.length).padStart(2, '0');
    const filled = Math.round(((state.i) / quiz.questions.length) * 12);
    const opts = q.options.map((label, idx) => el('button', {
      class: `opt${state.answers[q.id] === idx ? ' picked' : ''}`, type: 'button', text: label,
      on: { click: () => {
        state.answers[q.id] = idx;
        state.i += 1; save();
        if (state.i >= quiz.questions.length) leadForm(); else question();
      } },
    }));
    screen(
      el('p', { class: 'kicker', text: `${n} / ${total}` }),
      el('p', { class: 'blocks', 'aria-hidden': 'true', text: '█'.repeat(filled) + '░'.repeat(12 - filled) }),
      el('h2', { text: q.text }),
      el('div', { class: 'opts' }, opts),
      state.i > 0 ? el('button', { class: 'back', type: 'button', text: 'Back', on: { click: () => { state.i -= 1; save(); question(); } } }) : null,
    );
  }

  function leadForm(errorText, field) {
    const err = el('p', { class: 'err', role: 'alert', text: errorText || '' });
    const name = el('input', { id: 'first_name', name: 'first_name', autocomplete: 'given-name', maxlength: '60', required: '' });
    const email = el('input', { id: 'email', name: 'email', type: 'email', autocomplete: 'email', maxlength: '254', required: '' });
    const honey = el('input', { name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', class: 'hp' });
    const consent = el('input', { id: 'consent', type: 'checkbox' });
    const button = el('button', { class: 'go', type: 'submit', text: quiz.lead.button });
    const form = el('form', { novalidate: '', on: { submit: (e) => { e.preventDefault(); send(); } } }, [
      el('label', { for: 'first_name', text: 'First name' }), name,
      el('label', { for: 'email', text: 'Email' }), email,
      honey,
      quiz.lead.consent_text ? el('label', { class: 'check', for: 'consent' }, [consent, el('span', { text: quiz.lead.consent_text })]) : null,
      err, button,
    ]);
    screen(el('p', { class: 'kicker', text: 'last step' }), el('h2', { text: 'Where should your result go?' }), form,
      el('button', { class: 'back', type: 'button', text: 'Back', on: { click: () => { state.i = quiz.questions.length - 1; save(); question(); } } }));
    if (field === 'email') email.focus();

    async function send() {
      button.disabled = true;
      button.textContent = 'Sending';
      try {
        const r = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ first_name: name.value, email: email.value, marketing_consent: consent.checked, answers: state.answers, started_at: state.startedAt, website: honey.value }),
        });
        const data = await r.json().catch(() => ({ error: 'Something went wrong. Try again.' }));
        if (!r.ok) { err.textContent = data.error || 'Something went wrong. Try again.'; button.disabled = false; button.textContent = quiz.lead.button; return; }
        clearSave();
        showResult(data);
      } catch (e) {
        err.textContent = 'You look offline. Check your connection and send it again.';
        button.disabled = false; button.textContent = quiz.lead.button;
      }
    }
  }

  function showResult(data) {
    const card = el('div', { class: 'card-wrap' });
    if (typeof data.card_html === 'string') card.innerHTML = data.card_html; // escaped on the server (lib/render.js)
    app.replaceChildren(
      el('p', { class: 'sent', text: data.emailed ? 'Your result is on its way to your inbox too.' : 'Here is your result. Save this page, the email did not go out this time.' }),
      card,
    );
  }

  async function start() {
    load();
    try {
      const r = await fetch('/api/quiz');
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'not ready');
      quiz = data.quiz;
      document.title = quiz.title;
      applyLook(data.look);
      const valid = Object.keys(state.answers).every((k) => quiz.questions.some((q) => q.id === k));
      if (!valid || state.i > quiz.questions.length) state = { i: -1, answers: {}, startedAt: null };
      if (state.i >= quiz.questions.length) leadForm(); else intro();
    } catch (e) {
      app.replaceChildren(el('p', { class: 'loading', text: `The quiz could not load (${e.message}). Refresh to try again.` }));
    }
  }
  start();
})();
