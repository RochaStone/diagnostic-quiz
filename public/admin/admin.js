'use strict';
/* The admin list. The token lives in a variable in this tab only (no storage, never in the URL)
   and goes to the server in the Authorization header. Every cell is set with textContent. */
(function () {
  let token = '';
  let offset = 0;
  const LIMIT = 50;
  const $ = (id) => document.getElementById(id);
  const body = document.querySelector('#leads tbody');

  function cell(text) {
    const td = document.createElement('td');
    td.textContent = text == null ? '' : String(text);
    return td;
  }

  async function fetchPage() {
    const r = await fetch(`/api/admin/leads?limit=${LIMIT}&offset=${offset}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const data = await r.json().catch(() => ({ error: 'Something went wrong.' }));
    if (!r.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  function addRows(leads) {
    leads.forEach((l) => {
      const tr = document.createElement('tr');
      [String(l.created_at || '').replace('T', ' ').slice(0, 16), l.first_name, l.email, `${l.score}/${l.max_score} (${l.percent}%)`, l.band, l.marketing_consent ? 'yes' : 'no', l.email_status]
        .forEach((v) => tr.appendChild(cell(v)));
      body.appendChild(tr);
    });
  }

  $('unlock').addEventListener('submit', async (e) => {
    e.preventDefault();
    token = $('token').value.trim();
    $('err').textContent = '';
    offset = 0;
    try {
      const data = await fetchPage();
      body.replaceChildren();
      addRows(data.leads);
      const total = data.total == null ? data.leads.length : data.total;
      $('count').textContent = `${total} ${total === 1 ? 'lead' : 'leads'}`;
      $('more').hidden = data.leads.length < LIMIT;
      $('list').hidden = false;
      $('unlock').hidden = true;
    } catch (err) {
      token = '';
      $('err').textContent = err.message;
    }
  });

  $('more').addEventListener('click', async () => {
    offset += LIMIT;
    try {
      const data = await fetchPage();
      addRows(data.leads);
      $('more').hidden = data.leads.length < LIMIT;
    } catch (err) {
      $('count').textContent = err.message;
    }
  });
})();
