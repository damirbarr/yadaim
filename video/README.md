# Yadaim promo video: motion as code

A 35-second, 1920×1080, 60 fps Hebrew promo for Yadaim, made entirely from code (no After Effects, no
keyframes, no samples). It follows the "Motion as Code" workflow: every frame is a pure function of time,
so the browser preview and the rendered MP4 are identical, and every change is a code edit plus a re-render.

## Pipeline

| Step | File | What it does |
|---|---|---|
| Timeline | `timeline.json` | Plate start/end times and every animation cue (seconds). Picture and sound both read it. |
| Plates | `src/plates.js` | The nine scenes, drawn on a 2D canvas: `draw(ctx, t, cues)`. |
| Toolkit | `src/kit.js` | Brand tokens (navy / lime / Heebo), easing, kinetic Hebrew type, cards, chips, logo, avatars. |
| Composer | `src/main.js` | Picks the plate for `t`, camera drift, transitions (push, iris, hazard-stripe wipe). |
| Sound | `audio/score.py` | Synthesized 120 BPM score + UI sound effects on the same cues → `out/mix.wav`. |
| Render | `render.mjs` | Headless Chromium → PNG frames → ffmpeg (x264, CRF 16) → `out/yadaim.mp4` + `out/yadaim-sound.mp4`. |

## The nine plates

| Plate | Time (s) | Message |
|---|---|---|
| hook | 0 – 4 | מי מגיע היום לאתר? ובכמה זה ייגמר בסוף החודש? |
| brand | 4 – 8 | Logo builds itself: יודעים מראש מי מגיע לאתר, ומה המחיר הסופי ליום. |
| search | 8 – 13 | Contractor searches on the phone and picks workers by name. |
| docs | 13 – 17 | Verified workers, every document valid through the booking's last day. |
| price | 17 – 21 | Final daily price; lodging/transport toggles update it. |
| lock | 21 – 25 | 18:00 the evening before: the crew locks, names, driver, pickup time. |
| checkin | 25 – 29 | Morning check-in on site; a misfit worker costs ₪0. |
| agency | 29 – 32 | Agencies approve an offer and fill idle days. |
| end | 32 – 35 | Logo, tagline, the two doors: אני קבלן / אני תאגיד. |

## Commands (from this folder)

```bash
python3 audio/score.py                       # build the soundtrack (needs numpy)
node render.mjs --samples 3                  # full render with motion blur (~8 min), adds sound if out/mix.wav exists
node render.mjs                              # fast draft without motion blur (~4 min)
node render.mjs stills --t 11.8,23.9         # single frames → out/wip/
node render.mjs --from 17 --to 21 --out out/wip/price.mp4   # one plate
```

Preview with live scrubbing: serve this folder (for example `python3 -m http.server -d video 5173` from the repo root)
and open `http://localhost:5173/index.html`. Space plays (with sound once `out/mix.wav` exists), arrows seek, `,` / `.` step a
frame, `h` hides the bar, `?t=21` starts at 21 s.

Requirements: Node with Playwright's Chromium, ffmpeg with libx264, Python 3 with numpy.

## Changing things

- **Timing:** move a cue in `timeline.json`. The animation and its sound effect move together.
- **Copy:** all on-screen text is in `src/plates.js`. Keep it Hebrew, plural address, no em dash, and don't promise
  worker photos (avatars are the app's illustrated ones). Prices follow the landing page's sample crew (₪702/day all-in).
- **Look:** colours and fonts come from `docs/design/DESIGN_SYSTEM.md` via `C` in `src/kit.js`. Lime is a fill with
  navy text, never lime text on white.
- **Rule:** everything must be a deterministic function of `t` (use `rnd(i)`, never `Math.random()`).

Fonts: Heebo (SIL OFL 1.1) from `@fontsource/heebo`, in `fonts/`.
