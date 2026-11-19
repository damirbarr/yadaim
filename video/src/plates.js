// The nine plates. Each is draw(ctx, t, Q) where t is the video time in seconds and Q the cue table
// from timeline.json. Pure functions of t: no state, no randomness except the seeded rnd().
import {
  C, clamp, lerp, prog, ease, ep, rrect, card, text, measure, kinetic, underline, chip, check, cross, okBadge,
  logoMark, wordMark, avatar, star, padlock, hazard, rnd, ils,
} from "./kit.js";

const W = 1920, H = 1080;
const COL = 1740; // right edge of the text column (RTL)
const MAXW = 660; // its width: the left half belongs to the phone or card

const CREW = [
  { name: "סרגיי ב.", years: 12, rate: "4.9", id: 1 },
  { name: "ראג׳ש ק.", years: 9, rate: "4.8", id: 4 },
  { name: "מיכאיל ד.", years: 15, rate: "4.9", id: 2 },
  { name: "ואנג ל.", years: 7, rate: "4.7", id: 3 },
];
const DAY = 702; // ₪78/h all-in (lodging + transport by the agency) × 9 h: the landing page's sample crew price

/** "₪702" with the shekel sign at a smaller size, centred (or left/right aligned) on x. */
function money(ctx, v, x, y, size, { align = "center", color = C.navy, weight = 900 } = {}) {
  ctx.save();
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = color;
  const digits = Math.round(v).toLocaleString("en-US");
  ctx.font = `${weight} ${size}px Heebo`;
  const dw = ctx.measureText(digits).width;
  ctx.font = `${weight - 200} ${size * 0.55}px Heebo`;
  const sw = ctx.measureText("₪").width + size * 0.06;
  const total = sw + dw;
  const x0 = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  ctx.fillText("₪", x0, y);
  ctx.font = `${weight} ${size}px Heebo`;
  ctx.fillText(digits, x0 + sw, y);
  ctx.restore();
  return total;
}

function bg(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

/** Eyebrow chip + multi-line kinetic headline + optional sub line, right-aligned in the text column. */
function column(ctx, t, { eyebrow, eyebrowAt, lines, at, sub, subAt, y = 380, size = 84, out = null, kind = "navy", dark = false }) {
  const color = dark ? C.white : C.navy;
  // shrink to fit the column (between the left visual and the right margin)
  const widest = Math.max(...lines.map((l) => { const ws = Array.isArray(l) ? l : l.w; return measure(ctx, ws.join(" "), size, 900); }));
  size = Math.min(size, (size * MAXW) / widest);
  if (eyebrow) {
    const p = ep(t, eyebrowAt ?? at - 0.1, 0.45, ease.back);
    const q = out == null ? 0 : ep(t, out, 0.3);
    if (p > 0) chip(ctx, eyebrow, COL, y - size * 1.25, { kind, size: 26, alpha: clamp(p * 2) * (1 - q), scale: 0.8 + 0.2 * p });
  }
  let yy = y;
  const res = [];
  lines.forEach((l, i) => {
    const words = Array.isArray(l) ? l : l.w;
    res.push(kinetic(ctx, words, t, at + i * 0.32, COL, yy, { size, color, stagger: 0.07, out: out == null ? null : out + i * 0.05, span: l.span, colors: l.colors }));
    yy += size * 1.18;
  });
  if (sub) {
    const p = ep(t, subAt ?? at + lines.length * 0.32 + 0.25, 0.6);
    const q = out == null ? 0 : ep(t, out, 0.3);
    text(ctx, sub, COL, yy + 20 + (1 - p) * 20, { size: 34, weight: 400, color: dark ? "#b8c7d6" : C.muted, alpha: p * (1 - q) });
  }
  return res;
}

/** A tap ripple where a finger would press. */
function tap(ctx, x, y, t, at) {
  const p = prog(t, at - 0.12, 0.6);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  const r = 14 + p * 46;
  ctx.globalAlpha = (1 - p) * 0.55;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = C.navy;
  ctx.fill();
  ctx.restore();
}

/** Phone frame. Returns the screen rect; draw the screen inside with clipScreen(). */
function phone(ctx, cx, top, w = 450, h = 920) {
  const x = cx - w / 2;
  ctx.save();
  ctx.shadowColor = "rgba(14,42,68,0.22)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 30;
  rrect(ctx, x, top, w, h, 64);
  ctx.fillStyle = C.deep;
  ctx.fill();
  ctx.restore();
  const s = { x: x + 14, y: top + 14, w: w - 28, h: h - 28, r: 52 };
  rrect(ctx, s.x, s.y, s.w, s.h, s.r);
  ctx.fillStyle = C.white;
  ctx.fill();
  return s;
}
function clipScreen(ctx, s) {
  ctx.save();
  rrect(ctx, s.x, s.y, s.w, s.h, s.r);
  ctx.clip();
}
function appBar(ctx, s, title, sub) {
  ctx.fillStyle = C.deep;
  ctx.fillRect(s.x, s.y, s.w, 150);
  // notch
  rrect(ctx, s.x + s.w / 2 - 60, s.y + 14, 120, 32, 16);
  ctx.fillStyle = "#000";
  ctx.fill();
  text(ctx, title, s.x + s.w - 30, s.y + 108, { size: 32, weight: 800, color: C.white });
  if (sub) text(ctx, sub, s.x + 30, s.y + 108, { size: 22, weight: 500, color: "#b8c7d6", align: "left" });
}

/** Worker row used in the phone lists. Right edge at x. */
function workerRow(ctx, x, y, w, wk, { sub, h = 116 } = {}) {
  card(ctx, x - w, y, w, h, { r: 18, shadow: 0.05, lift: 8 });
  avatar(ctx, x - 48, y + h / 2, 62, wk.id);
  text(ctx, wk.name, x - 92, y + 48, { size: 28, weight: 800 });
  text(ctx, sub ?? `טפסן · ${wk.years} שנות ותק`, x - 92, y + 86, { size: 21, weight: 400, color: C.muted });
}

// ── 1. hook ──────────────────────────────────────────────────────────────────
export function hook(ctx, t, Q) {
  bg(ctx, C.deep);
  // drifting question marks: the uncertainty every morning on site
  for (let i = 0; i < 26; i++) {
    const p = ep(t, Q["hook.q"] + rnd(i) * 0.9, 1.2);
    if (p <= 0) continue;
    const x = 120 + rnd(i + 40) * (W - 240);
    const y = 140 + rnd(i + 80) * (H - 280) - t * 18 * (0.5 + rnd(i + 9));
    ctx.save();
    ctx.globalAlpha = p * (0.08 + rnd(i + 3) * 0.14);
    ctx.translate(x, y);
    ctx.rotate((rnd(i + 5) - 0.5) * 0.6);
    text(ctx, "?", 0, 0, { size: 60 + rnd(i + 7) * 120, weight: 900, color: C.lime, align: "center" });
    ctx.restore();
  }
  // small time stamp, ticking
  const lp = ep(t, Q["hook.label"], 0.5);
  const sec = Math.floor(clamp(t * 7, 0, 59));
  const stamp = `06:29:${String(sec).padStart(2, "0")}`;
  chip(ctx, "יום עבודה חדש באתר", W / 2 + 10, 300 + (1 - lp) * 16, { kind: "ghost", size: 28, align: "left", alpha: lp });
  text(ctx, stamp, W / 2 - 10, 312 + (1 - lp) * 16, { size: 34, weight: 700, color: C.lime, align: "right", alpha: lp });

  // headline, slightly punched in on every word
  const punch = [Q["hook.w1"], Q["hook.w2"], Q["hook.w3"], Q["hook.w4"]].reduce((a, c) => a + Math.exp(-Math.max(0, t - c) * 9) * (t >= c ? 1 : 0), 0);
  ctx.save();
  const zoom = 1 + 0.012 * punch + 0.03 * ep(t, 2.6, 1.4, ease.inOut);
  ctx.translate(W / 2, 540);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -540);
  kinetic(ctx, ["מי", "מגיע", "היום", "לאתר?"], t, [Q["hook.w1"], Q["hook.w2"], Q["hook.w3"], Q["hook.w4"]], W / 2, 560, { size: 160, color: C.white, align: "center", dur: 0.4 });
  kinetic(ctx, ["ובכמה", "זה", "ייגמר", "בסוף", "החודש?"], t, Q["hook.q"], W / 2, 720, { size: 74, weight: 700, color: "#b8c7d6", align: "center", stagger: 0.06, span: { from: 0, to: 2, at: Q["hook.q"] + 0.55 } });
  ctx.restore();
}

