// The contractor film: "know in advance who comes to the site, and the final price per day".
// Plates are draw(ctx, t, Q): t is the video time, Q the cue table resolved from the voiceover's words.
import { C, clamp, lerp, prog, ease, ep, bump, kick, rrect, card, text, kinetic, chip, button, check, avatar, star, padlock, rnd, ils, money } from "./kit.js";
import { W, H, PORTRAIT, COL, CREW, DAY, bg, pageBg, column, tap, phone, clipScreen, appBar, workerRow, brandPlate, endPlate, fitSize } from "./common.js";

// Vertical film: these plates have their own vertical layout; the others are re-arranged (headline on top, visual
// under it) by main.js, which paints this backdrop behind them.
export const NATIVE = ["hook", "brand", "end"];
export const BG = { search: "page", docs: "mint", price: "page", lock: "deep", checkin: "mint" };
// the visual's bounding box in the wide layout [x, y, w, h]: it is enlarged to the vertical frame's width
export const VISUAL = { search: [355, 70, 490, 945], docs: [150, 120, 860, 840], price: [170, 150, 820, 780], lock: [150, 120, 870, 810], checkin: [355, 70, 700, 945] };

// How each cut into a plate is made (see main.js).
export const CUTS = {
  brand: { kind: "sweep", d: 0.6 },
  search: { kind: "push", d: 0.5 },
  docs: { kind: "zoom", d: 0.45 },
  price: { kind: "push", d: 0.5 },
  lock: { kind: "iris", d: 0.6, at: [600, 540] },
  checkin: { kind: "iris", d: 0.6, at: [600, 540] },
  end: { kind: "sweep", d: 0.6 },
};

// ── hook: 06:30, the site is open, nobody knows who's coming ─────────────────
export function hook(ctx, t, Q) {
  bg(ctx, C.deep);
  for (let i = 0; i < 26; i++) {
    const p = ep(t, Q["hook.w3"] + rnd(i) * 0.8, 1.1);
    if (p <= 0) continue;
    const x = 120 + rnd(i + 40) * (W - 240);
    const y = 140 + rnd(i + 80) * (H - 280) - t * 18 * (0.5 + rnd(i + 9));
    ctx.save();
    ctx.globalAlpha = p * (0.06 + rnd(i + 3) * 0.12);
    ctx.translate(x, y);
    ctx.rotate((rnd(i + 5) - 0.5) * 0.6);
    text(ctx, "?", 0, 0, { size: 60 + rnd(i + 7) * 120, weight: 900, color: C.tealLight, align: "center" });
    ctx.restore();
  }
  // a big 06:30 clock opens the film, then shrinks up into a label when the question starts
  const lp = ep(t, Q["hook.label"], 0.5, ease.out5);
  const w1 = Q["hook.w1"];
  const up = ep(t, w1 - 0.1, 0.5, ease.inOut);
  const sec = Math.floor(clamp(t * 9, 0, 59));
  const v = PORTRAIT, k = v ? 0.78 : 1;
  ctx.save();
  ctx.globalAlpha = lp;
  ctx.translate(W / 2, v ? lerp(900, 480, up) : lerp(560, 300, up));
  ctx.scale(lerp(k, 0.32 * (v ? 1.3 : 1), up), lerp(k, 0.32 * (v ? 1.3 : 1), up));
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.font = "900 260px Heebo";
  ctx.fillStyle = C.white;
  ctx.fillText(`06:29:${String(sec).padStart(2, "0")}`, 0, 90);
  ctx.restore();

  const ws = ["hook.w1", "hook.w2", "hook.w3", "hook.w4"].map((k) => Q[k]);
  const punch = ws.reduce((a, c) => a + kick(t, c), 0);
  ctx.save();
  const zoom = 1 + 0.012 * punch + 0.03 * ep(t, ws[3], 1.4, ease.inOut);
  const cy = v ? 1000 : 600;
  ctx.translate(W / 2, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -cy);
  if (v) {
    // two lines, larger: the question fills the phone screen
    const size = fitSize(ctx, [["מי", "מגיע"], ["היום", "לאתר?"]], 210, W - 120);
    kinetic(ctx, ["מי", "מגיע"], t, [ws[0], ws[1]], W / 2, 1000, { size, color: C.white, align: "center", dur: 0.4, dark: true });
    kinetic(ctx, ["היום", "לאתר?"], t, [ws[2], ws[3]], W / 2, 1000 + size * 1.25, { size, color: C.white, align: "center", dur: 0.4, swoosh: { word: 1, at: ws[3] + 0.35 }, dark: true });
  } else {
    kinetic(ctx, ["מי", "מגיע", "היום", "לאתר?"], t, ws, W / 2, 640, { size: 170, color: C.white, align: "center", dur: 0.4, swoosh: { word: 3, at: ws[3] + 0.35 }, dark: true });
  }
  ctx.restore();
}

