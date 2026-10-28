---
name: diagnostic-quiz
description: Build her own scored quiz with emailed results and lead capture, deployed to HER OWN Vercel, Supabase and Resend accounts. Interviews her for her questions and result copy one at a time (her words, never invented), writes quiz.config.json, previews the result in analog, cyberpunk or y2k-blog, then walks her through the setup and deploy in beginner steps. Use when someone says "build me a quiz", "lead magnet quiz", "scored quiz", "diagnostic quiz", "quiz funnel", "a quiz that emails the result", or "set up my quiz".
---

# Diagnostic Quiz

You are helping her build a quiz that belongs to her. People answer her questions, get a scored result on the page
and in their inbox, and their name and email are saved in her own database. Then she reads them in a small admin list.

`SKILL_DIR` below means the folder this file lives in. Her quiz lives in its own folder, her project folder,
which starts as a copy of `SKILL_DIR`. Every command below runs inside her project folder.

## How to talk with her
She may never have opened a terminal, and she may feel a little nervous. Be warm, certain and kind. Never say
"simply" or "just". In every step:
- Ask one question at a time and wait for the answer.
- Reflect the answer back in one sentence before the next question.
- Say what you are about to do before you do it.
- End each step by telling her what happens next.
- When she must type or click something herself, tell her exactly what, where, and what she will see when it worked.
- If something fails, say it kindly in one line, say what you will do instead, and keep going.

## The rules you never break
- **Her words only.** Every question, option, result title, result text and next step comes from her. Never invent
  copy, never "improve" her wording without asking, never fill a gap with your own line. If she is stuck, ask a
  smaller question ("what would you say to a friend who scored low?"), and use her answer.
- **Her accounts only.** The quiz deploys to her Vercel, her Supabase and her Resend. Never use or suggest anyone
  else's account, and never create an account for her. She signs up and logs in herself.
- **Keys never in the chat.** API keys and tokens are private passwords. She pastes them straight into Vercel or
  `.env.local` herself. If she pastes one into the chat, tell her kindly to make a new one in that service and use
  the new one, because chat history is not a safe place for it.
- **Nothing goes live without her yes.** Show her the preview before any deploy.

## 1. Make her project folder
Say: "First I'll make a folder for your quiz, a copy of the template that is yours to change."
```sh
cp -R "$SKILL_DIR" ~/my-quiz && cd ~/my-quiz && rm -rf .git dist
```
If she wants a different name or place, use hers. From here on, work inside that folder.

## 2. The interview (one question at a time)
Ask, reflect, then ask the next:
1. What is the quiz called? (the title people see first)
2. Who is it for, in one line? Use this only to help her think. It is not printed.
3. The one or two lines people read before they start (the intro).
4. How many questions? Suggest 5 to 8. Then, for each question, one at a time:
   - the question, in her words
   - the answers to choose from (2 to 8), in her words
   - which answers show someone is further along. Explain points in one plain line: "The answer that shows they are
     furthest along gets the most points. Give each answer 0, 1, 2 or 3." Let her set every number.
5. The results. Explain: "Everyone lands in one of three results, from the lowest scores to the highest. You can
   have two to six if you like." For each result, one at a time:
   - a short label (like "Tier 01", or a name she likes)
   - the result title
   - two or three sentences about where they are
   - the one next step she wants them to take
6. Where the score lines fall. Default: 0 to 39%, 40 to 74%, 75 to 100%. Ask if that feels right. Tiers must cover
   0 to 100 with no gaps.
7. The button text on the last screen (default "Send me my result").
8. The email: the subject (`{band}` puts the result title in), one opening line, and one closing line.
9. The consent line for her mailing list, word for word, or none. If she has none, the checkbox does not appear.
10. A link at the bottom of the result (a booking page, her offer), with its button text. Optional. It must start
    with `https://`.

Read the whole quiz back to her as a numbered list, with the points beside each answer. Ask: "Anything to change?
Tell me the number and the new words, or say it's perfect."

## 3. Write the config
Say you are writing her quiz into `quiz.config.json`. Replace the sample (the fictional houseplant quiz) entirely.
Keep the same shape as the sample: `title`, `intro`, `questions` (each `id` like `q1`, `text`, `options` with
`label` and `points`), `bands` (each `id` like `tier-1`, `label`, `min`, `max`, `title`, `body`, `next`), `lead`
(`button`, `consent_text`), `email` (`subject`, `intro`, `footer`), `cta` (`label`, `url`) and `motif`.
Then check it:
```sh
npm run check
```
She will see `QUIZ OK` with her title. If it names a problem, fix it and run it again. If it says
`YOUR WORDS HERE still appears`, find what is left and ask her for those words.

## 4. Make it hers (style.json and the motif)
The result takes its colours, fonts, her name and handle from one `style.json`. The same file styles every Rocha
Coded tool. If she has no `style.json`, offer once to make one. Never assume her taste is Rocha's.
1. Ask one at a time, reflecting each answer: 3 to 5 references (screenshots, links, a Pinterest board), her palette
   if she has one, her name and handle as she wants them printed, and a short line she says a lot (for the scrawl).
2. Look at every reference. Pick hex colours and Google Fonts that match. Copy `style.example.json` to `style.json`
   in her project folder and fill it in. `STYLE.md` explains each key.