// ── 2. brand ─────────────────────────────────────────────────────────────────
export function brand(ctx, t, Q) {
  bg(ctx, C.cool);
  const ph = {
    frame: prog(t, Q["brand.frame"], 0.7),
    hat: prog(t, Q["brand.hat"], 0.9),
    hands: prog(t, Q["brand.hands"], 0.55),
    word: prog(t, Q["brand.word"], 0.5),
    stripe: prog(t, Q["brand.stripe"], 0.6),
  };
  // group (mark + word) centred, then it rises to make room for the tagline
  const up = ep(t, Q["brand.l1"] - 0.25, 0.7, ease.inOut);
  const k = lerp(1, 0.78, up);
  const gy = lerp(500, 330, up);
  const ms = 230, gap = 40, ws = 190;
  const ww = measure(ctx, "ידיים", ws, 900);
  const total = ms + gap + ww;
  ctx.save();
  ctx.translate(W / 2, gy);
  ctx.scale(k, k);
  const right = total / 2;
  logoMark(ctx, right - ms / 2, 0, ms, ph);
  wordMark(ctx, right - ms - gap, ws * 0.33, ws, ph);
  ctx.restore();
  kinetic(ctx, ["יודעים", "מראש", "מי", "מגיע", "לאתר,"], t, Q["brand.l1"], W / 2, 690, { size: 84, align: "center", stagger: 0.07 });
  kinetic(ctx, ["ומה", "המחיר", "הסופי", "ליום."], t, Q["brand.l2"], W / 2, 800, { size: 84, align: "center", stagger: 0.07, span: { from: 1, to: 2, at: Q["brand.mark"] } });
}