// ── brand ────────────────────────────────────────────────────────────────────
export function brand(ctx, t, Q) {
  brandPlate(ctx, t, Q, [
    { w: ["יודעים", "מראש", "מי", "מגיע", "לאתר,"], at: "brand.l1", swoosh: { word: 1, at: Q["brand.l2"] + 0.2 } },
    { w: ["ומה", "המחיר", "הסופי", "ליום."], at: "brand.l2", span: { from: 1, to: 2, at: Q["brand.mark"] } },
  ]);
}

// ── search: by trade and day, then pick workers by name ──────────────────────
export function search(ctx, t, Q) {
  pageBg(ctx, t);
  column(ctx, t, {
    eyebrow: "לקבלנים",
    lines: [["בוחרים", "עובד", "לפי", "שם,"], { w: ["ואותו", "עובד", "מגיע", "לאתר."], swoosh: { word: 0, at: Q["search.pick3"] + 0.2 } }],
    at: Q["search.title"],
    sub: "רק עובדים פנויים מתאגידים מורשים.",
    y: 450,
  });
  const enter = ep(t, Q["search.title"] - 0.15, 0.7, ease.out5);
  const s = phone(ctx, 600, 80 + (1 - enter) * 220);
  clipScreen(ctx, s);
  appBar(ctx, s, "חיפוש עובדים", "נתניה");
  const xr = s.x + s.w - 26, iw = s.w - 52;

  // the form: three fields fill in, the button is pressed and the form slides away
  const pressed = Q["search.press"];
  const away = ep(t, pressed + 0.1, 0.4, ease.inOut);
  ctx.save();
  ctx.translate(0, -away * 420);
  ctx.globalAlpha = 1 - away;
  const fields = [
    ["איזה עובד צריך?", "טפסנות", Q["search.type1"]],
    ["איפה עובדים?", "נתניה", Q["search.type2"]],
    ["מתי מתחילים?", "יום ד׳ · 5 ימים", Q["search.type3"]],
  ];
  fields.forEach(([lab, val, at], i) => {
    const y = s.y + 210 + i * 118;
    text(ctx, lab, xr, y, { size: 20, weight: 600, color: C.muted });
    const focus = t >= at && t < at + 0.4;
    rrect(ctx, xr - iw, y + 12, iw, 66, 14);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.strokeStyle = focus ? C.teal : C.line;
    ctx.lineWidth = focus ? 2.5 : 1.5;
    ctx.stroke();
    const n = Math.floor(clamp((t - at) / 0.28) * val.length);
    if (n > 0) text(ctx, val.slice(0, n), xr - 20, y + 56, { size: 27, weight: 700 });
  });
  button(ctx, "חיפוש עובדים", s.x + s.w / 2, s.y + 600, iw, 70, { size: 27, scale: 1 - 0.05 * bump(t, pressed - 0.05, 0.2) });
  ctx.restore();
  tap(ctx, s.x + s.w / 2 - 40, s.y + 600, t, pressed);

  // results
  const head = ep(t, pressed + 0.15, 0.35);
  text(ctx, "4 טפסנים פנויים · יום ד׳", xr, s.y + 214 + (1 - head) * 30, { size: 26, weight: 800, alpha: head });
  const picks = [Q["search.pick1"], Q["search.pick2"], Q["search.pick3"]];
  CREW.forEach((wk, i) => {
    const p = ep(t, pressed + 0.22 + i * 0.1, 0.45, ease.out5);
    if (p <= 0) return;
    const y = s.y + 244 + i * 130 + (1 - p) * 120;
    ctx.save();
    ctx.globalAlpha = clamp(p * 1.5);
    const picked = i < 3 ? ep(t, picks[i], 0.28, ease.back) : 0;
    workerRow(ctx, xr, y, iw, wk, { sub: `${wk.years} שנות ותק`, stroke: picked > 0.5 ? C.teal : C.line });
    star(ctx, xr - 218, y + 79, 9);
    text(ctx, wk.rate, xr - 230, y + 86, { size: 20, weight: 700 });
    const bx = s.x + 38, bw = 92, bh = 48, byy = y + 34;
    rrect(ctx, bx, byy, bw, bh, 12);
    ctx.fillStyle = picked > 0.5 ? C.teal : C.white;
    ctx.fill();
    ctx.strokeStyle = picked > 0.5 ? C.teal : C.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (picked > 0.5) {
      check(ctx, bx + bw - 20, byy + bh / 2, 16, C.white, 3.2, clamp((picked - 0.5) * 2));
      text(ctx, "נבחר", bx + bw - 34, byy + 32, { size: 21, weight: 800, color: C.white });
    } else {
      text(ctx, "הוספה", bx + bw / 2, byy + 32, { size: 21, weight: 700, align: "center" });
    }
    ctx.restore();
    if (i < 3) tap(ctx, bx + bw / 2, byy + bh / 2, t, picks[i]);
  });

  // selection bar slides up from the bottom
  const nPicked = picks.filter((p) => t >= p).length;
  const bar = ep(t, picks[0], 0.4, ease.out5);
  if (bar > 0) {
    const bh = 130, y = s.y + s.h - bh * bar;
    ctx.fillStyle = C.white;
    ctx.fillRect(s.x, y, s.w, bh);
    ctx.fillStyle = C.line;
    ctx.fillRect(s.x, y, s.w, 1.5);
    const pop = 1 + 0.12 * kick(t, picks[Math.max(0, nPicked - 1)], 10);
    ctx.save();
    ctx.translate(xr, y + 58);
    ctx.scale(pop, pop);
    text(ctx, `${nPicked === 1 ? "טפסן אחד" : `${nPicked} טפסנים`} · ${ils(nPicked * DAY)}`, 0, 0, { size: 27, weight: 800 });
    ctx.restore();
    text(ctx, "ליום · כולל לינה והסעה", xr, y + 94, { size: 19, weight: 400, color: C.muted });
    button(ctx, "המשך", s.x + 92, y + 62, 124, 64, { size: 24, scale: 1 + 0.06 * bump(t, picks[2] + 0.3, 0.3) });
  }
  ctx.restore();
}

