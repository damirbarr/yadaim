// Pieces shared by both films: the text column, the phone, worker rows, the logo plate and the end card.
import { C, clamp, lerp, prog, ease, ep, bump, rrect, card, text, measure, kinetic, chip, button, logo, avatar, softBg, money } from "./kit.js";

export const W = 1920, H = 1080;
export const COL = 1740; // right edge of the text column (RTL)
const MAXW = 680; // its width: the left half belongs to the phone or card

export const CREW = [
  { name: "סרגיי ב.", years: 12, rate: "4.9", id: 1 },
  { name: "ראג׳ש ק.", years: 9, rate: "4.8", id: 4 },
  { name: "מיכאיל ד.", years: 15, rate: "4.9", id: 2 },
  { name: "ואנג ל.", years: 7, rate: "4.7", id: 3 },
];
export const DAY = 702; // ₪78/h all-in (lodging + transport by the agency) × 9 h: the landing page's sample crew price

export function bg(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

/** The app's page background: the faintest mint, with a soft corner shape so it doesn't look flat. */
export function pageBg(ctx, t) {
  bg(ctx, C.paper);
  ctx.save();
  ctx.translate(W - 120, 120 + Math.sin(t * 0.5) * 8);
  ctx.rotate(0.7 + t * 0.02);
  rrect(ctx, -230, -230, 460, 460, 130);
  ctx.fillStyle = "rgba(15,143,128,0.05)";
  ctx.fill();
  ctx.restore();
}

/** Eyebrow chip + multi-line kinetic headline + optional sub line, right-aligned in the text column. */
export function column(ctx, t, { eyebrow, eyebrowAt, lines, at, sub, subAt, y = 420, size = 92, out = null, dark = false, gap = 0.26 }) {
  const color = dark ? C.white : C.navy;
  const widest = Math.max(...lines.map((l) => measure(ctx, (Array.isArray(l) ? l : l.w).join(" "), size, 900)));
  size = Math.min(size, (size * MAXW) / widest);
  const q = out == null ? 0 : ep(t, out, 0.3);
  if (eyebrow) {
    const p = ep(t, eyebrowAt ?? at - 0.1, 0.45, ease.back);
    if (p > 0) chip(ctx, eyebrow, COL, y - size * 1.3, { kind: dark ? "dark" : "teal", size: 26, alpha: clamp(p * 2) * (1 - q), scale: 0.8 + 0.2 * p });
  }
  let yy = y;
  lines.forEach((l, i) => {
    const words = Array.isArray(l) ? l : l.w;
    kinetic(ctx, words, t, at + i * gap, COL, yy, { size, color, stagger: 0.06, out: out == null ? null : out + i * 0.05, span: l.span, swoosh: l.swoosh, colors: l.colors, dark });
    yy += size * 1.2;
  });
  if (sub) {
    const p = ep(t, subAt ?? at + lines.length * gap + 0.2, 0.5);
    text(ctx, sub, COL, yy + 24 + (1 - p) * 20, { size: 34, weight: 400, color: dark ? C.onDark : C.muted, alpha: p * (1 - q) });
  }
}

/** A tap ripple where a finger would press. */
export function tap(ctx, x, y, t, at) {
  const p = prog(t, at - 0.1, 0.55);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.35;
  ctx.beginPath();
  ctx.arc(x, y, 14 + p * 46, 0, Math.PI * 2);
  ctx.fillStyle = C.tealDark;
  ctx.fill();
  ctx.restore();
}

/** Phone frame. Returns the screen rect; draw inside after clipScreen(), then ctx.restore(). */
export function phone(ctx, cx, top, w = 450, h = 920) {
  const x = cx - w / 2;
  ctx.save();
  ctx.shadowColor = "rgba(11,34,51,0.2)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 30;
  rrect(ctx, x, top, w, h, 64);
  ctx.fillStyle = "#0d1f2b";
  ctx.fill();
  ctx.restore();
  const s = { x: x + 14, y: top + 14, w: w - 28, h: h - 28, r: 52 };
  rrect(ctx, s.x, s.y, s.w, s.h, s.r);
  ctx.fillStyle = C.paper;
  ctx.fill();
  return s;
}
export function clipScreen(ctx, s) {
  ctx.save();
  rrect(ctx, s.x, s.y, s.w, s.h, s.r);
  ctx.clip();
}
/** The app's white header with the logo and a page title under it. */
export function appBar(ctx, s, title, sub) {
  ctx.fillStyle = C.white;
  ctx.fillRect(s.x, s.y, s.w, 160);
  ctx.fillStyle = C.line;
  ctx.fillRect(s.x, s.y + 160, s.w, 1.5);
  rrect(ctx, s.x + s.w / 2 - 60, s.y + 14, 120, 32, 16);
  ctx.fillStyle = "#000";
  ctx.fill();
  logo(ctx, s.x + s.w - 30 - 58, s.y + 82, 46);
  text(ctx, title, s.x + s.w - 30, s.y + 140, { size: 28, weight: 800 });
  if (sub) text(ctx, sub, s.x + 30, s.y + 140, { size: 21, weight: 500, color: C.muted, align: "left" });
}

/** Worker row used in the phone lists. Right edge at x. */
export function workerRow(ctx, x, y, w, wk, { sub, h = 116, stroke } = {}) {
  card(ctx, x - w, y, w, h, { r: 18, shadow: 0.05, lift: 8, stroke: stroke ?? C.line });
  avatar(ctx, x - 48, y + h / 2, 62, wk.id);
  text(ctx, wk.name, x - 92, y + 48, { size: 28, weight: 800 });
  text(ctx, sub ?? `טפסן · ${wk.years} שנות ותק`, x - 92, y + 86, { size: 21, weight: 400, color: C.muted });
}

/** Logo plate: the logo assembles, then rises for the lines under it. */
export function brandPlate(ctx, t, Q, lines) {
  softBg(ctx, W, H, t);
  const up = ep(t, Q["brand.l1"] - 0.2, 0.6, ease.inOut);
  const h = lerp(300, 230, up);
  logo(ctx, W / 2, lerp(500, 330, up), h, { reveal: prog(t, Q["brand.reveal"], 0.7), hat: prog(t, Q["brand.hat"] - 0.15, 0.9) });
  lines.forEach((l, i) => {
    kinetic(ctx, l.w, t, Q[l.at], W / 2, 700 + i * 112, { size: 86, align: "center", stagger: 0.06, span: l.span, swoosh: l.swoosh });
  });
}

/** End card in the reference ads' layout: the photo on the left in a rounded frame, logo, line, the action. */
export function endPlate(ctx, t, Q, { tags, cta, cta2, foot, photo }) {
  softBg(ctx, W, H, t);
  const hit = Q["end.hit"];
  // photo: slides in, never faded or masked over the face
  if (photo && photo.complete) {
    const p = ep(t, hit, 0.8, ease.out5);
    const ph = 840, pw = (photo.naturalWidth / photo.naturalHeight) * ph;
    const x = 130 - (1 - p) * 80, y = (H - ph) / 2;
    ctx.save();
    ctx.globalAlpha = clamp(p * 1.5);
    ctx.shadowColor = "rgba(11,34,51,0.18)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 20;
    rrect(ctx, x, y, pw, ph, 28);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = clamp(p * 1.5);
    rrect(ctx, x, y, pw, ph, 28);
    ctx.clip();
    ctx.drawImage(photo, x, y, pw, ph);
    ctx.restore();
  }
  const cx = photo ? 1170 : W / 2;
  const top = tags.length > 1 ? 250 : 300;
  logo(ctx, cx, top, 230, { reveal: prog(t, hit, 0.7), hat: prog(t, hit + 0.1, 0.9) });
  tags.forEach((tag, i) => kinetic(ctx, tag.w, t, Q["end.tag"] + i * 0.3, cx, top + 250 + i * 110, { size: 84, align: "center", stagger: 0.06, span: tag.span, swoosh: tag.swoosh }));
  const by = top + 250 + tags.length * 110 + 40;
  const cp = ep(t, Q["end.cta"], 0.5, ease.back);
  if (cp > 0) {
    if (cta2) {
      button(ctx, cta, cx + 175, by, 330, 92, { size: 34, scale: 0.8 + 0.2 * cp, alpha: clamp(cp * 2), arrow: true });
      button(ctx, cta2, cx - 175, by, 300, 92, { size: 34, kind: "ghost", scale: 0.8 + 0.2 * cp, alpha: clamp(cp * 2) });
    } else {
      button(ctx, cta, cx, by, 480, 96, { size: 38, scale: 0.8 + 0.2 * cp + 0.03 * bump(t, Q["end.cta"] + 0.9, 0.4), alpha: clamp(cp * 2), arrow: true });
    }
  }
  if (foot) text(ctx, foot, cx, by + 120, { size: 28, weight: 500, color: C.muted, align: "center", alpha: ep(t, Q["end.cta"] + 0.3, 0.5) });
}

export { money };