// ── 3. search ────────────────────────────────────────────────────────────────
export function search(ctx, t, Q) {
  bg(ctx, C.paper);
  column(ctx, t, {
    eyebrow: "לקבלנים",
    lines: [["בוחרים", "עובד", "לפי", "שם,"], { w: ["ואותו", "עובד", "מגיע", "לאתר."] }],
    at: Q["search.title"],
    sub: "רק עובדים פנויים מתאגידים מורשים.",
    y: 430,
    size: 88,
  });

  const enter = ep(t, Q["search.title"] - 0.15, 0.8, ease.out5);
  const s = phone(ctx, 600, 80 + (1 - enter) * 220);
  clipScreen(ctx, s);
  appBar(ctx, s, "חיפוש עובדים", "נתניה");
  const xr = s.x + s.w - 26, iw = s.w - 52;

  // the form: three fields fill in, then the lime button is pressed and the form slides away
  const pressed = Q["search.press"];
  const away = ep(t, pressed + 0.12, 0.45, ease.inOut);
  ctx.save();
  ctx.translate(0, -away * 420);
  ctx.globalAlpha = 1 - away;
  const fields = [
    ["איזה עובד צריך?", "טפסנות", Q["search.type1"]],
    ["איפה עובדים?", "נתניה", Q["search.type2"]],
    ["מתי מתחילים?", "יום ד׳ · 5 ימים", Q["search.type3"]],
  ];
  fields.forEach(([lab, val, at], i) => {
    const y = s.y + 190 + i * 118;
    text(ctx, lab, xr, y, { size: 20, weight: 500, color: C.muted });
    rrect(ctx, xr - iw, y + 12, iw, 66, 12);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.strokeStyle = t >= at && t < at + 0.45 ? C.navy : C.line;
    ctx.lineWidth = t >= at && t < at + 0.45 ? 2.5 : 1.5;
    ctx.stroke();
    const n = Math.floor(clamp((t - at) / 0.32) * val.length);
    if (n > 0) text(ctx, val.slice(0, n), xr - 20, y + 56, { size: 27, weight: 700 });
  });
  const by = s.y + 560;
  const dip = 1 - 0.05 * Math.sin(Math.PI * prog(t, pressed - 0.05, 0.2));
  ctx.save();
  ctx.translate(s.x + s.w / 2, by + 34);
  ctx.scale(dip, dip);
  rrect(ctx, -iw / 2, -34, iw, 68, 12);
  ctx.fillStyle = C.lime;
  ctx.fill();
  text(ctx, "חיפוש עובדים", 0, 10, { size: 28, weight: 800, align: "center" });
  ctx.restore();
  ctx.restore();
  tap(ctx, s.x + s.w / 2 - 40, by + 34, t, pressed);

  // results
  const head = ep(t, Q["search.card1"] - 0.1, 0.4);
  text(ctx, "4 טפסנים פנויים · יום ד׳", xr, s.y + 200 + (1 - head) * 30, { size: 26, weight: 800, alpha: head });
  const picks = [Q["search.pick1"], Q["search.pick2"], Q["search.pick3"]];
  CREW.forEach((wk, i) => {
    const at = Q[`search.card${i + 1}`];
    const p = ep(t, at, 0.5, ease.out5);
    if (p <= 0) return;
    const y = s.y + 232 + i * 132 + (1 - p) * 120;
    ctx.save();
    ctx.globalAlpha = clamp(p * 1.5);
    workerRow(ctx, xr, y, iw, wk, { sub: `${wk.years} שנות ותק` });
    star(ctx, xr - 218, y + 79, 9);
    text(ctx, wk.rate, xr - 230, y + 86, { size: 20, weight: 700 });
    // add / picked button on the left
    const picked = i < 3 ? ep(t, picks[i], 0.3, ease.back) : 0;
    const bx = s.x + 26 + 12, bw = 90, bh = 48, byy = y + 34;
    rrect(ctx, bx, byy, bw, bh, 10);
    ctx.fillStyle = picked > 0.5 ? C.lime : C.white;
    ctx.fill();
    ctx.strokeStyle = picked > 0.5 ? C.lime : C.navy;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (picked > 0.5) {
      check(ctx, bx + bw - 20, byy + bh / 2, 16, C.navy, 3.2, clamp((picked - 0.5) * 2));
      text(ctx, "נבחר", bx + bw - 34, byy + 32, { size: 21, weight: 800 });
    } else {
      text(ctx, "הוספה", bx + bw / 2, byy + 32, { size: 21, weight: 700, align: "center" });
    }
    ctx.restore();
    if (i < 3) tap(ctx, bx + bw / 2, byy + bh / 2, t, picks[i]);
  });

  // selection bar slides up from the bottom
  const nPicked = picks.filter((p) => t >= p).length;
  const bar = ep(t, Q["search.pick1"], 0.45, ease.out5);
  if (bar > 0) {
    const bh = 128, y = s.y + s.h - bh * bar;
    ctx.fillStyle = C.deep;
    ctx.fillRect(s.x, y, s.w, bh);
    const pop = 1 + 0.12 * Math.exp(-Math.max(0, t - picks[nPicked - 1]) * 10);
    ctx.save();
    ctx.translate(xr, y + 58);
    ctx.scale(pop, pop);
    text(ctx, `${nPicked === 1 ? "טפסן אחד" : `${nPicked} טפסנים`} · ${ils(nPicked * DAY)}`, 0, 0, { size: 27, weight: 800, color: C.white });
    ctx.restore();
    text(ctx, "ליום · כולל לינה והסעה", xr, y + 94, { size: 19, weight: 400, color: "#b8c7d6" });
    const cta = 1 + 0.08 * Math.sin(Math.PI * prog(t, Q["search.bar"], 0.3));
    ctx.save();
    ctx.translate(s.x + 85, y + 62);
    ctx.scale(cta, cta);
    rrect(ctx, -59, -32, 118, 64, 12);
    ctx.fillStyle = C.lime;
    ctx.fill();
    text(ctx, "המשך", 0, 10, { size: 24, weight: 800, align: "center" });
    ctx.restore();
  }
  ctx.restore();
}

