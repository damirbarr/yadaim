// Drawing toolkit for the plates. Everything here is stateless: a plate calls these with the current
// time and gets the same pixels every time, so preview and render can never disagree.

export const C = {
  navy: "#0e2a44",
  deep: "#092238",
  lime: "#d4f25a",
  white: "#ffffff",
  paper: "#f7f6f2",
  cool: "#f4f8fb",
  line: "#dfe5e9",
  muted: "#526574",
  faint: "#738493",
  ok: "#168848",
  okBg: "#e7f4ec",
  warn: "#e69b21",
  bad: "#d94848",
  badBg: "#fbeaea",
  info: "#3277c8",
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

// ── canvas primitives ────────────────────────────────────────────────────────
export function font(ctx, size, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

export function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** White card with the design system's 1px line and very light shadow. */
export function card(ctx, x, y, w, h, { r = 22, fill = C.white, stroke = C.line, shadow = 0.07, lift = 18 } = {}) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = `rgba(14,42,68,${shadow})`;
    ctx.shadowBlur = lift * 2;
    ctx.shadowOffsetY = lift * 0.45;
  }
  rrect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  if (stroke) {
    rrect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** Hebrew text, right-aligned at x by default (RTL). */
export function text(ctx, s, x, y, { size = 40, weight = 800, color = C.navy, align = "right", alpha = 1, base = "alphabetic" } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  font(ctx, size, weight);
  ctx.direction = "rtl";
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
 * Returns the line's layout so callers can underline or highlight a word.
 */
export function kinetic(ctx, words, t, starts, x, y, { size = 96, weight = 900, color = C.navy, colors = {}, align = "right", stagger = 0.08, dur = 0.55, gap = 0.28, span = null, out = null } = {}) {
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
  // Lime fill behind a run of words with navy text: the brand's highlight, never lime text on white.
  if (span) {
    const mp = ep(t, span.at, 0.45, ease.inOut);
    const q = outQ(span.from);
    if (mp > 0 && q < 1) {
      const pad = size * 0.16;
      const r = boxes[span.from].right + pad, l = boxes[span.to].left - pad;
      const hw = (r - l) * mp;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      ctx.fillStyle = C.lime;
      rrect(ctx, r - hw, y - size * 0.84, hw, size * 1.08, size * 0.1);
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
    const inSpan = span && i >= span.from && i <= span.to && ep(t, span.at, 0.45) > 0.3;
    text(ctx, words[i], b.right, y + dy, { size, weight, color: inSpan ? C.navy : colors[i] ?? color, alpha: 1 - q });
    ctx.restore();
  });
  return { boxes, total, left: right0 - total };
}

/** A hand-drawn-feeling lime stroke under a span, drawn left to right as p goes 0→1. */
export function underline(ctx, x0, x1, y, p, { color = C.lime, width = 14 } = {}) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  const n = 24;
  const w = x1 - x0;
  for (let i = 0; i <= n * p; i++) {
    const u = i / n;
    const xx = x1 - u * w; // RTL: starts at the right
    const yy = y + Math.sin(u * Math.PI * 2.2) * 3 + u * 4;
    i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  ctx.restore();
}

/** Status chip: icon + text, never colour alone. */
export function chip(ctx, s, x, y, { kind = "ok", size = 22, align = "right", alpha = 1, scale = 1 } = {}) {
  const pal = {
    ok: [C.okBg, C.ok],
    bad: [C.badBg, C.bad],
    info: ["#e8f1fb", C.info],
    lime: [C.lime, C.navy],
    navy: [C.navy, C.white],
    ghost: ["#eef2f5", C.navy],
  }[kind];
  const tw = measure(ctx, s, size, 700);
  const icon = kind === "ok" || kind === "bad" || kind === "lime" ? size * 0.95 : 0;
  const w = tw + size * 1.2 + (icon ? icon + size * 0.35 : 0);
  const h = size * 1.75;
  const x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x0 + w / 2, y);
  ctx.scale(scale, scale);
  ctx.translate(-(x0 + w / 2), -y);
  rrect(ctx, x0, y - h / 2, w, h, size * 0.4);
  ctx.fillStyle = pal[0];
  ctx.fill();
  const tx = x0 + w - size * 0.6;
  if (icon) {
    const cx = tx - icon / 2;
    if (kind === "bad") cross(ctx, cx, y, icon * 0.62, pal[1], size * 0.13, 1);
    else check(ctx, cx, y, icon * 0.7, pal[1], size * 0.14, 1);
  }
  text(ctx, s, icon ? tx - icon - size * 0.35 : tx, y, { size, weight: 700, color: pal[1], base: "middle" });
  ctx.restore();
  return w;
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

/** Filled circle badge with a check that draws itself. */
export function okBadge(ctx, cx, cy, r, p, { fill = C.ok, color = C.white } = {}) {
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

// ── brand pieces (ported from components/ui.tsx) ─────────────────────────────
const P = (d) => new Path2D(d);
const LOGO = {
  corners: P("M1 4h6M4 1v6M41 4h6M44 1v6M1 44h6M4 41v6M41 44h6M44 41v6"),
  dome: P("M14 23.5a10 10 0 0 1 20 0z"),
  ribs: P("M24 13.5v10M20.5 15.2l1.2 8.3M27.5 15.2l-1.2 8.3"),
  handL: P("M10 22c-1.6 0-2.4 1.3-2.4 3v6.5c0 2.6 1.5 4.6 3.6 5.8l4.3 2.4v2.3h7.3v-4.1c0-2.4-1-4.3-2.8-5.6l-4.1-3v-3.3c0-1-.8-1.8-1.8-1.8s-1.8.8-1.8 1.8v1.8l-.5-.4V24c0-1.2-.7-2-1.8-2z"),
  handR: P("M38 22c1.6 0 2.4 1.3 2.4 3v6.5c0 2.6-1.5 4.6-3.6 5.8l-4.3 2.4v2.3h-7.3v-4.1c0-2.4 1-4.3 2.8-5.6l4.1-3v-3.3c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v1.8l.5-.4V24c0-1.2.7-2 1.8-2z"),
};

/**
 * The Yadaim mark, assembled over time: frame draws, hat drops, hands slide in.
 * `ph` = { frame, hat, hands } progress 0..1 each. Drawn in a 48-unit box scaled to `size`.
 */
export function logoMark(ctx, cx, cy, size, ph, { dark = false } = {}) {
  const c = dark ? C.white : C.navy;
  const k = size / 48;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(k, k);
  ctx.lineJoin = "round";
  // frame: the square traces itself, then the corner ticks pop
  const fp = ph.frame;
  if (fp > 0) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.6;
    const per = 160, d = per * ease.inOut(clamp(fp * 1.3));
    ctx.setLineDash([d, per]);
    ctx.beginPath();
    ctx.rect(4, 4, 40, 40);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = clamp(fp * 3 - 2);
    ctx.lineWidth = 1.4;
    ctx.stroke(LOGO.corners);
    ctx.globalAlpha = 1;
  }
  // hat drops from above and lands with a spring
  const hp = ph.hat;
  if (hp > 0) {
    ctx.save();
    ctx.translate(0, -30 * (1 - ease.spring(hp)));
    ctx.globalAlpha = clamp(hp * 4);
    ctx.fillStyle = C.lime;
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.4;
    ctx.fill(LOGO.dome);
    ctx.stroke(LOGO.dome);
    ctx.lineWidth = 1.1;
    ctx.stroke(LOGO.ribs);
    rrect(ctx, 11.5, 23.2, 25, 3, 1.5);
    ctx.fillStyle = C.lime;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
  // hands slide up from below the frame and grip the brim
  const gp = ph.hands;
  if (gp > 0) {
    const e = ease.back(gp);
    ctx.fillStyle = c;
    ctx.save();
    ctx.translate(-8 * (1 - e), 14 * (1 - e));
    ctx.globalAlpha = clamp(gp * 3);
    ctx.fill(LOGO.handL);
    ctx.restore();
    ctx.save();
    ctx.translate(8 * (1 - e), 14 * (1 - e));
    ctx.globalAlpha = clamp(gp * 3);
    ctx.fill(LOGO.handR);
    ctx.restore();
  }
  ctx.restore();
}

/** The word mark "ידיים" with its hazard-stripe underline. Right edge at x. */
export function wordMark(ctx, x, y, size, ph, { dark = false } = {}) {
  const c = dark ? C.white : C.navy;
  const w = measure(ctx, "ידיים", size, 900);
  // the word wipes in from the right
  const wp = ease.out5(ph.word);
  if (wp > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - w * wp - 4, y - size, w * wp + 8, size * 1.4);
    ctx.clip();
    text(ctx, "ידיים", x + (1 - wp) * 30, y, { size, weight: 900, color: c });
    ctx.restore();
  }
  // stripe: three lime parallelograms then a navy bar (from the SVG, 80×5 units)
  const sp = ph.stripe;
  if (sp > 0) {
    const sy = y + size * 0.2, sh = size * 0.17, k = w / 80;
    ctx.save();
    ctx.translate(x - w, sy);
    ctx.scale(k, sh / 5);
    const bits = [[0, C.lime], [16, C.lime], [32, C.lime]];
    bits.forEach(([o, col], i) => {
      const q = ease.back(clamp(sp * 4 - i * 0.6));
      if (q <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp(q * 2);
      ctx.translate(o + 6.5, 2.5);
      ctx.scale(q, 1);
      ctx.translate(-(o + 6.5), -2.5);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(o, 5); ctx.lineTo(o + 3, 0); ctx.lineTo(o + 13, 0); ctx.lineTo(o + 10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    const bq = ease.out(clamp(sp * 2 - 0.6));
    ctx.fillStyle = c;
    ctx.fillRect(80 - 32 * bq, 0, 32 * bq, 5);
    ctx.restore();
  }
  return w;
}

const HELMET = { formwork: "#d4f25a", rebar: "#ff7a45", plaster: "#ffffff", tiling: "#7fb2e5", masonry: "#f2c14e" };
const SKIN = ["#f0d7bf", "#b9865f", "#ebcda8", "#c99a72", "#e3bf9c", "#8d5a3b"];
const SHIRT = ["#0e2a44", "#4a5a66", "#7c4a2e", "#2e6b3f", "#163a5c", "#5b4636"];
const AV = { body: P("M8 48c1-9 7-13 16-13s15 4 16 13z"), dome: P("M13 23a11 11 0 0 1 22 0z") };

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
export function padlock(ctx, cx, cy, s, shut, { body = C.lime, line = C.navy } = {}) {
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
  rrect(ctx, -s * 0.45, -s * 0.08, s * 0.9, s * 0.7, s * 0.12);
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

/** Diagonal hazard stripes (the landing page's band) filling a rect. */
export function hazard(ctx, x, y, w, h, { color = C.lime, period = 56, offset = 0 } = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  const half = period / 2;
  for (let s = -h - period + (offset % period); s < w + h; s += period) {
    ctx.beginPath();
    ctx.moveTo(x + s, y + h);
    ctx.lineTo(x + s + h, y);
    ctx.lineTo(x + s + h + half, y);
    ctx.lineTo(x + s + half, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function rnd(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Money in the app's style: ₪ before the number, thousands separator. */
export const ils = (n) => "₪" + Math.round(n).toLocaleString("en-US");
