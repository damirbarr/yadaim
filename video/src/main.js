// Composer: loads one film (?film=contractor|agency), picks the plate for time t, applies the transition
// between neighbours and a slow camera drift. window.renderAt(t) is what the offline renderer calls per frame.
import { C, clamp, lerp, ease, ep, rrect } from "./kit.js";
import { setFrame } from "./common.js";

// fonts must be ready before the first frame (Hebrew and Latin subsets, every weight the plates use)
await Promise.all([400, 500, 600, 700, 800, 900].flatMap((w) => [document.fonts.load(`${w} 40px Heebo`, "אבגד"), document.fonts.load(`${w} 40px Heebo`, "0123₪Ab")]));

const params = new URLSearchParams(location.search);
const FILM = params.get("film") ?? "contractor";
const TL = await (await fetch(`films/${FILM}/timeline.json`)).json();
const plates = await import(`./${FILM}.js`);
await plates.ready;
const Q = TL.cues;
// ?portrait=1: the vertical film (9:16, for phones). Same timeline and sound, other layout.
const PORTRAIT = params.has("portrait");
const W = PORTRAIT ? 1080 : TL.width, H = PORTRAIT ? 1920 : TL.height;
const CUTS = plates.CUTS;

// Vertical film, plates without a vertical layout of their own: they draw in their 1920×1080 layout and two
// regions of it are placed on the tall frame, the headline column on top (enlarged) and the visual under it.
// [source x, y, w, h] → [dest x, y, scale]. The text column ends at x 1740 (COL in common.js); it lands at x 1020.
const TEXT = { sx: 1040, sy: 290, sw: 800, sh: 480, k: 1.3 };
TEXT.dx = 1020 - (1740 - TEXT.sx) * TEXT.k;
TEXT.dy = 90;
// the visual: the plate's bounding box (VISUAL in the film module), as large as the space under the headline allows
const VIS_TOP = 690;
function visRegion(id) {
  const [sx, sy, sw, sh] = plates.VISUAL?.[id] ?? [80, 20, 980, 1050];
  const k = Math.min((W - 60) / sw, (H - VIS_TOP - 50) / sh);
  return { sx, sy, sw, sh, k, dx: (W - sw * k) / 2, dy: VIS_TOP + (H - VIS_TOP - 50 - sh * k) / 2 };
}
const BACKDROP = { page: C.paper, mint: C.mint, deep: C.deep };

const canvas = document.getElementById("c");
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext("2d");

function plateAt(t) {
  return TL.plates.find((p) => t >= p.start && t < p.end) ?? TL.plates[TL.plates.length - 1];
}

/** One plate with its own gentle camera drift (push-in over the plate's life). */
function drawPlate(p, t) {
  const lp = clamp((t - p.start) / (p.end - p.start));
  const z = 1 + 0.025 * ease.inOut(lp);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-W / 2, -H / 2);
  if (!PORTRAIT || plates.NATIVE?.includes(p.id)) {
    setFrame(W, H);
    plates[p.id](ctx, t, Q);
  } else {
    rearranged(p, t);
  }
  ctx.restore();
  setFrame(W, H);
}

function rearranged(p, t) {
  const kind = plates.BG?.[p.id] ?? "page";
  ctx.fillStyle = BACKDROP[kind];
  ctx.fillRect(0, 0, W, H);
  if (kind === "page") {
    ctx.save();
    ctx.translate(W - 60, 140 + Math.sin(t * 0.5) * 8);
    ctx.rotate(0.7 + t * 0.02);
    rrect(ctx, -200, -200, 400, 400, 115);
    ctx.fillStyle = "rgba(15,143,128,0.05)";
    ctx.fill();
    ctx.restore();
  }
  setFrame(1920, 1080, true);
  for (const r of [TEXT, visRegion(p.id)]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.dx, r.dy, r.sw * r.k, r.sh * r.k);
    ctx.clip();
    ctx.translate(r.dx, r.dy);
    ctx.scale(r.k, r.k);
    ctx.translate(-r.sx, -r.sy);
    plates[p.id](ctx, t, Q);
    ctx.restore();
  }
}