// ── 4. docs ──────────────────────────────────────────────────────────────────
export function docs(ctx, t, Q) {
  bg(ctx, C.cool);
  column(ctx, t, {
    eyebrow: "מאומתים",
    eyebrowAt: Q["docs.zoom"] + 0.2,
    lines: [["רק", "עובדים", "מאומתים,"], ["מתאגידים", "מורשים."]],
    at: Q["docs.zoom"] + 0.3,
    sub: "כל האישורים בתוקף עד יום העבודה האחרון.",
    y: 430,
    size: 92,
  });
  const p = ep(t, Q["docs.zoom"], 0.9, ease.out5);
  const x = 170, y = 140, w = 820, h = 800;
  ctx.save();
  const sc = lerp(0.82, 1, p);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(sc, sc);
  ctx.rotate((1 - p) * -0.04);
  ctx.translate(-(x + w / 2), -(y + h / 2) + (1 - p) * 80);
  ctx.globalAlpha = clamp(p * 1.4);
  card(ctx, x, y, w, h, { r: 28, shadow: 0.1, lift: 30 });
  const xr = x + w - 50;
  avatar(ctx, xr - 70, y + 120, 140, 1);
  text(ctx, "סרגיי ב.", xr - 170, y + 112, { size: 58, weight: 900 });
  text(ctx, "טפסן · 12 שנות ותק", xr - 170, y + 162, { size: 30, weight: 400, color: C.muted });
  star(ctx, x + 200, y + 106, 16);
  text(ctx, "4.9", x + 176, y + 118, { size: 34, weight: 800 });
  text(ctx, "דירוג מקבלנים", x + 260, y + 160, { size: 22, weight: 400, color: C.faint });
  ctx.fillStyle = C.line;
  ctx.fillRect(x + 50, y + 230, w - 100, 1.5);
  text(ctx, "מסמכים", xr, y + 296, { size: 30, weight: 800 });
  const rows = [
    ["אשרת עבודה (ב/1) בענף הבנייה", Q["docs.d1"]],
    ["דרכון", Q["docs.d2"]],
    ["ביטוח רפואי", Q["docs.d3"]],
    ["אישור עבודה בגובה", Q["docs.d4"]],
  ];
  rows.forEach(([name, at], i) => {
    const ry = y + 330 + i * 86;
    rrect(ctx, x + 50, ry, w - 100, 70, 14);
    ctx.fillStyle = t >= at ? "#f5fbf7" : "#f7f9fa";
    ctx.fill();
    // doc icon
    ctx.save();
    ctx.strokeStyle = C.navy;
    ctx.lineWidth = 2.4;
    rrect(ctx, xr - 34, ry + 18, 26, 34, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xr - 28, ry + 30); ctx.lineTo(xr - 14, ry + 30);
    ctx.moveTo(xr - 28, ry + 39); ctx.lineTo(xr - 18, ry + 39);
    ctx.stroke();
    ctx.restore();
    text(ctx, name, xr - 56, ry + 46, { size: 27, weight: 500 });
    const cp = ep(t, at, 0.4, ease.back);
    if (cp > 0) chip(ctx, "בתוקף", x + 72, ry + 35, { kind: "ok", size: 24, align: "left", scale: 0.6 + 0.4 * cp, alpha: clamp(cp * 2) });
  });
  // validity vs booking: the booking sits entirely inside the documents' validity
  const rp = ep(t, Q["docs.range"], 0.7, ease.inOut);
  if (rp > 0) {
    const ry = y + 700, bx0 = x + 50, bw = w - 100;
    ctx.globalAlpha = clamp(rp * 2);
    rrect(ctx, bx0, ry - 12, bw, 24, 12);
    ctx.fillStyle = "#e3e9ed";
    ctx.fill();
    rrect(ctx, bx0 + bw * (1 - rp), ry - 12, bw * rp, 24, 12);
    ctx.fillStyle = C.ok;
    ctx.fill();
    const bp = ep(t, Q["docs.range"] + 0.35, 0.45, ease.back);
    if (bp > 0) {
      const b1 = bx0 + bw * 0.52, b2 = bx0 + bw * 0.82;
      ctx.save();
      ctx.translate((b1 + b2) / 2, ry);
      ctx.scale(1, bp);
      rrect(ctx, (b1 - b2) / 2, -26, b2 - b1, 52, 10);
      ctx.fillStyle = C.lime;
      ctx.fill();
      ctx.strokeStyle = C.navy;
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, "ההזמנה", 0, 10, { size: 24, weight: 800, align: "center" });
      ctx.restore();
    }
    text(ctx, "תוקף המסמכים", xr, ry + 62, { size: 22, weight: 500, color: C.ok, alpha: rp });
    const ok = ep(t, Q["docs.ok"], 0.4, ease.back);
    if (ok > 0) chip(ctx, "בתוקף עד סוף העבודה", x + 50, ry + 56, { kind: "ok", size: 22, align: "left", scale: 0.7 + 0.3 * ok, alpha: clamp(ok * 2) });
  }
  ctx.restore();
}