// ── docs: verified agencies, documents valid through the last day ───────────
export function docs(ctx, t, Q) {
  bg(ctx, C.mint);
  column(ctx, t, {
    lines: [["רק", "עובדים", "מאומתים,"], { w: ["מתאגידים", "מורשים."], swoosh: { word: 1, at: Q["docs.d1"] + 0.2 } }],
    at: Q["docs.zoom"] + 0.25,
    sub: "כל האישורים בתוקף עד יום העבודה האחרון.",
    y: 450,
  });
  const p = ep(t, Q["docs.zoom"], 0.8, ease.out5);
  const x = 170, y = 140, w = 820, h = 800;
  ctx.save();
  const sc = lerp(0.84, 1, p);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(sc, sc);
  ctx.rotate((1 - p) * -0.04);
  ctx.translate(-(x + w / 2), -(y + h / 2) + (1 - p) * 80);
  ctx.globalAlpha = clamp(p * 1.4);
  card(ctx, x, y, w, h, { r: 30, shadow: 0.09, lift: 30 });
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
  const rows = ["אשרת עבודה (ב/1) בענף הבנייה", "דרכון", "ביטוח רפואי", "אישור עבודה בגובה"];
  rows.forEach((name, i) => {
    const at = Q["docs.d1"] + i * 0.14;
    const ry = y + 330 + i * 86;
    rrect(ctx, x + 50, ry, w - 100, 70, 16);
    ctx.fillStyle = t >= at ? "#f2faf6" : C.paper;
    ctx.fill();
    // document icon in a mint tile
    rrect(ctx, xr - 52, ry + 11, 48, 48, 12);
    ctx.fillStyle = C.mint;
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    rrect(ctx, xr - 39, ry + 21, 22, 28, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xr - 34, ry + 31); ctx.lineTo(xr - 22, ry + 31);
    ctx.moveTo(xr - 34, ry + 39); ctx.lineTo(xr - 26, ry + 39);
    ctx.stroke();
    ctx.restore();
    text(ctx, name, xr - 70, ry + 46, { size: 27, weight: 500 });
    const cp = ep(t, at, 0.35, ease.back);
    if (cp > 0) chip(ctx, "בתוקף", x + 72, ry + 35, { kind: "ok", size: 24, align: "left", scale: 0.6 + 0.4 * cp, alpha: clamp(cp * 2) });
  });
  // the booking sits entirely inside the documents' validity
  const rp = ep(t, Q["docs.range"], 0.6, ease.inOut);
  if (rp > 0) {
    const ry = y + 700, bx0 = x + 50, bw = w - 100;
    ctx.globalAlpha = clamp(rp * 2);
    rrect(ctx, bx0, ry - 12, bw, 24, 12);
    ctx.fillStyle = C.paper2;
    ctx.fill();
    rrect(ctx, bx0 + bw * (1 - rp), ry - 12, bw * rp, 24, 12);
    ctx.fillStyle = C.ok;
    ctx.fill();
    const bp = ep(t, Q["docs.range"] + 0.3, 0.4, ease.back);
    if (bp > 0) {
      const b1 = bx0 + bw * 0.52, b2 = bx0 + bw * 0.82;
      ctx.save();
      ctx.translate((b1 + b2) / 2, ry);
      ctx.scale(1, bp);
      rrect(ctx, (b1 - b2) / 2, -26, b2 - b1, 52, 12);
      ctx.fillStyle = C.teal;
      ctx.fill();
      text(ctx, "ההזמנה", 0, 10, { size: 24, weight: 800, align: "center", color: C.white });
      ctx.restore();
    }
    text(ctx, "תוקף המסמכים", xr, ry + 62, { size: 22, weight: 600, color: C.ok, alpha: rp });
    const ok = ep(t, Q["docs.ok"], 0.4, ease.back);
    if (ok > 0) chip(ctx, "בתוקף עד סוף העבודה", x + 50, ry + 56, { kind: "ok", size: 22, align: "left", scale: 0.7 + 0.3 * ok, alpha: clamp(ok * 2) });
  }
  ctx.restore();
}