function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const i = TL.plates.indexOf(plateAt(t));
  const cur = TL.plates[i], next = TL.plates[i + 1];
  const inCut = CUTS[cur.id] && i > 0 && t < cur.start + CUTS[cur.id].d / 2 ? cur : null;
  const outCut = next && CUTS[next.id] && t >= next.start - CUTS[next.id].d / 2 ? next : null;
  const b = inCut ?? outCut;
  if (!b) drawPlate(cur, t);
  else {
    const j = TL.plates.indexOf(b), cut = CUTS[b.id];
    transition(cut, TL.plates[j - 1], b, t, clamp((t - (b.start - cut.d / 2)) / cut.d));
  }
  // ease in from black-navy and out to the end card's white, so the file starts and ends clean
  const fi = 1 - ep(t, 0, 0.3);
  const fo = ep(t, TL.duration - 0.35, 0.35);
  if (fi > 0) { ctx.fillStyle = C.deep; ctx.globalAlpha = fi; ctx.fillRect(0, 0, W, H); }
  if (fo > 0) { ctx.fillStyle = C.white; ctx.globalAlpha = fo; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 1;
}

function transition(cut, A, B, t, p) {
  const e = ease.inOut(p);
  if (cut.kind === "push") {
    // RTL reading order: the next scene enters from the left, the old one leaves to the right
    ctx.save(); ctx.translate(e * W, 0); drawPlate(A, t); ctx.restore();
    ctx.save(); ctx.translate(-(1 - e) * W, 0); drawPlate(B, t); ctx.restore();
    return;
  }
  if (cut.kind === "zoom") {
    drawPlate(A, t);
    ctx.save();
    ctx.globalAlpha = e;
    const z = lerp(1.06, 1, e);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    drawPlate(B, t);
    ctx.restore();
    return;
  }
  if (cut.kind === "iris") {
    drawPlate(A, t);
    const [x, y] = PORTRAIT ? [W / 2, VIS_TOP + 550] : cut.at;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, ease.in(p) * Math.hypot(W, H) * 1.05, 0, Math.PI * 2);
    ctx.clip();
    drawPlate(B, t);
    ctx.restore();
    return;
  }
  if (cut.kind === "sweep") {
    // a teal band with a mint trail sweeps across; the scene swaps while it covers the frame
    drawPlate(p < 0.5 ? A : B, t);
    const span = W + H + 600;
    const x = lerp(W + 300, -span - 300, ease.inOut(p));
    const band = (x0, wdt, fill) => {
      ctx.beginPath();
      ctx.moveTo(x0, H); ctx.lineTo(x0 + H * 0.6, 0); ctx.lineTo(x0 + H * 0.6 + wdt, 0); ctx.lineTo(x0 + wdt, H);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.tealHi);
    g.addColorStop(1, C.tealDark);
    band(x + W + 200, 260, C.mintHi);
    band(x, W + 260, g);
  }
}

window.TL = TL;
window.renderAt = (t) => render(t);
window.__ready = true;

// ── preview controls (hidden when ?render=1) ──
if (!params.has("render")) {
  const ui = document.getElementById("ui");
  ui.hidden = false;
  const audio = new Audio(`out/${FILM}/mix.wav`);
  let t = Number(params.get("t") ?? 0), playing = false, last = 0;
  const label = document.getElementById("time");
  const bar = document.getElementById("bar");
  bar.max = TL.duration;
  bar.step = 1 / TL.fps;
  const seek = (v) => { t = clamp(v, 0, TL.duration); audio.currentTime = t; };
  bar.oninput = () => seek(Number(bar.value));
  const toggle = () => { playing = !playing; if (playing) { audio.currentTime = t; audio.play().catch(() => {}); } else audio.pause(); };
  document.getElementById("play").onclick = toggle;
  addEventListener("keydown", (ev) => {
    if (ev.key === " ") { ev.preventDefault(); toggle(); }
    if (ev.key === "ArrowRight") seek(t + (ev.shiftKey ? 5 : 1));
    if (ev.key === "ArrowLeft") seek(t - (ev.shiftKey ? 5 : 1));
    if (ev.key === ".") seek(t + 1 / TL.fps);
    if (ev.key === ",") seek(t - 1 / TL.fps);
    if (ev.key === "h") ui.hidden = !ui.hidden;
  });
  const loop = (now) => {
    if (playing) {
      t = !audio.paused && audio.readyState > 2 ? audio.currentTime : t + (now - last) / 1000;
      if (t >= TL.duration) { t = 0; audio.currentTime = 0; }
    }
    last = now;
    render(t);
    label.textContent = `${t.toFixed(2)}s · ${plateAt(t).id}`;
    bar.value = String(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
} else {
  render(Number(params.get("t") ?? 0));
}