// ── 5. price ─────────────────────────────────────────────────────────────────
export function price(ctx, t, Q) {
  bg(ctx, C.paper);
  column(ctx, t, {
    lines: [["מחיר", "יומי", "סופי."], { w: ["בלי", "הפתעות", "בסוף", "החודש."], span: { from: 1, to: 1, at: Q["price.badge"] } }],
    at: Q["price.title"],
    sub: "בוחרים מי מסיע ומי מספק לינה, והמחיר מתעדכן.",
    y: 470,
    size: 92,
  });
  const p = ep(t, Q["price.title"] - 0.1, 0.8, ease.out5);
  const x = 190, y = 170, w = 780, h = 740;
  ctx.save();
  ctx.translate(0, (1 - p) * 140);
  ctx.globalAlpha = clamp(p * 1.5);
  card(ctx, x, y, w, h, { r: 28, shadow: 0.1, lift: 30 });
  const xr = x + w - 56;
  avatar(ctx, xr - 36, y + 80, 72, 1);
  text(ctx, "טפסן · נתניה", xr - 92, y + 74, { size: 32, weight: 800 });
  text(ctx, "יום ד׳ · 9 שעות עבודה", xr - 92, y + 112, { size: 24, weight: 400, color: C.muted });

  // price: counts up, then each toggle adds its part
  const t1 = Q["price.toggle1"], t2 = Q["price.toggle2"];
  const v0 = 576 * ep(t, Q["price.count"], 0.9, ease.out5);
  const v = v0 + 72 * ep(t, t1 + 0.1, 0.35) + 54 * ep(t, t2 + 0.1, 0.35);
  const pop = 1 + 0.06 * (Math.exp(-Math.max(0, t - t1 - 0.1) * 8) * (t > t1 + 0.1) + Math.exp(-Math.max(0, t - t2 - 0.1) * 8) * (t > t2 + 0.1));
  ctx.save();
  ctx.translate(x + w / 2, y + 300);
  ctx.scale(pop, pop);
  money(ctx, v, 0, 0, 190);
  ctx.restore();
  text(ctx, "ליום לעובד", x + w / 2, y + 360, { size: 30, weight: 500, color: C.muted, align: "center" });

  // two segmented toggles; the lime pill slides to the new choice
  const segs = [
    ["לינה", ["אצל התאגיד", "אצלנו"], t1],
    ["הסעה", ["התאגיד מסיע", "אנחנו מסיעים"], t2],
  ];
  segs.forEach(([lab, opts, at], i) => {
    const sy = y + 430 + i * 104;
    text(ctx, lab, xr, sy + 46, { size: 28, weight: 800 });
    const sx = x + 56, sw = w - 112 - 120, sh = 66;
    rrect(ctx, sx, sy, sw, sh, 12);
    ctx.fillStyle = "#eef2f5";
    ctx.fill();
    // option 0 on the right, option 1 on the left (RTL); start on option 1, move to 0
    const m = ep(t, at, 0.35, ease.inOut);
    const half = (sw - 12) / 2;
    const px = lerp(sx + 6, sx + 6 + half, m);
    rrect(ctx, px, sy + 6, half, sh - 12, 9);
    ctx.fillStyle = C.lime;
    ctx.fill();
    text(ctx, opts[0], sx + 6 + half * 1.5, sy + 43, { size: 24, weight: m > 0.5 ? 800 : 500, align: "center", color: m > 0.5 ? C.navy : C.muted });
    text(ctx, opts[1], sx + 6 + half * 0.5, sy + 43, { size: 24, weight: m > 0.5 ? 500 : 800, align: "center", color: m > 0.5 ? C.muted : C.navy });
    tap(ctx, sx + 6 + half * 1.5, sy + sh / 2, t, at);
  });
  const bp = ep(t, Q["price.badge"], 0.45, ease.back);
  if (bp > 0) chip(ctx, "מחיר סופי ליום · כולל לינה והסעה", x + w / 2, y + h - 62, { kind: "lime", size: 27, align: "center", scale: 0.6 + 0.4 * bp, alpha: clamp(bp * 2) });
  ctx.restore();
}

