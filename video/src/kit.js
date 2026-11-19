// Drawing toolkit for the plates, in the owner's teal style (round 8, docs/design/brand-reference.webp).
// Everything here is stateless: a plate calls these with the current time and gets the same pixels every time,
// so preview and render can never disagree.
import { LOGO_NAVY, LOGO_TEAL } from "./logo-paths.js";

export const C = {
  navy: "#0b2233", // text, the wordmark
  navy2: "#173a4d",
  deep: "#061f30", // dark plates (the hook, the evening)
  teal: "#0f8f80", // main action, active choice, accents: white text on it
  tealHi: "#14998a", // top of the button gradient
  tealDark: "#0c605f",
  tealLogo: "#0e9e90",
  tealLight: "#6fd3c4", // accents on the dark plates
  mint: "#e8f5f2", // highlights, icon tiles
  mintSoft: "#e2f4f0",
  mintHi: "#cdeee6", // the highlight pill behind words
  white: "#ffffff",
  paper: "#f3f8f8",
  paper2: "#e9f1f1",
  line: "#dbe7e6",
  muted: "#4f6470",
  faint: "#738493",
  onDark: "#a9c3c8",
  ok: "#168848",
  okBg: "#e3f4ea",
  warn: "#c47d0e",
  warnBg: "#fdf1dc",
  bad: "#d94848",
  badBg: "#fbeaea",
  info: "#3277c8",
  infoBg: "#e8f1fb",
};

export const FONT = "Heebo";

// ── time ──────────────────────────────────────────────────────────────────────
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, p) => a + (b - a) * p;
/** 0→1 progress of t through [a, a+d]. */
export const prog = (t, a, d) => clamp((t - a) / d);
export const ease = {
  out: (p) => 1 - Math.pow(1 - p, 3),
  out5: (p) => 1 - Math.pow(1 - p, 5),
  in: (p) => p * p * p,
  inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  back: (p) => { const c = 1.7, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  // Damped spring that overshoots once and settles: for things that land.
  spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(p * 11)),
};
/** Eased progress in one call. */
export const ep = (t, a, d, fn = ease.out) => fn(prog(t, a, d));
/** A short bump (0→1→0) right after time a: for presses and pops. */
export const bump = (t, a, d = 0.25) => Math.sin(Math.PI * prog(t, a, d));
/** Decaying kick after time a: for punches on a beat. */
export const kick = (t, a, k = 9) => (t >= a ? Math.exp(-(t - a) * k) : 0);

