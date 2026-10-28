# Security review

This quiz collects names and email addresses, so it was reviewed line by line before release.
Each item below says what was checked, where it lives, and which test proves it.

## Admin access (`lib/auth.js`, `api/admin/leads.js`)
- [x] **One token, from an environment variable.** `ADMIN_TOKEN` is read on each request. It is never written to a file, a log or a response.
- [x] **Weak tokens switch the admin off.** A token under 32 characters, or no token, returns 503. `npm run token` makes a 48 character random one. Test: *a short or missing ADMIN_TOKEN switches the admin off*.
- [x] **Constant-time compare.** Both the given and the expected token are hashed with SHA-256 to 32 bytes, then compared with `crypto.timingSafeEqual`. Hashing first means the compare never leaks the token's length.
- [x] **No token in the URL.** The token is read only from `Authorization: Bearer <token>`. `?token=` and `?access_token=` are ignored, so the token never lands in browser history, server logs or a Referer header. Test: *admin: no token, wrong token, token in the URL...*.
- [x] **Strict header parsing.** Only `Bearer ` followed by printable ASCII, under 512 characters. A bare token without the scheme is refused.
- [x] **Wrong guesses are rate limited.** 10 wrong tokens per IP per 15 minutes, then 429 for that IP, even with the right token. Test: *admin: wrong tokens are rate limited*.
- [x] **The admin page keeps the token in a JavaScript variable only.** No localStorage, no sessionStorage, no cookie. Closing the tab forgets it.
- [x] **Admin is same-origin only.** No CORS headers are ever sent from the admin endpoint. A browser call from another origin gets 403. Test: *admin: refuses a cross-origin browser call*.
- [x] **The admin list returns list columns only.** It never returns answers or the IP hash. `limit` is clamped to 1..200 and `offset` to 0..100000, and only digits are accepted.
- [x] **noindex.** The admin page and API send `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`.

## The submit endpoint (`api/submit.js`, `lib/http.js`, `lib/lead.js`, `lib/quiz.js`)
- [x] **Rate limited three ways.** A burst limit of 5 per IP per minute (per server instance), a durable 3 per email per 24 hours, and a durable 20 per IP per 24 hours, counted in the lead store so restarts do not reset them. Tests: *burst limit per IP per minute*, *durable daily limit per email address*.
- [x] **If the limit cannot be checked, nothing is saved.** A store error during the rate check returns 503 (fail closed).
- [x] **Body size limit.** 16 KB, checked against `Content-Length`, the parsed body and the raw stream. Test: *oversized body is 413*.
- [x] **JSON only.** Any other `Content-Type` gets 415. Arrays and non-objects get 400.
- [x] **Every input validated and size-limited.**
  - `first_name`: string, letters, accents, spaces, `'`, `.` and `-` only, 1 to 60 characters, Unicode-normalised.
  - `email`: string, at most 254 characters, a strict shape with no `<>"',;:()[]\` characters, lowercased.
  - `marketing_consent`: a real `true` or `false` only.
  - `answers`: exactly the quiz's question ids, each a whole number inside that question's options. Extra keys, strings, decimals and `__proto__` are refused.
  - `started_at`: a whole number at least 8 seconds in the past, which stops scripted instant submits.
  - Any other field is refused, so nothing unexpected is ever stored.
  Tests: `tests/validation.test.js`, *validateAnswers...*, *submit: bad input gets a 4xx and nothing is saved or sent*.
- [x] **Honeypot.** A hidden `website` field. If it is filled, the server answers 200 and stores nothing. Test: *honeypot gets a quiet 200*.
- [x] **Scoring stays on the server.** The browser receives question text and option labels only, never points or tiers. Test: *publicQuiz never sends points to the browser*.
- [x] **The lead is saved before the email is tried.** A slow or failed email never loses a lead, and the email status is recorded on the row.
- [x] **No raw IPs stored.** IPs are HMAC-SHA256 hashed, keyed with `ADMIN_TOKEN`, and only the hash is kept for rate limiting. Test: *the full journey* checks the row holds no raw IP.
- [x] **Errors are generic to the visitor.** Logs carry the error message only, never the visitor's email or answers.

## CORS (`lib/http.js`)
- [x] **Locked to the site.** A browser `Origin` is allowed only when it equals `SITE_ORIGIN` exactly, or matches the request's own host. Everything else gets 403.
- [x] **Never a wildcard.** `Access-Control-Allow-Origin` echoes the one allowed origin, with `Vary: Origin`. Test: *CORS: the site origin is echoed, any other origin is refused, never a wildcard*.
- [x] **Only what is needed.** Methods `GET, POST, OPTIONS`, header `Content-Type`. No credentials.

## Escaping every output
- [x] **Result card and email (`lib/render.js`).** Every piece of text, including quiz copy, answers, names, the tier and the CTA link, goes through `esc()`, which escapes `& < > " '`. Test: *every piece of text is escaped*, run in all three motifs.
- [x] **CSS values.** Colours must match a hex pattern and font names must be letters, numbers and spaces, so no style value can break out of its attribute (`lib/style.js`). Test: *bad colours and font names are refused*.
- [x] **Links.** `cta.url` must start with `https://`. `javascript:` and other schemes fail the config check. Test: *config validation names the problem*.
- [x] **Email headers.** The subject has line breaks removed and is capped at 150 characters, so no header can be injected. Test: *the email subject cannot carry a header break*.
- [x] **Quiz page (`public/app.js`).** Every quiz string is placed with `textContent`. The single `innerHTML` is the result card, which the server escaped.
- [x] **Admin page (`public/admin/admin.js`).** Every cell is set with `textContent`. No `innerHTML` at all.

## Headers (`vercel.json`, mirrored by the local server)
- [x] `Content-Security-Policy`: `script-src 'self'` (no inline scripts), `connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`. `style-src` allows inline styles because the result card is inline-styled for email clients.
- [x] `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`. Test: *security headers are set on pages*.

## Database (`supabase/migrations/0001_quiz_leads.sql`, `lib/store.js`)
- [x] **Row Level Security on, no policies, and no grants for `anon` or `authenticated`.** The public browser key can read and write nothing.
- [x] **The secret key stays on the server.** `SUPABASE_SECRET_KEY` is read only inside serverless functions and is never sent to the browser.
- [x] **No string-built SQL.** The REST API is called with fixed column lists. The only values placed in a URL are an email (`encodeURIComponent`), an IP hash, a UUID checked against a pattern, and clamped numbers. The fields that can be counted are an allow-list.
- [x] **Length checks in the table too.** `first_name` and `email` have length `check` constraints, and `percent` must be 0 to 100.
- [x] **https only.** `SUPABASE_URL` must be `https://`. The one exception is `http://127.0.0.1:<port>`, used by the test's fake server.
- [x] **Timeouts.** Every Supabase and Resend call aborts after 8 seconds.

## Secrets in the repo
- [x] No keys, tokens or project ids are committed. `env.example` holds names only, and `.env*` is in `.gitignore`.
- [x] `./scripts/security-check.sh` prints SAFE TO PUBLISH.

## Not covered (read this)
- The burst limit is per server instance. On Vercel, a determined attacker spread across many instances is held back by the durable daily limits, not the burst limit. If you expect real abuse, add Vercel's firewall rate limiting in front of `/api/submit`.
- There is no CAPTCHA. The honeypot, the 8 second minimum and the limits stop casual bots, not a targeted one.
- Rotating `ADMIN_TOKEN` also resets the IP hashes, so daily IP counts start again. Email counts are not affected.
- This review was done by reading the code and running the tests. It is not a penetration test.