// ── price: one final daily price, lodging and transport included ────────────
export function price(ctx, t, Q) {
  pageBg(ctx, t);
  column(ctx, t, {
    lines: [["מחיר", "יומי", "סופי."], { w: ["בלי", "הפתעות", "בסוף", "החודש."], span: { from: 1, to: 1, at: Q["price.badge"] } }],
    at: Q["price.title"],
    sub: "בוחרים מי מסיע ומי מספק לינה, והמחיר מתעדכן.",
    y: 470,
  });
  const p = ep(t, Q["price.title"] - 0.1, 0.7, ease.out5);
  const x = 190, y = 170, w = 780, h = 740;
  ctx.save();
  ctx.translate(0, (1 - p) * 140);
  ctx.globalAlpha = clamp(p * 1.5);
  card(ctx, x, y, w, h, { r: 30, shadow: 0.09, lift: 30 });
  const xr = x + w - 56;
  avatar(ctx, xr - 36, y + 80, 72, 1);
  text(ctx, "טפסן · נתניה", xr - 92, y + 74, { size: 32, weight: 800 });
  text(ctx, "יום ד׳ · 9 שעות עבודה", xr - 92, y + 112, { size: 24, weight: 400, color: C.muted });
  const t1 = Q["price.toggle1"], t2 = Q["price.toggle2"];
  const v = 576 * ep(t, Q["price.count"], 0.8, ease.out5) + 72 * ep(t, t1 + 0.1, 0.3) + 54 * ep(t, t2 + 0.1, 0.3);
  const pop = 1 + 0.06 * (kick(t, t1 + 0.1, 8) + kick(t, t2 + 0.1, 8));
  ctx.save();
  ctx.translate(x + w / 2, y + 300);
  ctx.scale(pop, pop);
  money(ctx, v, 0, 0, 190);
  ctx.restore();
  text(ctx, "ליום לעובד", x + w / 2, y + 360, { size: 30, weight: 500, color: C.muted, align: "center" });
  const segs = [
    ["לינה", ["התאגיד", "אתם"], t1],
    ["הסעה", ["התאגיד", "אתם"], t2],
  ];
  segs.forEach(([lab, opts, at], i) => {
    const sy = y + 430 + i * 104;
    text(ctx, lab, xr, sy + 46, { size: 28, weight: 800 });
    const sx = x + 56, sw = w - 112 - 120, sh = 66;
    rrect(ctx, sx, sy, sw, sh, 14);
    ctx.fillStyle = C.paper2;
    ctx.fill();
    // the teal pill slides from the contractor (left) to the agency (right)
    const m = ep(t, at, 0.3, ease.inOut);
    const half = (sw - 12) / 2;
    rrect(ctx, lerp(sx + 6, sx + 6 + half, m), sy + 6, half, sh - 12, 10);
    ctx.fillStyle = C.teal;
    ctx.fill();
    text(ctx, opts[0], sx + 6 + half * 1.5, sy + 43, { size: 24, weight: m > 0.5 ? 800 : 500, align: "center", color: m > 0.5 ? C.white : C.muted });
    text(ctx, opts[1], sx + 6 + half * 0.5, sy + 43, { size: 24, weight: m > 0.5 ? 500 : 800, align: "center", color: m > 0.5 ? C.muted : C.white });
    tap(ctx, sx + 6 + half * 1.5, sy + sh / 2, t, at);
  });
  const bp = ep(t, Q["price.badge"], 0.4, ease.back);
  if (bp > 0) chip(ctx, "מחיר סופי ליום · כולל לינה והסעה", x + w / 2, y + h - 62, { kind: "teal", icon: "check", size: 27, align: "center", scale: 0.6 + 0.4 * bp, alpha: clamp(bp * 2) });
  ctx.restore();
}