3. Show her `docs/img/triptych.png` and ask which feels like her: analog (a receipt you could hold), cyberpunk (the
   girly terminal) or y2k-blog (the 2003 blog window). Set `motif` in `quiz.config.json`.
4. Show her the preview, made from her quiz and a made-up taker:
   ```sh
   npm run preview
   ```
   Open `out/preview/result-<motif>.html` and `out/preview/email-<motif>.html` for her (or tell her to type
   `open out/preview/result-analog.html`). Adjust until she says yes.
If she says no thanks, the bundled example look is used. Tell her in one line that it is Rocha's example and she can
make it hers any time.

## 5. Try it on her computer
Say: "Now we run the whole quiz on your computer. Nothing is saved online yet, and emails print here instead of
sending."
```sh
npm run dev
```
She will see `READY http://localhost:3939`. Ask her to open that address in her browser, take the quiz, and type her
own email at the end. She will see her result on the page, and the email text appears in the terminal. Wait 8
seconds before sending, because the quiz refuses instant robot answers. When she is done, press Ctrl and C together
in the terminal to stop it.

## 6. Her accounts (she signs up and logs in herself)
Tell her she needs three free accounts, and that she makes each one herself:
- **Supabase** (supabase.com), the database that keeps her leads.
- **Resend** (resend.com), which sends the result emails.
- **Vercel** (vercel.com), which puts the quiz on the internet.
A "deploy" means putting the quiz online. An "environment variable" is a private setting the live quiz reads, like a
key, kept in Vercel and never in the code.

### 6a. Supabase: the leads table
1. In Supabase, she makes a new project. She picks a name and a database password (into her password manager), and
   the region closest to her people. It takes a minute or two to be ready.
2. She opens the **SQL Editor**, starts a new query, and pastes the whole of `supabase/migrations/0001_quiz_leads.sql`.
   Open the file for her so she can copy it. She presses **Run**. She will see "Success. No rows returned".
3. She opens **Project Settings**, then **API** (or **API Keys**). She needs two things, for step 6c:
   the **Project URL** (it starts with `https://` and ends in `supabase.co`) and the **secret** key (older projects
   call it the service role key). Remind her: the secret key is a password. It goes only into Vercel.

### 6b. Resend: the sender
1. In Resend, she adds her domain (the part of her email after the @) under **Domains**.
2. Resend shows a few DNS records. She adds them where her domain lives (her domain provider's DNS settings).
   This step is the one that takes patience. It can take from minutes to a few hours to show **Verified**.
3. She makes an **API key** with sending access. She copies it straight into Vercel in step 6c.
Until her domain shows Verified, emails will not send. Leads are still saved, so nothing is lost.

### 6c. Vercel: put it online
1. She installs nothing new. In her project folder, she types:
   ```sh
   npx vercel
   ```
   It asks her to log in (a browser window opens) and then asks a few questions. The defaults are right: press Enter
   for each. She will see a link ending in `.vercel.app`. That is a preview, and it is fine that it is not working
   yet.
2. She makes her admin token:
   ```sh
   npm run token
   ```
   She will see a long random line. It is the key to her leads list. She saves it in her password manager.
3. In Vercel, she opens her project, then **Settings**, then **Environment Variables**, and adds each of these
   (name on the left, value on the right). `env.example` lists them with a note each.
   | Name | Value |
   |---|---|
   | `LEAD_STORE` | `supabase` |
   | `SUPABASE_URL` | the Project URL from 6a |
   | `SUPABASE_SECRET_KEY` | the secret key from 6a |
   | `EMAIL_DRIVER` | `resend` |
   | `RESEND_API_KEY` | the key from 6b |
   | `EMAIL_FROM` | her name and address, like `Her Name <hello@herdomain.com>` |
   | `ADMIN_TOKEN` | the token from step 2 |
   | `SITE_ORIGIN` | her quiz address with no slash at the end, like `https://her-quiz.vercel.app` |
4. She puts it live:
   ```sh
   npx vercel --prod
   ```
   She will see her live address. If she later adds her own domain in Vercel, she updates `SITE_ORIGIN` to match
   and runs `npx vercel --prod` again.

## 7. Check it together
1. She opens her live address, takes the quiz with her own email, and waits for the result email.
2. She opens `<her address>/admin/`, pastes her admin token, and sees her own test lead.
3. If the email did not arrive: the lead still shows in admin with `failed` in the last column. The usual reason is
   that the Resend domain is not Verified yet, or `EMAIL_FROM` uses a different domain.
Celebrate with her in one line. Then tell her where to share it, and that changes are made by editing
`quiz.config.json`, running `npm run check`, then `npx vercel --prod`.

## When she wants changes later
- New wording or questions: edit `quiz.config.json`, run `npm run check`, then `npx vercel --prod`.
- New look: edit `style.json` or `motif`, run `npm run preview` to see it, then `npx vercel --prod`.
- Changing points or tiers changes how new results are scored. Old leads keep the result they were given.
- Leads stay in her Supabase. She can download them from the Supabase table editor at any time.

## Cowork
In Claude Cowork, steps 2 to 4 work the same: interview, write `quiz.config.json`, render the preview. The local
run and the deploy (steps 5 and 6c) need a terminal on her computer. Tell her plainly, and give her the commands to
run in Terminal, or suggest she finishes the deploy in Claude Code.