// ── 6. lock: the evening before ─────────────────────────────────────────────
export function lock(ctx, t, Q) {
  bg(ctx, C.deep);
  const cx = 580, cy = 540, R = 270;
  const sweep = ep(t, Q["lock.sweep"], 1.3, ease.inOut);
  const hour = lerp(14, 18, sweep);
  const fade = 1 - ep(t, Q["lock.crew"] - 0.15, 0.4);
  // the clock
  if (fade > 0) {
    ctx.save();
    ctx.globalAlpha = fade * ep(t, Q["lock.sweep"] - 0.15, 0.4);
    const sc = lerp(0.9, 1, ep(t, Q["lock.sweep"] - 0.15, 0.6, ease.out5)) * lerp(1, 0.85, 1 - fade);
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = "#0f3150";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.white;
    ctx.stroke();
    // swept sector from 14:00 to now, in lime
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const a0 = -Math.PI / 2 + (14 % 12) * (Math.PI / 6), a1 = -Math.PI / 2 + (hour % 12) * (Math.PI / 6);
    ctx.arc(0, 0, R - 24, a0, a1);
    ctx.closePath();
    ctx.fillStyle = "rgba(212,242,90,0.18)";
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.sin(a) * (R - 22), -Math.cos(a) * (R - 22));
      ctx.lineTo(Math.sin(a) * (R - (i % 3 ? 42 : 58)), -Math.cos(a) * (R - (i % 3 ? 42 : 58)));
      ctx.lineWidth = i % 3 ? 4 : 8;
      ctx.strokeStyle = C.white;
      ctx.stroke();
    }
    const hand = (ang, len, wdt, col) => {
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(0, -len);
      ctx.lineWidth = wdt;
      ctx.lineCap = "round";
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.restore();
    };
    hand((hour % 12) * (Math.PI / 6), R * 0.5, 16, C.white);
    hand((hour % 1) * Math.PI * 2, R * 0.75, 9, C.lime);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = C.lime;
    ctx.fill();
    ctx.restore();
    const hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60);
    text(ctx, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, cx, cy + R + 100, { size: 72, weight: 900, color: C.white, align: "center", alpha: fade * ep(t, Q["lock.sweep"], 0.3) });
  }

  // crew card rises in the clock's place
  const cp = ep(t, Q["lock.crew"], 0.7, ease.out5);
  const x = 170, y = 170, w = 820, h = 740;
  if (cp > 0) {
    ctx.save();
    ctx.translate(0, (1 - cp) * 160);
    ctx.globalAlpha = clamp(cp * 1.5);
    card(ctx, x, y, w, h, { r: 28, shadow: 0.35, lift: 40, stroke: null });
    const xr = x + w - 56;
    text(ctx, "מחר · רחוב הרצל 12, נתניה", xr, y + 78, { size: 24, weight: 500, color: C.muted });
    text(ctx, "הצוות שלכם למחר", xr, y + 140, { size: 50, weight: 900 });
    chip(ctx, "ננעל ב־18:00", x + 56, y + 128, { kind: "lime", size: 25, align: "left" });
    CREW.slice(0, 3).forEach((wk, i) => {
      const rp = ep(t, Q["lock.crew"] + 0.15 + i * 0.1, 0.5, ease.out5);
      const ry = y + 196 + i * 128 + (1 - rp) * 40;
      ctx.save();
      ctx.globalAlpha *= rp;
      ctx.fillStyle = C.line;
      ctx.fillRect(x + 56, ry, w - 112, 1.5);
      avatar(ctx, xr - 42, ry + 64, 84, wk.id);
      text(ctx, wk.name, xr - 106, ry + 60, { size: 34, weight: 800 });
      text(ctx, `טפסן · ${wk.years} שנות ותק`, xr - 106, ry + 98, { size: 24, weight: 400, color: C.muted });
      star(ctx, x + 132, ry + 56, 12);
      text(ctx, wk.rate, x + 112, ry + 66, { size: 28, weight: 800 });
      ctx.restore();
    });
    const fy = y + h - 150;
    rrect(ctx, x + 40, fy, w - 80, 110, 18);
    ctx.fillStyle = C.cool;
    ctx.fill();
    text(ctx, "איסוף 05:45 · נהג: אבי מ.", xr - 10, fy + 48, { size: 28, weight: 800 });
    text(ctx, "כולל לינה והסעה", xr - 10, fy + 86, { size: 22, weight: 400, color: C.muted });
    money(ctx, 3 * DAY, x + 76, fy + 62, 46, { align: "left" });
    text(ctx, "מחיר סופי ליום", x + 76, fy + 92, { size: 20, weight: 500, color: C.muted, align: "left" });
    ctx.restore();
  }

  // the padlock: appears in the clock, snaps shut at 18:00, then flies to the card's corner
  const lp = ep(t, Q["lock.clunk"] - 0.45, 0.3, ease.back);
  if (lp > 0) {
    const shut = ep(t, Q["lock.clunk"], 0.12, ease.in);
    const mv = ep(t, Q["lock.crew"] - 0.05, 0.6, ease.inOut);
    const lx = lerp(cx, x + 4, mv), ly = lerp(cy, y + 4, mv), ls = lerp(170, 92, mv) * lp;
    const shake = Math.exp(-Math.max(0, t - Q["lock.clunk"]) * 12) * (t > Q["lock.clunk"]) * 8;
    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, ls * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = C.navy;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.lime;
    ctx.stroke();
    ctx.restore();
    padlock(ctx, lx + Math.sin(t * 80) * shake, ly + ls * 0.04, ls * 0.8, shut, { body: C.lime, line: C.white });
  }
  column(ctx, t, {
    eyebrow: "הערב שלפני",
    eyebrowAt: Q["lock.sweep"] + 0.1,
    kind: "lime",
    lines: [{ w: ["ב־18:00", "הצוות", "ננעל."], colors: { 0: C.lime } }, ["יודעים", "מי", "מגיע", "מחר."]],
    at: Q["lock.sweep"] + 0.25,
    sub: "שמות העובדים, שם הנהג ושעת האיסוף.",
    subAt: Q["lock.title"],
    y: 470,
    size: 92,
    dark: true,
  });
}

