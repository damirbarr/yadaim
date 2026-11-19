// Composer: picks the plate(s) for time t, applies the transition between neighbours and a slow
// camera drift. window.renderAt(t) is what the offline renderer calls for every frame.
import * as plates from "./plates.js";
import { C, clamp, lerp, ease, ep, hazard } from "./kit.js";

const TL = await (await fetch("timeline.json")).json();
const Q = TL.cues;
const W = TL.width, H = TL.height;

const canvas = document.getElementById("c");
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext("2d");

// How each cut is made. The window is centred on the cut, `d` seconds wide.
const CUTS = {
  brand: { kind: "stripes", d: 0.7 },
  search: { kind: "push", d: 0.6 },
  docs: { kind: "zoom", d: 0.5 },
  price: { kind: "push", d: 0.6 },
  lock: { kind: "iris", d: 0.7, at: [580, 540], color: C.deep },
  checkin: { kind: "iris", d: 0.7, at: [600, 540] },
  agency: { kind: "push", d: 0.6 },
  end: { kind: "stripes", d: 0.7 },
};

function plateAt(t) {
  return TL.plates.find((p) => t >= p.start && t < p.end) ?? TL.plates[TL.plates.length - 1];
}

/** Draw one plate with its own gentle camera drift (push-in over the plate's life). */
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
  const cur = TL.plates[i];
  // Are we inside the transition window of the cut into `cur` or out of it?
  const inCut = CUTS[cur.id] && t < cur.start + CUTS[cur.id].d / 2 ? cur : null;
  const next = TL.plates[i + 1];
  const outCut = next && CUTS[next.id] && t >= next.start - CUTS[next.id].d / 2 ? next : null;
  const b = inCut ?? outCut;
  if (!b) {
    drawPlate(cur, t);
  } else {
    const j = TL.plates.indexOf(b);
    const A = TL.plates[j - 1], B = b, cut = CUTS[B.id];
    const p = clamp((t - (B.start - cut.d / 2)) / cut.d);
    transition(cut, A, B, t, p);
  }
  // fade to navy on the very last frames so the file ends clean
  const fo = ep(t, TL.duration - 0.35, 0.35);
  if (fo > 0) {
    ctx.fillStyle = C.deep;
    ctx.globalAlpha = fo;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function transition(cut, A, B, t, p) {
  const e = ease.inOut(p);
  if (cut.kind === "push") {
    // RTL reading order: the next scene enters from the left, the old one leaves to the right
    ctx.save();
    ctx.translate(e * W, 0);
    drawPlate(A, t);
    ctx.restore();
    ctx.save();
    ctx.translate(-(1 - e) * W, 0);
    drawPlate(B, t);
    ctx.restore();
    return;
  }
  if (cut.kind === "zoom") {
    drawPlate(A, t);
    ctx.save();
    ctx.globalAlpha = e;
    const z = lerp(1.06, 1, e);
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
    drawPlate(B, t);
    ctx.restore();
    return;
  }
  if (cut.kind === "iris") {
    drawPlate(A, t);
    const [x, y] = cut.at;
    const r = ease.in(p) * Math.hypot(W, H) * 1.05;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    drawPlate(B, t);
    ctx.restore();
    return;
  }
  if (cut.kind === "stripes") {
    // a lime hazard band sweeps across; the scene swaps while it covers the frame
    drawPlate(p < 0.5 ? A : B, t);
    const span = W + H + 400;
    const x = lerp(W + 200, -span, ease.inOut(p));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x + H, 0);
    ctx.lineTo(x + H + W + 400, 0);
    ctx.lineTo(x + W + 400, H);
    ctx.closePath();
    ctx.fillStyle = C.lime;
    ctx.fill();
    ctx.clip();
    hazard(ctx, 0, 0, W, H, { color: C.navy, period: 120, offset: t * 400 });
    ctx.restore();
    // solid lime leading edge
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x + H, 0);
    ctx.lineTo(x + H + 60, 0);
    ctx.lineTo(x + 60, H);
    ctx.closePath();
    ctx.fillStyle = C.lime;
    ctx.fill();
    ctx.restore();
  }
}

// ── fonts must be ready before the first frame ──
const weights = [400, 500, 700, 800, 900];
await Promise.all(weights.flatMap((w) => [document.fonts.load(`${w} 40px Heebo`, "אבגד"), document.fonts.load(`${w} 40px Heebo`, "0123₪")]));

window.TL = TL;
window.renderAt = (t) => render(t);
window.__ready = true;

// ── preview controls (hidden when ?render=1) ──
const params = new URLSearchParams(location.search);
if (!params.has("render")) {
  const ui = document.getElementById("ui");
  ui.hidden = false;
  const audio = new Audio("out/mix.wav");
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