// ── canvas primitives ────────────────────────────────────────────────────────
export function font(ctx, size, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

export function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** White card: 20px corners, 1px line, soft shadow (globals.css `card`). */
export function card(ctx, x, y, w, h, { r = 26, fill = C.white, stroke = C.line, shadow = 0.07, lift = 22 } = {}) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = `rgba(11,34,51,${shadow})`;
    ctx.shadowBlur = lift * 2;
    ctx.shadowOffsetY = lift * 0.5;
  }
  rrect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  if (stroke) {
    rrect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** Hebrew text, right-aligned at x by default (RTL). */
export function text(ctx, s, x, y, { size = 40, weight = 800, color = C.navy, align = "right", alpha = 1, base = "alphabetic", dir = "rtl" } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  font(ctx, size, weight);
  ctx.direction = dir;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function measure(ctx, s, size, weight = 800) {
  ctx.save();
  font(ctx, size, weight);
  ctx.direction = "rtl";
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

/**
 * Kinetic headline: words rise out of a mask one after another, right to left.
 * `starts` is either one start time (words then follow every `stagger` s) or an array, one per word.
 * `span` = { from, to, at } puts a mint pill behind those words (the reference's "יש לכם ידיים." highlight);
 * `swoosh` = { word, at } draws the reference's teal curved underline under one word.
 */
export function kinetic(ctx, words, t, starts, x, y, { size = 96, weight = 900, color = C.navy, colors = {}, align = "right", stagger = 0.08, dur = 0.55, gap = 0.28, span = null, swoosh = null, out = null, dark = false } = {}) {
  const ws = words.map((w) => measure(ctx, w, size, weight));
  const sp = size * gap;
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  const right0 = align === "right" ? x : align === "center" ? x + total / 2 : x + total;
  const boxes = [];
  let right = right0;
  words.forEach((w, i) => {
    const st = Array.isArray(starts) ? starts[i] : starts + i * stagger;
    boxes.push({ left: right - ws[i], right, w: ws[i], st });
    right -= ws[i] + sp;
  });
  const outQ = (i) => (out == null ? 0 : ep(t, out + i * 0.03, 0.35, ease.in));
  if (span) {
    const mp = ep(t, span.at, 0.45, ease.inOut);
    const q = outQ(span.from);
    if (mp > 0 && q < 1) {
      const pad = size * 0.2;
      const r = boxes[span.from].right + pad, l = boxes[span.to].left - pad;
      const hw = (r - l) * mp;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      const g = ctx.createLinearGradient(0, y - size, 0, y + size * 0.3);
      g.addColorStop(0, dark ? C.tealHi : "#d9f3ec");
      g.addColorStop(1, dark ? C.tealDark : C.mintHi);
      ctx.fillStyle = g;
      rrect(ctx, r - hw, y - size * 0.86, hw, size * 1.12, size * 0.3);
      ctx.fill();
      ctx.restore();
    }
  }
  boxes.forEach((b, i) => {
    const p = ep(t, b.st, dur, ease.out5);
    b.p = p;
    if (p <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.left - size * 0.3, y - size * 1.15, b.w + size * 0.6, size * 1.5);
    ctx.clip();
    const q = outQ(i);
    const dy = (1 - p) * size * 1.1 - q * size * 1.1;
    text(ctx, words[i], b.right, y + dy, { size, weight, color: colors[i] ?? color, alpha: 1 - q });
    ctx.restore();
  });
  if (swoosh) {
    const b = boxes[swoosh.word];
    const q = outQ(swoosh.word);
    ctx.save();
    ctx.globalAlpha *= 1 - q;
    curve(ctx, b.left - size * 0.05, b.right + size * 0.05, y + size * 0.2, ep(t, swoosh.at, 0.45, ease.inOut), { color: dark ? C.tealLight : C.teal, width: size * 0.075 });
    ctx.restore();
  }
  return { boxes, total, left: right0 - total };
}

/** The reference's teal underline: a shallow smile curve, drawn right to left as p goes 0→1. */
export function curve(ctx, x0, x1, y, p, { color = C.teal, width = 8 } = {}) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  const n = 32, w = x1 - x0;
  for (let i = 0; i <= n * p; i++) {
    const u = i / n;
    const xx = x1 - u * w;
    const yy = y + Math.sin(u * Math.PI) * width * 1.4 - u * width * 0.6;
    i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  ctx.restore();
}

/** Status chip: icon + text, never colour alone. 8px corners like globals.css `chip`. */
export function chip(ctx, s, x, y, { kind = "ok", size = 22, align = "right", alpha = 1, scale = 1, icon } = {}) {
  const pal = {
    ok: [C.okBg, C.ok],
    warn: [C.warnBg, C.warn],
    bad: [C.badBg, C.bad],
    info: [C.infoBg, C.info],
    teal: [C.mintSoft, C.tealDark], // chip-hazard
    solid: [C.teal, C.white],
    ghost: [C.paper2, C.navy],
    dark: ["rgba(255,255,255,0.1)", C.white],
  }[kind];
  icon = icon ?? (kind === "ok" ? "check" : kind === "bad" ? "cross" : null);
  const tw = measure(ctx, s, size, 700);
  const is = icon ? size * 0.95 : 0;
  const w = tw + size * 1.2 + (icon ? is + size * 0.35 : 0);
  const h = size * 1.75;
  const x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x0 + w / 2, y);
  ctx.scale(scale, scale);
  ctx.translate(-(x0 + w / 2), -y);
  rrect(ctx, x0, y - h / 2, w, h, size * 0.38);
  ctx.fillStyle = pal[0];
  ctx.fill();
  const tx = x0 + w - size * 0.6;
  if (icon) {
    const cx = tx - is / 2;
    if (icon === "cross") cross(ctx, cx, y, is * 0.62, pal[1], size * 0.13, 1);
    else if (icon === "bell") bell(ctx, cx, y, is * 0.9, pal[1]);
    else check(ctx, cx, y, is * 0.7, pal[1], size * 0.14, 1);
  }
  text(ctx, s, icon ? tx - is - size * 0.35 : tx, y, { size, weight: 700, color: pal[1], base: "middle" });
  ctx.restore();
  return w;
}

/** The app's primary button: teal gradient, white text, 12px corners, soft teal shadow. Centred on (cx, cy). */
export function button(ctx, label, cx, cy, w, h, { size = 26, kind = "primary", scale = 1, alpha = 1, arrow = false } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const r = h * 0.24;
  if (kind === "primary") {
    ctx.save();
    ctx.shadowColor = "rgba(12,96,95,0.28)";
    ctx.shadowBlur = h * 0.5;
    ctx.shadowOffsetY = h * 0.18;
    rrect(ctx, -w / 2, -h / 2, w, h, r);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, C.tealHi);
    g.addColorStop(1, "#0c665f");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  } else {
    rrect(ctx, -w / 2, -h / 2, w, h, r);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const col = kind === "primary" ? C.white : C.navy;
  if (arrow) {
    // the reference's "→" sits on the left end in RTL, pointing left (forward)
    const ax = -w / 2 + h * 0.55;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(ax + size * 0.5, 0); ctx.lineTo(ax - size * 0.35, 0);
    ctx.moveTo(ax, -size * 0.35); ctx.lineTo(ax - size * 0.35, 0); ctx.lineTo(ax, size * 0.35);
    ctx.stroke();
    ctx.restore();
  }
  text(ctx, label, arrow ? size * 0.5 : 0, size * 0.36, { size, weight: 800, color: col, align: "center" });
  ctx.restore();
}

/** Mint rounded tile with a teal line icon (the reference's feature icons). */
export function iconTile(ctx, cx, cy, s, draw) {
  rrect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.28);
  ctx.fillStyle = C.mint;
  ctx.fill();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = C.teal;
  ctx.fillStyle = C.teal;
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  draw(ctx, s * 0.5);
  ctx.restore();
}

export function check(ctx, cx, cy, s, color, lw, p = 1) {
  if (p <= 0) return;
  const pts = [[-0.5, 0.02], [-0.15, 0.36], [0.5, -0.34]];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const l1 = Math.hypot(0.35, 0.34), l2 = Math.hypot(0.65, 0.7), L = l1 + l2;
  const d = p * L;
  ctx.moveTo(cx + pts[0][0] * s, cy + pts[0][1] * s);
  if (d <= l1) {
    const u = d / l1;
    ctx.lineTo(cx + lerp(pts[0][0], pts[1][0], u) * s, cy + lerp(pts[0][1], pts[1][1], u) * s);
  } else {
    ctx.lineTo(cx + pts[1][0] * s, cy + pts[1][1] * s);
    const u = (d - l1) / l2;
    ctx.lineTo(cx + lerp(pts[1][0], pts[2][0], u) * s, cy + lerp(pts[1][1], pts[2][1], u) * s);
  }
  ctx.stroke();
  ctx.restore();
}

export function cross(ctx, cx, cy, s, color, lw, p = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  const h = s / 2;
  const a = clamp(p * 2), b = clamp(p * 2 - 1);
  ctx.beginPath();
  ctx.moveTo(cx - h, cy - h);
  ctx.lineTo(cx - h + 2 * h * a, cy - h + 2 * h * a);
  if (b > 0) {
    ctx.moveTo(cx + h, cy - h);
    ctx.lineTo(cx + h - 2 * h * b, cy - h + 2 * h * b);
  }
  ctx.stroke();
  ctx.restore();
}

export function bell(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, s * 0.25);
  ctx.quadraticCurveTo(-s * 0.32, s * 0.12, -s * 0.32, -s * 0.08);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.42, 0, -s * 0.44);
  ctx.quadraticCurveTo(s * 0.3, -s * 0.42, s * 0.32, -s * 0.08);
  ctx.quadraticCurveTo(s * 0.32, s * 0.12, s * 0.42, s * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, s * 0.34, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Filled circle badge with a check that draws itself. */
export function okBadge(ctx, cx, cy, r, p, { fill = C.teal, color = C.white } = {}) {
  if (p <= 0) return;
  const s = ease.back(clamp(p * 1.6));
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * s, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  check(ctx, cx, cy, r * 1.05, color, r * 0.22, clamp(p * 1.6 - 0.45));
}

// ── the owner's logo (components/logo-paths.ts, traced from the brand reference) ─────────────────────────────
const LOGO = { navy: new Path2D(LOGO_NAVY), teal: new Path2D(LOGO_TEAL), w: 2240, h: 928 };

/**
 * Draw the logo with its height `h`, centred on (cx, cy). `ph` animates it:
 *   reveal 0→1  wipes the navy layer in from the right (emblem first, then the name),
 *   hat 0→1     drops the teal hard hat in with a spring.
 */
export function logo(ctx, cx, cy, h, ph = { reveal: 1, hat: 1 }, { dark = false } = {}) {
  const k = h / LOGO.h, w = LOGO.w * k;
  ctx.save();
  ctx.translate(cx - w / 2, cy - h / 2);
  ctx.scale(k, k);
  const draw = (path, color) => {
    ctx.save();
    ctx.translate(0, LOGO.h);
    ctx.scale(0.1, -0.1);
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  };
  const r = ease.out5(clamp(ph.reveal));
  if (r > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(LOGO.w * (1 - r) - 40, -200, LOGO.w * r + 80, LOGO.h + 400);
    ctx.clip();
    draw(LOGO.navy, dark ? C.white : C.navy);
    ctx.restore();
  }
  const hp = clamp(ph.hat);
  if (hp > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(hp * 4);
    ctx.translate(0, -LOGO.h * 0.45 * (1 - ease.spring(hp)));
    // the teal layer also holds the dot in the final mem: it follows the wipe like the rest of the name
    ctx.beginPath();
    ctx.rect(LOGO.w * (1 - r) - 40, -LOGO.h, LOGO.w * r + 80, LOGO.h * 3);
    if (r < 1) ctx.clip();
    draw(LOGO.teal, C.tealLogo);
    ctx.restore();
  }
  ctx.restore();
  return w;
}

// ── people and objects ───────────────────────────────────────────────────────
const HELMET = { formwork: "#d4f25a", rebar: "#ff7a45", plaster: "#ffffff", tiling: "#7fb2e5", masonry: "#f2c14e" };
const SKIN = ["#f0d7bf", "#b9865f", "#ebcda8", "#c99a72", "#e3bf9c", "#8d5a3b"];
const SHIRT = ["#0e2a44", "#4a5a66", "#7c4a2e", "#2e6b3f", "#163a5c", "#5b4636"];
const AV = { body: new Path2D("M8 48c1-9 7-13 16-13s15 4 16 13z"), dome: new Path2D("M13 23a11 11 0 0 1 22 0z") };

/** The app's illustrated worker avatar (no photos), from components/ui.tsx Avatar. */
export function avatar(ctx, cx, cy, size, id, trade = "formwork") {
  const k = size / 48;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#e9e1d0";
  ctx.fill();
  ctx.clip();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.arc(24, 26, 9, 0, Math.PI * 2);
  ctx.fillStyle = SKIN[id % SKIN.length];
  ctx.fill();
  ctx.fillStyle = SHIRT[id % SHIRT.length];
  ctx.fill(AV.body);
  ctx.fillStyle = HELMET[trade];
  ctx.strokeStyle = C.navy;
  ctx.lineWidth = 0.8;
  ctx.fill(AV.dome);
  ctx.stroke(AV.dome);
  rrect(ctx, 11, 22, 26, 2.6, 1.3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 0.75, 0, Math.PI * 2);
  ctx.strokeStyle = C.navy;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function star(ctx, cx, cy, r, color = C.navy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Padlock; `shut` 0 = shackle up and open, 1 = closed. */
export function padlock(ctx, cx, cy, s, shut, { body = C.teal, line = C.white } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  const lift = (1 - shut) * s * 0.32;
  ctx.strokeStyle = line;
  ctx.lineWidth = s * 0.11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, -s * 0.05 - lift * 0.1);
  ctx.lineTo(-s * 0.28, -s * 0.3 - lift);
  ctx.arc(0, -s * 0.3 - lift, s * 0.28, Math.PI, 0);
  ctx.lineTo(s * 0.28, -s * 0.05 - lift + (1 - shut) * s * 0.18);
  ctx.stroke();
  rrect(ctx, -s * 0.45, -s * 0.08, s * 0.9, s * 0.7, s * 0.14);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = s * 0.07;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, s * 0.22, s * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = line;
  ctx.fill();
  ctx.restore();
}

/** Light backdrop of the reference ads: white to mint, with soft translucent rounded shapes in the corners. */
export function softBg(ctx, W, H, t = 0) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, C.mint);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const blob = (x, y, s, rot, a) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    rrect(ctx, -s / 2, -s / 2, s, s, s * 0.3);
    ctx.fillStyle = `rgba(15,143,128,${a})`;
    ctx.fill();
    ctx.restore();
  };
  blob(W - 40 + Math.sin(t * 0.6) * 10, 60, 340, 0.75 + t * 0.03, 0.06);
  blob(W + 30, 230, 220, 0.6 + t * 0.02, 0.05);
  blob(60, H - 40 + Math.cos(t * 0.5) * 10, 300, 0.4 - t * 0.03, 0.05);
}

