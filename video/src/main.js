// Composer: loads one film (?film=contractor|agency), picks the plate for time t, applies the transition
// between neighbours and a slow camera drift. window.renderAt(t) is what the offline renderer calls per frame.
import { C, clamp, lerp, ease, ep } from "./kit.js";

// fonts must be ready before the first frame (Hebrew and Latin subsets, every weight the plates use)
await Promise.all([400, 500, 600, 700, 800, 900].flatMap((w) => [document.fonts.load(`${w} 40px Heebo`, "אבגד"), document.fonts.load(`${w} 40px Heebo`, "0123₪Ab")]));

const params = new URLSearchParams(location.search);
const FILM = params.get("film") ?? "contractor";
const TL = await (await fetch(`films/${FILM}/timeline.json`)).json();
const plates = await import(`./${FILM}.js`);
await plates.ready;
const Q = TL.cues;
const W = TL.width, H = TL.height;
const CUTS = plates.CUTS;

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
  plates[p.id](ctx, t, Q);
  ctx.restore();
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
    const [x, y] = cut.at;
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
