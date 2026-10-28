# Testing

Everything below was run on 28 Oct 2026, on macOS with Node 25.9.0, Python 3.12.8 and Google Chrome installed.
The code targets Node 22 and uses nothing newer, but it was not run on Node 22 itself.

## 1. The test suite
```sh
npm test
```
Result: **58 tests, all pass.** No network, no real keys: the in-memory lead store, the console email driver, and a
fake Supabase server on 127.0.0.1. They cover:
- **Scoring (pure):** the shipped sample is valid (6 questions, 3 tiers, top score 18); its tiers hold only "YOUR WORDS
  HERE"; lowest, middle and highest answers land in tier 1, 2 and 3; the tier edges at 39/40 and 74/75 percent; the
  receipt lines; points never reach the browser; config errors named in plain words (gaps, overlaps, a tier not ending
  at 100, repeated ids, negative or decimal points, too few options, nothing to score, a `javascript:` link, no title).
- **Validation:** answers must be exactly the quiz ids with whole-number indexes in range (no extras, strings,
  decimals or `__proto__`); names, emails, consent, unknown fields, the honeypot and the 8 second minimum.
- **Rendering, all three motifs:** each card carries its own signature (RESULT RECEIPT, the `:~$` prompt, the
  000,777 hit counter) and not the others'; the same score, tier, answers and link in every motif; hostile text in the
  name, title, tier, question, owner and link is escaped; the email is table-based with inline styles, no script, no
  external stylesheet, and a plain text twin; no text or box shadows anywhere; the subject cannot carry a line break;
  the y2k sidebar stacks on phones.
- **style.json:** the fallback order (`./style.json`, `~/.rocha-coded/style.json`, the bundled example); the
  inheritance rule (a user file borrows only palette and fonts, never lines, owner, handle or name); a user style
  re-tones all three motifs with none of the example's handle, stamp or scrawl; bad colours and font names refused;
  a broken file falls back; motif order and old names; both bundled style files share the same keys.
- **Local end to end** (the real dev server and handlers): the quiz endpoint hides points; submit, then scored, saved,
  emailed through the console driver, and listed in admin; no raw IP stored; admin refuses no token, a wrong token, a
  token in the URL and a token without `Bearer`; admin rate limits wrong guesses; a short token switches admin off;
  limit and offset are clamped; CORS echoes only the site origin and refuses others; bad input saves and sends
  nothing; 415 for non-JSON, 413 for oversized bodies, 405 for GET; the honeypot; burst and daily limits; a store
  outage gives 503 and sends no email; the security headers.
- **Supabase driver** against a fake server: the URL, `apikey` header (no Bearer for new-style keys), URL-encoded
  filters, list ordering, update by UUID only, and the allow-listed count fields.

## 2. A real browser, by hand
The dev server ran with the in-memory store and the console email driver. A private headless Chrome at 390px wide
cleared storage, pressed Start, answered two questions, **reloaded the page**, saw "Carry on", landed on question 3,
answered the rest, filled the form and sent it. Seen:
- the result receipt on the page with "Your result is on its way to your inbox too", and no sideways scroll at 390px
- the admin page at `/admin/`: token typed, the lead listed with score 11/18 (61%), tier-2, consent yes, email sent,
  and the token never in the URL
Fixed on the way: the unlock form stayed visible after unlocking (CSS overrode `hidden`), "1 leads", no fonts on the
admin page, a missing favicon, and a gold focus ring on headings.

The quiz page intro was also screenshotted in all three motifs at 420px. All three read well.

## 3. The README images
```sh
python3 scripts/make-readme-images.py
```
Rendered the three result cards at 1080x1350 and the triptych at 1620x720, and each was opened and checked by eye.
The first render showed every font falling back to Times: double quotes inside font stacks were breaking the inline
`style="..."` attributes. Fixed with single quotes, then re-rendered and checked again.

## 4. Config and preview
```sh
npm run check     # QUIZ OK "The Windowsill Quiz" 6 questions, top score 18, 3 tiers, motif analog
npm run preview   # writes out/preview/result-*.html and email-*.html for all three motifs
```

## 5. Security gate
```sh
./scripts/security-check.sh
```
Result: 9 passed, 0 failed, **SAFE TO PUBLISH**.

## Not tested
- **A real deploy to Vercel.** `vercel.json` (the `includeFiles` line that ships `quiz.config.json` and `style.json` to
  the functions, the build step and the headers) follows Vercel's documented format but was not deployed.
- **A real Supabase project.** The migration SQL was not run against Postgres, and the driver was tested against a
  fake server only.
- **Real email through Resend.** No key was used. The request follows Resend's documented `POST /emails` shape.
  How the email looks in Gmail, Apple Mail and Outlook was not checked in those apps. It was checked as a page in Chrome.
- **The Supabase, Resend and Vercel screens** named in `SKILL.md`. Their labels change over time and were written
  from their docs, not clicked through.
- **Claude Cowork** upload of the zip.
- Windows, and Node 22 itself.
