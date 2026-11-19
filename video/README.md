# Yadaim films: motion as code, with voiceover

Two short Hebrew films (1920×1080, 60 fps, under 35 s each), one per audience, made entirely from code in the
owner's teal style (round 8, `docs/design/brand-reference.webp`):

| Film | Voice | Length | Story |
|---|---|---|---|
| `contractor` | Avri (male) | ~32 s | 06:30, who's coming? → logo → search and pick by name → verified documents → final daily price → crew locks at 18:00 → misfit costs ₪0 → "צריכים עובדים לאתר?" |
| `agency` | Hila (female) | ~33 s | an idle day costs ~₪520 → logo → Excel import → document expiry alerts → a ready offer goes out on WhatsApp → approve a request in one press → "מנהלים עובדים? יש לכם ידיים." |

It follows the "Motion as Code" workflow: every frame is a pure function of time, the **voiceover drives the
timing** (each animation is anchored to a spoken word), and every change is a code edit plus a re-render.

## Pipeline

| Step | File | What it does |
|---|---|---|
| Script | `films/<film>/script.json` | What the voice says, one line per plate, and which word each animation cue lands on. |
| Voice | `audio/voice.py <film>` | Speaks each line with a Microsoft neural Hebrew voice (edge-tts, free, word timings included), lays the lines out → `out/<film>/vo.wav` and `films/<film>/timeline.json` (plates + cues in seconds). |
| Sound | `audio/score.py <film>` | Synthesized music (ducks under the voice) + UI sound effects on the same cues + the voice → `out/<film>/mix.wav`. |
| Plates | `src/contractor.js`, `src/agency.js` | The scenes, drawn on a 2D canvas: `draw(ctx, t, cues)`. Shared parts in `src/common.js`. |
| Toolkit | `src/kit.js` | Teal tokens, easing, kinetic Hebrew type (mint highlight, teal swoosh), cards, chips, buttons, the logo. |
| Logo | `src/logo-paths.js` | Generated from `components/logo-paths.ts` by `node sync-logo.mjs` (run it when the logo changes). |
| Composer | `src/main.js` | Picks the plate for `t`, camera drift, transitions (push, zoom, iris, teal sweep). |
| Render | `render.mjs` | Headless Chromium → PNG frames → ffmpeg (x264, CRF 16) → `out/<film>/yadaim-<film>-sound.mp4`. |

## Vertical films (9:16, for phones)

`node render.mjs --portrait --film <film>` renders the same film at 1080×1920 → `out/<film>/yadaim-<film>-vertical-sound.mp4`
(same voice, music and timing). The centred plates (the opening, the logo, the end card) have their own vertical layout
(`NATIVE` in the film module, `PORTRAIT` in `common.js`). The others keep their wide layout and `main.js` re-arranges it:
the headline column goes on top, enlarged, and the visual under it, cropped to its box (`VISUAL` in the film module)
and enlarged to the frame's width, on the plate's backdrop (`BG`). Preview: add `&portrait=1` to the preview URL.

## Commands (from this folder)

```bash
pip install edge-tts numpy                      # once
python3 audio/voice.py contractor               # voice + timeline (cached per line in out/<film>/lines/)
python3 audio/score.py contractor               # music + effects + voice → out/contractor/mix.wav
node render.mjs --film contractor --samples 3   # final, with motion blur (~8 min alone)
node render.mjs --film contractor               # fast draft
node render.mjs stills --film agency --t 3.8,15.5          # single frames → out/wip/
node render.mjs --film agency --from 16 --to 23 --out out/wip/offer.mp4   # one plate
```

Preview with live scrubbing and sound: from the repo root run `python3 -m http.server 5173` and open
`http://localhost:5173/video/index.html?film=agency`. Space plays, arrows seek, `,` / `.` step a frame, `h` hides the
bar, `&t=12` starts at 12 s.

Requirements: Node with Playwright's Chromium, ffmpeg with libx264, Python 3 with numpy and edge-tts. Behind a TLS-inspecting
proxy, `voice.py` trusts `/root/.ccr/ca-bundle.crt` when it exists (verification stays on).

## Changing things

- **Words:** edit `say` in `films/<film>/script.json`, re-run `voice.py` and `score.py`, render. Cues follow their words.
  Keep each film under 35 s (`voice.py` warns). Spell numbers as words ("חמש מאות ועשרים"); the screen shows "₪520".
- **Pronunciation:** the voice reads unvocalized Hebrew and guesses. Where it guesses wrong, add niqqud to that word in
  `say` (the lock line uses "בְּשֵׁשׁ בָּעֶרֶב", otherwise it is heard as "ברבע"). Check by listening, or by
  transcribing `out/<film>/mix.wav` with Whisper. Keep effects off the exact moment of a key word: they mask it.
- **Timing:** move a cue to another word or add an offset ("ננעל@end", "start-0.3", "מאשרים+0.2").
- **Copy on screen:** in the plate files. Hebrew, plural address, no em dash, no promised worker photos (the avatars are the
  app's illustrated ones; the end card uses the landing page's photo `public/brand/hero-worker-teal.webp`, never masked).
  Prices follow the landing page's sample crew (₪702/day all-in). The platform fee is never shown.
- **Look:** tokens in `C` (`src/kit.js`) mirror `app/globals.css`. Teal is a fill with white text, mint for highlights.
- **Rule:** everything must be a deterministic function of `t` (use `rnd(i)`, never `Math.random()`).

Fonts: Heebo (SIL OFL 1.1) from `@fontsource/heebo`, in `fonts/`. Voices: Microsoft Edge neural TTS through edge-tts.