/** WhatsApp-style message bubble (green, tail at the start). Right edge at x. */
export function bubble(ctx, s, x, y, { size = 24, w = null, alpha = 1, scale = 1 } = {}) {
  const tw = w ?? measure(ctx, s, size, 500) + size * 1.4;
  const h = size * 2.1;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x - tw / 2, y);
  ctx.scale(scale, scale);
  ctx.translate(-(x - tw / 2), -y);
  ctx.save();
  ctx.shadowColor = "rgba(11,34,51,0.12)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  rrect(ctx, x - tw, y - h / 2, tw, h, size * 0.5);
  ctx.fillStyle = "#dcf8c6";
  ctx.fill();
  ctx.restore();
  text(ctx, s, x - size * 0.7, y + size * 0.35, { size, weight: 500 });
  ctx.restore();
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function rnd(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Money in the app's style: ₪ before the number, thousands separator. */
export const ils = (n) => "₪" + Math.round(n).toLocaleString("en-US");

/** "₪702" with the shekel sign at a smaller size, centred (or left/right aligned) on x. */
export function money(ctx, v, x, y, size, { align = "center", color = C.navy, weight = 900 } = {}) {
  ctx.save();
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = color;
  const digits = Math.round(v).toLocaleString("en-US");
  ctx.font = `${weight} ${size}px Heebo`;
  const dw = ctx.measureText(digits).width;
  ctx.font = `${Math.max(400, weight - 200)} ${size * 0.55}px Heebo`;
  const sw = ctx.measureText("₪").width + size * 0.06;
  const total = sw + dw;
  const x0 = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  ctx.fillText("₪", x0, y);
  ctx.font = `${weight} ${size}px Heebo`;
  ctx.fillText(digits, x0 + sw, y);
  ctx.restore();
  return total;
}