// ── 7. check-in: the morning on site ─────────────────────────────────────────
export function checkin(ctx, t, Q) {
  bg(ctx, C.cool);
  const swap = Q["checkin.zero"] - 0.15;
  column(ctx, t, {
    lines: [["בבוקר", "באתר,"], ["מאשרים", "מי", "הגיע."]],
    at: Q["checkin.title"],
    y: 470,
    size: 100,
    out: swap,
  });
  column(ctx, t, {
    lines: [["על", "עובד", "שלא", "מתאים,"], { w: ["לא", "משלמים."], span: { from: 0, to: 1, at: Q["checkin.zero"] + 0.6 } }],
    at: Q["checkin.zero"] + 0.1,
    sub: "התאגיד מקבל התראה ושולח מחליף.",
    y: 470,
    size: 100,
  });
  const enter = ep(t, Q["checkin.title"] - 0.1, 0.8, ease.out5);
  const s = phone(ctx, 600, 80 + (1 - enter) * 220);
  clipScreen(ctx, s);
  appBar(ctx, s, "היום באתר", "07:05");
  const xr = s.x + s.w - 26, iw = s.w - 52;
  text(ctx, "רחוב הרצל 12, נתניה", xr, s.y + 200, { size: 24, weight: 800 });
  text(ctx, "סמנו כל עובד שהגיע", xr, s.y + 234, { size: 20, weight: 400, color: C.muted });
  const marks = [Q["checkin.c1"], Q["checkin.c2"], Q["checkin.c3"]];
  CREW.slice(0, 3).forEach((wk, i) => {
    const y = s.y + 264 + i * 170;
    const bad = i === 2;
    const p = ep(t, marks[i], 0.35, ease.back);
    card(ctx, xr - iw, y, iw, 156, { r: 18, shadow: 0.05, lift: 8, stroke: p > 0.5 ? (bad ? C.bad : C.ok) : C.line });
    avatar(ctx, xr - 50, y + 54, 64, wk.id);
    text(ctx, wk.name, xr - 96, y + 50, { size: 27, weight: 800 });
    text(ctx, "טפסן", xr - 96, y + 84, { size: 21, weight: 400, color: C.muted });
    // per-worker day price; the misfit's strikes through to ₪0
    const zp = bad ? ep(t, Q["checkin.zero"], 0.4) : 0;
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.font = "800 26px Heebo";
    ctx.fillStyle = bad && zp > 0 ? C.faint : C.navy;
    const px = s.x + 44, py = y + 52;
    ctx.fillText(ils(DAY), px, py);
    if (zp > 0) {
      const tw = ctx.measureText(ils(DAY)).width;
      ctx.fillStyle = C.bad;
      ctx.fillRect(px - 4, py - 10, (tw + 8) * zp, 3.5);
      ctx.font = "900 30px Heebo";
      ctx.fillStyle = C.navy;
      ctx.globalAlpha = zp;
      ctx.fillText("₪0", px, py + 36);
    }
    ctx.restore();
    // two buttons, or the resulting status
    const by = y + 100;
    if (p < 0.5) {
      const bw = (iw - 48) / 2;
      rrect(ctx, xr - 16 - bw, by, bw, 44, 10);
      ctx.fillStyle = C.navy;
      ctx.fill();
      text(ctx, "הגיע ומתאים", xr - 16 - bw / 2, by + 30, { size: 20, weight: 800, color: C.white, align: "center" });
      rrect(ctx, xr - iw + 16, by, bw, 44, 10);
      ctx.strokeStyle = C.navy;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(ctx, "לא מתאים", xr - iw + 16 + bw / 2, by + 30, { size: 20, weight: 700, align: "center" });
    } else {
      chip(ctx, bad ? "לא מתאים · לא משלמים" : "הגיע ומתאים", xr - 16, by + 22, { kind: bad ? "bad" : "ok", size: 21, scale: 0.7 + 0.3 * p });
    }
    const bw = (iw - 48) / 2;
    tap(ctx, bad ? xr - iw + 16 + bw / 2 : xr - 16 - bw / 2, by + 22, t, marks[i]);
  });
  // total for today
  const tp = ep(t, Q["checkin.zero"] + 0.2, 0.4);
  const ty = s.y + s.h - 120;
  ctx.fillStyle = C.deep;
  ctx.fillRect(s.x, ty, s.w, 120);
  const total = 3 * DAY - DAY * tp;
  text(ctx, "לתשלום על היום", xr, ty + 56, { size: 23, weight: 500, color: "#b8c7d6" });
  money(ctx, total, s.x + 34, ty + 74, 44, { align: "left", color: C.lime });
  ctx.restore();

  // the big ₪0 stamp beside the phone
  const zp = ep(t, Q["checkin.zero"] + 0.05, 0.5, ease.back);
  if (zp > 0) {
    ctx.save();
    ctx.translate(912, 800);
    ctx.rotate(-0.12);
    ctx.scale(zp, zp);
    rrect(ctx, -120, -70, 240, 140, 22);
    ctx.fillStyle = C.lime;
    ctx.fill();
    ctx.strokeStyle = C.navy;
    ctx.lineWidth = 4;
    ctx.stroke();
    money(ctx, 0, 0, 34, 104);
    ctx.restore();
  }
}

