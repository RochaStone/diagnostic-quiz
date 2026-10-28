# style.json

One file holds your look. Every Rocha Coded tool reads the same file, so you make it once.

## Where it goes
The tool looks in this order and uses the first one it finds:
1. `style.json` in this quiz folder (the folder you deploy)
2. `~/.rocha-coded/style.json`, to use one look across every project on your computer
3. `examples/style.rocha-coded.json`, the bundled example (Rocha's look)

For the live quiz, put `style.json` in the quiz folder. Vercel only sees what is in that folder.
Start from `style.example.json`: copy it to `style.json` and fill it in. Or ask Claude to make one with you.

## The keys
| Key | What to put there | Used by this tool |
|---|---|---|
| `name` | your brand or studio name | no |
| `owner` | your name, as you sign things | yes, at the foot of the result and in the y2k sidebar |
| `handle` | your Instagram or main social handle, with the @ | yes, beside your name, and as the terminal prompt in cyberpunk |
| `site` | your website address | no |
| `palette.hero` | your ground colour, the deep one everything sits on, as a hex code like `#50163C` | the page and email background (never a fill) |
| `palette.wine` | a second deep colour for headlines | titles, buttons, THANK YOU! |
| `palette.accent` | your one bright accent | the tier pill, the cursor, the score bar |
| `palette.paper` | a light paper colour | the y2k window, the quiz options |
| `palette.paper_pink` | a second paper | the receipt paper, the y2k sidebar |
| `palette.ink` | your text colour | text and rules |
| `palette.marker` | the colour of the handwritten scrawl | the scrawl and error messages |
| `palette.plum` | a deep shade | the terminal screen and the y2k title bar |
| `palette.gold` | a highlight colour for thin rules | rules, the stamp, the hit counter, the bezel |
| `palette.cool` | one cool accent, used rarely | no |
| `fonts.masthead` | a big display font from Google Fonts | quiz title, tier title, THANK YOU! |
| `fonts.label` | a font for labels and buttons | labels, buttons, the cyberpunk title |
| `fonts.body` | a reading font | the result text on the receipt |
| `fonts.scrawl` | a handwriting or marker font | the scrawl |
| `fonts.script` | a signature script font | no |
| `fonts.mono` | a typewriter font | scores, dates, receipt lines, the terminal |
| `fonts.pixel` (optional) | a pixel font from Google Fonts | the cyberpunk and y2k-blog labels (Silkscreen if empty) |
| `motif` | `analog`, `cyberpunk` or `y2k-blog` (older names like `guest-check` or `retro-tv` still work and map to the nearest one) | yes, unless `quiz.config.json` sets its own `motif` |
| `lines.scrawl` | a short line in your own words | the handwritten line on the analog receipt |
| `lines.stamp` | one short word | the gold stamp beside the tier on the analog receipt |
| `lines.masthead`, `headline`, `todo`, `celebrate`, `affirm`, `invite`, `magazine` | more of your own lines | kept for other tools |
| `references` | 3 to 5 images or links that feel like you | Claude looks at these when it makes your style with you |
| `notes` | your look in one or two sentences | Claude reads this too |

## Good to know
- Colours must be hex codes (`#RRGGBB` or `#RGB`). Anything else is skipped and the bundled colour is used for that slot.
- Fonts are Google Fonts names, letters, numbers and spaces only. Emails fall back to fonts every inbox has, so your result still looks finished in Outlook.
- Any colour or font you leave empty borrows the bundled example's, so the result always looks finished.
- Your words and your name never borrow. Leave `lines.scrawl`, `lines.stamp`, `owner` or `handle` empty and the result prints nothing there.