// ── lock: 18:00 the evening before ──────────────────────────────────────────
export function lock(ctx, t, Q) {
  bg(ctx, C.deep);
  const cx = 600, cy = 540, R = 270;
  const clunk = Q["lock.clunk"];
  const sweep = ep(t, Q["lock.sweep"], clunk - 0.1 - Q["lock.sweep"], ease.inOut);
  const hour = lerp(14, 18, sweep);
  const fade = 1 - ep(t, Q["lock.crew"] - 0.1, 0.35);
  if (fade > 0) {
    ctx.save();
    ctx.globalAlpha = fade * ep(t, Q["lock.sweep"] - 0.1, 0.35);
    const sc = lerp(0.9, 1, ep(t, Q["lock.sweep"] - 0.1, 0.5, ease.out5)) * lerp(1, 0.85, 1 - fade);
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = "#0b2a3d";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.white;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R - 24, -Math.PI / 2 + 2 * (Math.PI / 6), -Math.PI / 2 + (hour % 12) * (Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = "rgba(111,211,196,0.18)";
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6, l = i % 3 ? 42 : 58;
      ctx.beginPath();
      ctx.moveTo(Math.sin(a) * (R - 22), -Math.cos(a) * (R - 22));
      ctx.lineTo(Math.sin(a) * (R - l), -Math.cos(a) * (R - l));
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
    hand((hour % 1) * Math.PI * 2, R * 0.75, 9, C.tealLight);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = C.tealLight;
    ctx.fill();
    ctx.restore();
    const hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60);
    text(ctx, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, cx, cy + R + 100, { size: 72, weight: 900, color: C.white, align: "center", alpha: fade * ep(t, Q["lock.sweep"], 0.3) });
  }
  // the crew card rises in the clock's place
  const cp = ep(t, Q["lock.crew"], 0.6, ease.out5);
  const x = 190, y = 170, w = 820, h = 740;
  if (cp > 0) {
    ctx.save();
    ctx.translate(0, (1 - cp) * 160);
    ctx.globalAlpha = clamp(cp * 1.5);
    card(ctx, x, y, w, h, { r: 30, shadow: 0.35, lift: 40, stroke: null });
    const xr = x + w - 56;
    text(ctx, "מחר · רחוב הרצל 12, נתניה", xr, y + 78, { size: 24, weight: 500, color: C.muted });
    text(ctx, "הצוות שלכם למחר", xr, y + 140, { size: 50, weight: 900 });
    chip(ctx, "ננעל ב־18:00", x + 56, y + 128, { kind: "teal", icon: "check", size: 25, align: "left" });
    CREW.slice(0, 3).forEach((wk, i) => {
      const rp = ep(t, Q["lock.crew"] + 0.12 + i * 0.08, 0.45, ease.out5);
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
    const hi = ep(t, Q["lock.title"], 0.4);
    rrect(ctx, x + 40, fy, w - 80, 110, 20);
    ctx.fillStyle = C.mint;
    ctx.fill();
    if (hi > 0) {
      ctx.save();
      ctx.globalAlpha = hi;
      rrect(ctx, x + 40, fy, w - 80, 110, 20);
      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    text(ctx, "איסוף 05:45 · נהג: אבי מ.", xr - 10, fy + 48, { size: 28, weight: 800 });
    text(ctx, "כולל לינה והסעה", xr - 10, fy + 86, { size: 22, weight: 400, color: C.muted });
    money(ctx, 3 * DAY, x + 76, fy + 62, 46, { align: "left" });
    text(ctx, "מחיר סופי ליום", x + 76, fy + 92, { size: 20, weight: 500, color: C.muted, align: "left" });
    ctx.restore();
  }
  // the padlock: appears in the clock, snaps shut at 18:00, then flies to the card's corner
  const lp = ep(t, clunk - 0.4, 0.3, ease.back);
  if (lp > 0) {
    const shut = ep(t, clunk, 0.1, ease.in);
    const mv = ep(t, Q["lock.crew"] - 0.05, 0.5, ease.inOut);
    const lx = lerp(cx, x + 4, mv), ly = lerp(cy, y + 4, mv), ls = lerp(170, 92, mv) * lp;
    const shake = kick(t, clunk, 12) * 8;
    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, ls * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = C.teal;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.white;
    ctx.stroke();
    ctx.restore();
    padlock(ctx, lx + Math.sin(t * 80) * shake, ly + ls * 0.04, ls * 0.8, shut, { body: C.white, line: C.white });
    ctx.save();
    ctx.beginPath();
    ctx.arc(lx + Math.sin(t * 80) * shake, ly + ls * 0.04 + ls * 0.8 * 0.22, ls * 0.8 * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = C.teal;
    ctx.fill();
    ctx.restore();
  }
  column(ctx, t, {
    lines: [{ w: ["בערב", "שלפני,", "הצוות", "ננעל."], colors: { 0: C.tealLight, 1: C.tealLight } }, ["יודעים", "מי", "מגיע", "מחר."]],
    at: Q["lock.sweep"] + 0.2,
    sub: "שמות העובדים, שם הנהג ושעת האיסוף.",
    subAt: Q["lock.title"],
    y: 470,
    dark: true,
  });
}

// ── check-in: the morning on site; a misfit costs nothing ───────────────────
export function checkin(ctx, t, Q) {
  bg(ctx, C.mint);
  const swap = Q["checkin.zero"] - 0.35;
  column(ctx, t, { lines: [["בבוקר", "באתר,"], ["מאשרים", "מי", "הגיע."]], at: Q["checkin.title"], y: 470, size: 100, out: swap });
  column(ctx, t, {
    lines: [["על", "עובד", "שלא", "מתאים,"], { w: ["לא", "משלמים."], span: { from: 0, to: 1, at: Q["checkin.zero"] + 0.35 } }],
    at: swap + 0.4,
    sub: "התאגיד מקבל התראה ושולח מחליף.",
    y: 470,
    size: 100,
  });
  const enter = ep(t, Q["checkin.title"] - 0.1, 0.7, ease.out5);
  const s = phone(ctx, 600, 80 + (1 - enter) * 220);
  clipScreen(ctx, s);
  appBar(ctx, s, "היום באתר", "07:05");
  const xr = s.x + s.w - 26, iw = s.w - 52;
  text(ctx, "רחוב הרצל 12, נתניה", xr, s.y + 212, { size: 24, weight: 800 });
  text(ctx, "סמנו כל עובד שהגיע", xr, s.y + 244, { size: 20, weight: 400, color: C.muted });
  const marks = [Q["checkin.c1"], Q["checkin.c2"], Q["checkin.c3"]];
  CREW.slice(0, 3).forEach((wk, i) => {
    const y = s.y + 270 + i * 166;
    const bad = i === 2;
    const p = ep(t, marks[i], 0.3, ease.back);
    card(ctx, xr - iw, y, iw, 152, { r: 18, shadow: 0.05, lift: 8, stroke: p > 0.5 ? (bad ? C.bad : C.ok) : C.line });
    avatar(ctx, xr - 50, y + 54, 64, wk.id);
    text(ctx, wk.name, xr - 96, y + 50, { size: 27, weight: 800 });
    text(ctx, "טפסן", xr - 96, y + 84, { size: 21, weight: 400, color: C.muted });
    const zp = bad ? ep(t, Q["checkin.zero"], 0.35) : 0;
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.font = "800 26px Heebo";
    ctx.fillStyle = zp > 0 ? C.faint : C.navy;
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
    const by = y + 98, bw = (iw - 48) / 2;
    if (p < 0.5) {
      rrect(ctx, xr - 16 - bw, by, bw, 44, 12);
      ctx.fillStyle = C.teal;
      ctx.fill();
      text(ctx, "הגיע ומתאים", xr - 16 - bw / 2, by + 30, { size: 20, weight: 800, color: C.white, align: "center" });
      rrect(ctx, xr - iw + 16, by, bw, 44, 12);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(ctx, "לא מתאים", xr - iw + 16 + bw / 2, by + 30, { size: 20, weight: 700, align: "center" });
    } else {
      chip(ctx, bad ? "לא מתאים · לא משלמים" : "הגיע ומתאים", xr - 16, by + 22, { kind: bad ? "bad" : "ok", size: 21, scale: 0.7 + 0.3 * p });
    }
    tap(ctx, bad ? xr - iw + 16 + bw / 2 : xr - 16 - bw / 2, by + 22, t, marks[i]);
  });
  const tp = ep(t, Q["checkin.zero"] + 0.15, 0.35);
  const ty = s.y + s.h - 120;
  ctx.fillStyle = C.white;
  ctx.fillRect(s.x, ty, s.w, 120);
  ctx.fillStyle = C.line;
  ctx.fillRect(s.x, ty, s.w, 1.5);
  text(ctx, "לתשלום על היום", xr, ty + 62, { size: 23, weight: 600, color: C.muted });
  money(ctx, 3 * DAY - DAY * tp, s.x + 34, ty + 76, 44, { align: "left", color: C.tealDark });
  ctx.restore();
  // the big ₪0 stamp beside the phone
  const zp = ep(t, Q["checkin.zero"], 0.45, ease.back);
  if (zp > 0) {
    ctx.save();
    ctx.translate(912, 800);
    ctx.rotate(-0.12);
    ctx.scale(zp, zp);
    ctx.shadowColor = "rgba(12,96,95,0.3)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    rrect(ctx, -120, -70, 240, 140, 26);
    const g = ctx.createLinearGradient(0, -70, 0, 70);
    g.addColorStop(0, C.tealHi);
    g.addColorStop(1, "#0c665f");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = "transparent";
    money(ctx, 0, 0, 34, 104, { color: C.white });
    ctx.restore();
  }
}

// ── end card ─────────────────────────────────────────────────────────────────
const photo = new Image();
photo.src = "/public/brand/hero-worker-teal.webp";
export const ready = photo.decode().catch(() => {});

export function end(ctx, t, Q) {
  endPlate(ctx, t, Q, {
    photo,
    tags: [{ w: ["צריכים", "עובדים", "לאתר?"], swoosh: { word: 1, at: Q["end.tag"] + 0.4 } }],
    cta: "חפשו עובדים עכשיו",
  });
}