// ── 8. agencies ──────────────────────────────────────────────────────────────
export function agency(ctx, t, Q) {
  bg(ctx, C.paper);
  column(ctx, t, {
    eyebrow: "לתאגידים",
    lines: [["ממלאים", "את", "הימים"], { w: ["הפנויים", "של", "העובדים."], span: { from: 0, to: 0, at: Q["agency.fill"] + 0.2 } }],
    at: Q["agency.title"],
    sub: "מאשרים הצעה, והיא יוצאת לקבלנים שלכם.",
    y: 470,
    size: 88,
  });
  const p = ep(t, Q["agency.title"] - 0.1, 0.7, ease.out5);
  const x = 150, y = 150, w = 860, h = 600;
  ctx.save();
  ctx.translate(0, (1 - p) * 120);
  ctx.globalAlpha = clamp(p * 1.5);
  card(ctx, x, y, w, h, { r: 26, shadow: 0.08, lift: 24 });
  const xr = x + w - 40;
  text(ctx, "השבוע · 5 טפסנים", xr, y + 68, { size: 32, weight: 900 });
  const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"];
  const nameW = 200, gx1 = xr - nameW, cw = (gx1 - (x + 40)) / days.length, rh = 84, gy = y + 130;
  days.forEach((d, j) => text(ctx, d, gx1 - cw * j - cw / 2, gy - 20, { size: 24, weight: 700, color: C.muted, align: "center" }));
  // booked cells (navy) vs idle ones that the offer fills (lime)
  const busy = [
    [1, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1],
    [1, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1],
  ];
  const names = ["סרגיי ב.", "ראג׳ש ק.", "מיכאיל ד.", "ואנג ל.", "אליקסי פ."];
  let k = 0;
  busy.forEach((row, i) => {
    const ry = gy + i * rh;
    avatar(ctx, xr - 26, ry + rh / 2, 48, [1, 4, 2, 3, 5][i]);
    text(ctx, names[i], xr - 62, ry + rh / 2 + 9, { size: 23, weight: 700 });
    row.forEach((b, j) => {
      const cx0 = gx1 - cw * (j + 1) + 5, cy0 = ry + 8, cww = cw - 10, chh = rh - 16;
      rrect(ctx, cx0, cy0, cww, chh, 10);
      if (b) {
        ctx.fillStyle = C.navy;
        ctx.fill();
        return;
      }
      ctx.fillStyle = "#eef2f5";
      ctx.fill();
      const fp = ep(t, Q["agency.fill"] + k++ * 0.06, 0.3, ease.back);
      if (fp > 0) {
        ctx.save();
        ctx.translate(cx0 + cww / 2, cy0 + chh / 2);
        ctx.scale(fp, fp);
        rrect(ctx, -cww / 2, -chh / 2, cww, chh, 10);
        ctx.fillStyle = C.lime;
        ctx.fill();
        check(ctx, 0, 0, 22, C.navy, 4, clamp(fp));
        ctx.restore();
      } else {
        text(ctx, "פנוי", cx0 + cww / 2, cy0 + chh / 2 + 8, { size: 20, weight: 500, color: C.faint, align: "center" });
      }
    });
  });
  ctx.restore();

  // the ready offer, approved with one press, flies out as a message
  const op = ep(t, Q["agency.offer"], 0.5, ease.back);
  const fly = ep(t, Q["agency.send"] + 0.12, 0.5, ease.in);
  if (op > 0 && fly < 1) {
    const ox = 270, oy = 640, ow = 620, oh = 300;
    ctx.save();
    ctx.translate(ox + ow / 2 - fly * 520, oy + oh / 2 - fly * 380);
    ctx.scale(op * (1 - fly * 0.6), op * (1 - fly * 0.6));
    ctx.rotate(-fly * 0.3);
    ctx.globalAlpha = 1 - fly;
    ctx.translate(-ow / 2, -oh / 2);
    card(ctx, 0, 0, ow, oh, { r: 24, shadow: 0.2, lift: 30 });
    const r = ow - 36;
    chip(ctx, "הצעה מוכנה לאישור", r, 52, { kind: "info", size: 22 });
    text(ctx, "4 טפסנים פנויים · ד׳–ו׳", r, 132, { size: 34, weight: 900 });
    text(ctx, "תישלח ל־12 קבלנים מהמאגר שלכם", r, 176, { size: 23, weight: 400, color: C.muted });
    const pr = 1 - 0.06 * Math.sin(Math.PI * prog(t, Q["agency.send"] - 0.05, 0.2));
    ctx.save();
    ctx.translate(r - 130, 240);
    ctx.scale(pr, pr);
    rrect(ctx, -130, -32, 260, 64, 12);
    ctx.fillStyle = C.navy;
    ctx.fill();
    text(ctx, "אישור ושליחה", 0, 9, { size: 25, weight: 800, color: C.white, align: "center" });
    ctx.restore();
    ctx.restore();
    if (fly === 0) tap(ctx, ox + ow - 36 - 130, oy + 240, t, Q["agency.send"]);
  }
}

// ── 9. end card ──────────────────────────────────────────────────────────────
export function end(ctx, t, Q) {
  bg(ctx, C.deep);
  const hit = Q["end.hit"];
  hazard(ctx, 0, H - 64, W, 64, { offset: (t - hit) * 90 });
  hazard(ctx, 0, 0, W, 18, { offset: -(t - hit) * 90 });
  const ph = { frame: prog(t, hit, 0.5), hat: prog(t, hit + 0.15, 0.7), hands: prog(t, hit + 0.3, 0.5), word: prog(t, hit + 0.25, 0.5), stripe: prog(t, hit + 0.45, 0.6) };
  const ms = 220, gap = 40, ws = 180;
  const ww = measure(ctx, "ידיים", ws, 900);
  const total = ms + gap + ww;
  const zoom = lerp(1.08, 1, ep(t, hit, 1.2, ease.out5));
  ctx.save();
  ctx.translate(W / 2, 330);
  ctx.scale(zoom, zoom);
  logoMark(ctx, total / 2 - ms / 2, 0, ms, ph, { dark: true });
  wordMark(ctx, total / 2 - ms - gap, ws * 0.33, ws, ph, { dark: true });
  ctx.restore();
  kinetic(ctx, ["יודעים", "מראש", "מי", "מגיע", "לאתר,", "ומה", "המחיר", "הסופי", "ליום."], t, Q["end.tag"], W / 2, 610, { size: 60, color: C.white, align: "center", stagger: 0.045, span: { from: 6, to: 7, at: Q["end.tag"] + 0.5 } });
  // the two doors, as on the landing page
  const cp = ep(t, Q["end.cta"], 0.5, ease.back);
  if (cp > 0) {
    const bw = 300, bh = 88, gapb = 28, y0 = 700;
    ctx.save();
    ctx.globalAlpha = clamp(cp * 2);
    ctx.translate(W / 2, y0 + bh / 2);
    ctx.scale(0.8 + 0.2 * cp, 0.8 + 0.2 * cp);
    rrect(ctx, gapb / 2, -bh / 2, bw, bh, 14);
    ctx.fillStyle = C.lime;
    ctx.fill();
    text(ctx, "אני קבלן", gapb / 2 + bw / 2, 13, { size: 36, weight: 800, align: "center" });
    rrect(ctx, -gapb / 2 - bw, -bh / 2, bw, bh, 14);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    text(ctx, "אני תאגיד", -gapb / 2 - bw / 2, 13, { size: 36, weight: 800, color: C.white, align: "center" });
    ctx.restore();
  }
  const fp = ep(t, Q["end.cta"] + 0.35, 0.5);
  text(ctx, "השימוש חינם לקבלנים · תאגידים מורשים בלבד · התאגיד מאשר כל הצבה", W / 2, 880, { size: 28, weight: 400, color: "#b8c7d6", align: "center", alpha: fp });
}
