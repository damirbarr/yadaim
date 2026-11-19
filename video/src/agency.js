// The agency film: "fill your workers' idle days". Plates are draw(ctx, t, Q).
import { C, clamp, lerp, prog, ease, ep, bump, kick, rrect, card, text, kinetic, chip, button, check, avatar, bubble, money } from "./kit.js";
import { W, bg, pageBg, column, tap, brandPlate, endPlate } from "./common.js";

export const CUTS = {
  brand: { kind: "sweep", d: 0.6 },
  import: { kind: "push", d: 0.5 },
  expiry: { kind: "zoom", d: 0.45 },
  offer: { kind: "push", d: 0.5 },
  request: { kind: "push", d: 0.5 },
  end: { kind: "sweep", d: 0.6 },
};

const TEAM = [
  { name: "סרגיי ב.", trade: "טפסן", id: 1 },
  { name: "ראג׳ש ק.", trade: "טפסן", id: 4 },
  { name: "מיכאיל ד.", trade: "ברזלן", id: 2 },
  { name: "ואנג ל.", trade: "רצף", id: 3 },
  { name: "אלכסיי פ.", trade: "טייח", id: 5 },
];
const DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"];

// ── idle: every day without work costs the agency ~₪520 ─────────────────────
export function idle(ctx, t, Q) {
  bg(ctx, C.deep);
  // one worker's week: booked days in teal, then two idle days that start costing money
  const cw = 180, chh = 120, gap = 16, R = W / 2 + 660, sy = 250;
  const p0 = ep(t, Q["idle.cal"], 0.6, ease.out5);
  ctx.save();
  ctx.globalAlpha = clamp(p0 * 1.5);
  avatar(ctx, R - 48, sy + chh / 2, 96, 1);
  text(ctx, "סרגיי ב. · השבוע", R - 120, sy - 34, { size: 30, weight: 700, color: C.onDark });
  DAYS.forEach((d, j) => {
    const xr = R - 120 - j * (cw + gap);
    const y = sy + (1 - ep(t, Q["idle.cal"] + j * 0.05, 0.5, ease.out5)) * 40;
    const isIdle = j >= 3 && j <= 4;
    const on = isIdle && t >= Q["idle.empty"] + (j - 3) * 0.12;
    rrect(ctx, xr - cw, y, cw, chh, 18);
    ctx.fillStyle = isIdle ? (on ? "rgba(217,72,72,0.18)" : "rgba(255,255,255,0.08)") : C.teal;
    ctx.fill();
    if (on) {
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
      rrect(ctx, xr - cw, y, cw, chh, 18);
      ctx.strokeStyle = "#ff8a80";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    text(ctx, d, xr - cw / 2, y + 50, { size: 30, weight: 800, color: C.white, align: "center" });
    text(ctx, isIdle ? "פנוי" : "משובץ", xr - cw / 2, y + 92, { size: 24, weight: 500, color: isIdle ? "#ffb4ad" : "#d9f3ec", align: "center" });
    // a loss marker floats up out of each idle day (no figures: the copy talks about money, not amounts)
    const fp = isIdle ? prog(t, Q["idle.cost"] + (j - 3) * 0.15, 1.3) : 0;
    if (fp > 0 && fp < 1) {
      text(ctx, "הפסד", xr - cw / 2, y - 24 - fp * 60, { size: 34, weight: 800, color: "#ff8a80", align: "center", alpha: Math.sin(Math.PI * fp) });
    }
  });
  ctx.restore();
  kinetic(ctx, ["כל", "יום", "בלי", "עבודה"], t, Q["idle.empty"] - 0.1, W / 2, 640, { size: 110, color: C.white, align: "center", stagger: 0.07 });
  kinetic(ctx, ["עולה", "לכם", "כסף."], t, Q["idle.cost"], W / 2, 800, { size: 110, color: C.white, align: "center", stagger: 0.08, span: { from: 2, to: 2, at: Q["idle.sum"] + 0.1 }, dark: true });
}

// ── brand ────────────────────────────────────────────────────────────────────
export function brand(ctx, t, Q) {
  brandPlate(ctx, t, Q, [{ w: ["ממלאים", "את", "הימים", "הפנויים."], at: "brand.l1", span: { from: 3, to: 3, at: Q["brand.mark"] } }]);
}

// ── import: upload the workers from Excel, once ─────────────────────────────
export function importPlate(ctx, t, Q) {
  pageBg(ctx, t);
  column(ctx, t, {
    eyebrow: "לתאגידים",
    lines: [["מעלים", "את", "העובדים"], { w: ["פעם", "אחת."], swoosh: { word: 1, at: Q["import.done"] + 0.2 } }],
    at: Q["import.title"],
    sub: "מקובץ אקסל, וכל עובד מקבל פרופיל.",
    y: 450,
  });
  const p = ep(t, Q["import.title"] - 0.1, 0.6, ease.out5);
  const x = 170, y = 150, w = 840, h = 780;
  ctx.save();
  ctx.translate(0, (1 - p) * 120);
  ctx.globalAlpha = clamp(p * 1.5);
  card(ctx, x, y, w, h, { r: 30, shadow: 0.08, lift: 26 });
  const xr = x + w - 44;
  text(ctx, "העובדים שלכם", xr, y + 72, { size: 36, weight: 900 });
  // drop zone with the spreadsheet falling in
  const dz = { x: x + 44, y: y + 110, w: w - 88, h: 170 };
  const rows = ep(t, Q["import.rows"], 0.3);
  const zoneH = lerp(dz.h, 0, ep(t, Q["import.rows"] + 0.1, 0.4, ease.inOut));
  if (zoneH > 2) {
    rrect(ctx, dz.x, dz.y, dz.w, zoneH, 20);
    ctx.fillStyle = C.mint;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(dz.x, dz.y, dz.w, zoneH);
    ctx.clip();
    const dp = ep(t, Q["import.drop"], 0.55, ease.spring);
    const fy = lerp(dz.y - 260, dz.y + 32, dp);
    const fx = dz.x + dz.w / 2;
    rrect(ctx, fx - 46, fy, 92, 108, 14);
    ctx.fillStyle = "#1d7044";
    ctx.fill();
    text(ctx, "XLSX", fx, fy + 66, { size: 24, weight: 900, color: C.white, align: "center", dir: "ltr" });
    text(ctx, "עובדים.xlsx", fx - 70, fy + 64, { size: 24, weight: 600, color: C.tealDark, align: "right", alpha: dp });
    ctx.restore();
  }
  // the rows come out of the file, each with its documents' status
  const listY = lerp(dz.y + dz.h + 30, dz.y, ep(t, Q["import.rows"] + 0.1, 0.4, ease.inOut));
  TEAM.forEach((wk, i) => {
    const rp = ep(t, Q["import.rows"] + 0.1 + i * 0.08, 0.4, ease.out5);
    if (rp <= 0) return;
    const ry = listY + i * 104 + (1 - rp) * 40;
    ctx.save();
    ctx.globalAlpha *= rp * rows;
    if (i) {
      ctx.fillStyle = C.line;
      ctx.fillRect(x + 44, ry - 6, w - 88, 1.5);
    }
    avatar(ctx, xr - 34, ry + 44, 68, wk.id, ["formwork", "formwork", "rebar", "tiling", "plaster"][i]);
    text(ctx, wk.name, xr - 86, ry + 40, { size: 28, weight: 800 });
    text(ctx, wk.trade, xr - 86, ry + 74, { size: 22, weight: 400, color: C.muted });
    chip(ctx, "4 מסמכים בתוקף", x + 60, ry + 44, { kind: "ok", size: 21, align: "left" });
    ctx.restore();
  });
  ctx.restore();
  const dp = ep(t, Q["import.done"], 0.4, ease.back);
  if (dp > 0) chip(ctx, "38 עובדים נוספו", x + w / 2, y + h - 60, { kind: "solid", icon: "check", size: 28, align: "center", scale: 0.6 + 0.4 * dp, alpha: clamp(dp * 2) });
}

// ── expiry: automatic tracking, an alert 60 days before ─────────────────────
export function expiry(ctx, t, Q) {
  bg(ctx, C.mint);
  column(ctx, t, {
    lines: [["מעקב", "אוטומטי"], ["אחרי", "תוקף", "המסמכים."]],
    at: Q["expiry.title"],
    sub: "מקבלים התראה הרבה לפני שמסמך פג.",
    subAt: Q["expiry.warn"],
    y: 470,
  });
  const p = ep(t, Q["expiry.title"] - 0.1, 0.6, ease.out5);
  const x = 170, y = 170, w = 840, h = 700;
  ctx.save();
  ctx.translate(0, (1 - p) * 100);
  ctx.globalAlpha = clamp(p * 1.5);
  card(ctx, x, y, w, h, { r: 30, shadow: 0.08, lift: 26 });
  const xr = x + w - 44;
  text(ctx, "תוקף מסמכים", xr, y + 72, { size: 36, weight: 900 });
  const docs = [["סרגיי ב.", "אשרה", "עד 03.2027", 1], ["ראג׳ש ק.", "ביטוח רפואי", "עד 01.2027", 4], ["מיכאיל ד.", "אישור עבודה בגובה", "עוד 60 יום", 2], ["ואנג ל.", "דרכון", "עד 08.2028", 3]];
  const scan = prog(t, Q["expiry.scan"], 0.9);
  docs.forEach(([n, d, until, id], i) => {
    const ry = y + 120 + i * 130;
    const hot = i === 2 && t >= Q["expiry.warn"];
    rrect(ctx, x + 40, ry, w - 80, 112, 18);
    ctx.fillStyle = hot ? C.warnBg : C.paper;
    ctx.fill();
    avatar(ctx, xr - 40, ry + 56, 64, id);
    text(ctx, n, xr - 88, ry + 48, { size: 27, weight: 800 });
    text(ctx, d, xr - 88, ry + 84, { size: 22, weight: 400, color: C.muted });
    const seen = scan * 4 > i + 0.5;
    if (hot) {
      const hp = ep(t, Q["expiry.warn"], 0.35, ease.back);
      chip(ctx, "עומד לפוג · עוד 60 יום", x + 64, ry + 56, { kind: "warn", icon: "bell", size: 22, align: "left", scale: 0.7 + 0.3 * hp + 0.05 * Math.sin(t * 14) * kick(t, Q["expiry.warn"], 3) });
    } else if (seen) {
      chip(ctx, `בתוקף ${until}`, x + 64, ry + 56, { kind: "ok", size: 21, align: "left" });
    } else {
      text(ctx, until, x + 64, ry + 64, { size: 22, weight: 500, color: C.faint, align: "left" });
    }
  });
  // scanning line
  if (scan > 0 && scan < 1) {
    const ly = y + 110 + scan * 530;
    const g = ctx.createLinearGradient(0, ly - 40, 0, ly);
    g.addColorStop(0, "rgba(15,143,128,0)");
    g.addColorStop(1, "rgba(15,143,128,0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(x + 40, ly - 40, w - 80, 40);
    ctx.fillStyle = C.teal;
    ctx.fillRect(x + 40, ly, w - 80, 3);
  }
  ctx.restore();
  // the renewal request goes to the worker on WhatsApp
  const wp = ep(t, Q["expiry.wa"], 0.45, ease.back);
  if (wp > 0) chip(ctx, "בקשת חידוש נשלחה למיכאיל בוואטסאפ", x + w / 2, y + h + 60, { kind: "teal", icon: "check", size: 26, align: "center", scale: 0.7 + 0.3 * wp, alpha: clamp(wp * 2) });
}

// ── offer: a ready offer for every idle day; approve and it goes out ────────
export function offer(ctx, t, Q) {
  pageBg(ctx, t);
  column(ctx, t, {
    lines: [["הצעה", "מוכנה", "לכל"], { w: ["יום", "פנוי."], span: { from: 0, to: 1, at: Q["offer.fill"] } }],
    at: Q["offer.title"],
    sub: "אתם מאשרים, וההצעה יוצאת לקבלנים שלכם.",
    subAt: Q["offer.send"],
    y: 470,
  });
  const p = ep(t, Q["offer.title"] - 0.1, 0.6, ease.out5);
  const x = 150, y = 150, w = 860, h = 600;
  ctx.save();
  ctx.translate(0, (1 - p) * 120);
  ctx.globalAlpha = clamp(p * 1.5);
  card(ctx, x, y, w, h, { r: 30, shadow: 0.08, lift: 24 });
  const xr = x + w - 40;
  text(ctx, "השבוע · 5 עובדים", xr, y + 68, { size: 32, weight: 900 });
  const nameW = 200, gx1 = xr - nameW, cw = (gx1 - (x + 40)) / DAYS.length, rh = 84, gy = y + 130;
  DAYS.forEach((d, j) => text(ctx, d, gx1 - cw * j - cw / 2, gy - 20, { size: 24, weight: 700, color: C.muted, align: "center" }));
  const busy = [[1, 1, 1, 0, 0, 0], [1, 1, 1, 1, 1, 0], [0, 0, 1, 1, 1, 1], [1, 1, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1]];
  let k = 0;
  busy.forEach((row, i) => {
    const ry = gy + i * rh;
    avatar(ctx, xr - 26, ry + rh / 2, 48, TEAM[i].id);
    text(ctx, TEAM[i].name, xr - 62, ry + rh / 2 + 9, { size: 23, weight: 700 });
    row.forEach((b, j) => {
      const cx0 = gx1 - cw * (j + 1) + 5, cy0 = ry + 8, cww = cw - 10, chh = rh - 16;
      rrect(ctx, cx0, cy0, cww, chh, 12);
      if (b) {
        ctx.fillStyle = C.navy2;
        ctx.fill();
        return;
      }
      ctx.fillStyle = C.paper2;
      ctx.fill();
      const fp = ep(t, Q["offer.fill"] + k++ * 0.05, 0.28, ease.back);
      if (fp > 0) {
        ctx.save();
        ctx.translate(cx0 + cww / 2, cy0 + chh / 2);
        ctx.scale(fp, fp);
        rrect(ctx, -cww / 2, -chh / 2, cww, chh, 12);
        ctx.fillStyle = C.teal;
        ctx.fill();
        check(ctx, 0, 0, 22, C.white, 4, clamp(fp));
        ctx.restore();
      } else {
        text(ctx, "פנוי", cx0 + cww / 2, cy0 + chh / 2 + 8, { size: 20, weight: 500, color: C.faint, align: "center" });
      }
    });
  });
  ctx.restore();
  // the offer card, approved with one press, flies out
  const op = ep(t, Q["offer.card"], 0.45, ease.back);
  const fly = ep(t, Q["offer.fly"] - 0.1, 0.45, ease.in);
  if (op > 0 && fly < 1) {
    const ox = 270, oy = 640, ow = 620, oh = 300;
    ctx.save();
    ctx.translate(ox + ow / 2 - fly * 520, oy + oh / 2 - fly * 380);
    ctx.scale(op * (1 - fly * 0.6), op * (1 - fly * 0.6));
    ctx.rotate(-fly * 0.3);
    ctx.globalAlpha = 1 - fly;
    ctx.translate(-ow / 2, -oh / 2);
    card(ctx, 0, 0, ow, oh, { r: 26, shadow: 0.18, lift: 30 });
    const r = ow - 36;
    chip(ctx, "הצעה מוכנה לאישור", r, 52, { kind: "teal", size: 22 });
    text(ctx, "4 עובדים · 9 ימים פנויים השבוע", r, 132, { size: 34, weight: 900 });
    text(ctx, "תישלח ל־12 קבלנים מהמאגר שלכם", r, 176, { size: 23, weight: 400, color: C.muted });
    button(ctx, "אישור ושליחה", r - 130, 240, 260, 64, { size: 25, scale: 1 - 0.06 * bump(t, Q["offer.send"] - 0.05, 0.2) });
    ctx.restore();
    if (fly === 0) tap(ctx, ox + ow - 36 - 130, oy + 240, t, Q["offer.send"]);
  }
  // the WhatsApp message lands with the contractors
  const bp = ep(t, Q["offer.fly"] + 0.2, 0.4, ease.back);
  if (bp > 0) {
    bubble(ctx, "4 עובדים פנויים השבוע. להזמנה לחצו על הקישור", 990, 830, { size: 26, scale: 0.7 + 0.3 * bp, alpha: clamp(bp * 2) });
    chip(ctx, "נשלח ל־12 קבלנים", 990, 910, { kind: "teal", icon: "check", size: 22, alpha: ep(t, Q["offer.fly"] + 0.5, 0.3) });
  }
}

// ── request: a contractor's request with every detail; approve in one press ─
export function request(ctx, t, Q) {
  bg(ctx, C.mint);
  column(ctx, t, {
    lines: [["בקשה", "עם", "כל", "הפרטים,"], { w: ["מאשרים", "בלחיצה."], swoosh: { word: 1, at: Q["request.approve"] + 0.2 } }],
    at: Q["request.title"],
    sub: "הזמינות והאישורים כבר נבדקו.",
    subAt: Q["request.rows"] + 0.3,
    y: 470,
  });
  const p = ep(t, Q["request.card"], 0.55, ease.out5);
  const x = 190, y = 150, w = 800, h = 780;
  ctx.save();
  ctx.translate(0, (1 - p) * 140);
  ctx.globalAlpha = clamp(p * 1.5);
  card(ctx, x, y, w, h, { r: 30, shadow: 0.1, lift: 30 });
  const xr = x + w - 50;
  const approved = ep(t, Q["request.approve"] + 0.1, 0.35, ease.back);
  chip(ctx, approved > 0.5 ? "אושר" : "בקשה חדשה", xr, y + 66, { kind: approved > 0.5 ? "ok" : "info", size: 24, scale: approved > 0.5 ? 0.8 + 0.2 * approved : 1 });
  text(ctx, "ש.ב. בנייה", xr, y + 150, { size: 46, weight: 900 });
  chip(ctx, "קבלן רשום", xr - 260, y + 136, { kind: "ok", size: 21 });
  const rows = [["מקצוע", "3 טפסנים"], ["תאריכים", "א׳–ה׳ · 5 ימים"], ["אתר", "רחוב הרצל 12, נתניה"]];
  rows.forEach(([k2, v], i) => {
    const rp = ep(t, Q["request.rows"] - 0.2 + i * 0.1, 0.4, ease.out5);
    const ry = y + 220 + i * 92;
    ctx.save();
    ctx.globalAlpha *= rp;
    ctx.fillStyle = C.line;
    ctx.fillRect(x + 50, ry, w - 100, 1.5);
    text(ctx, k2, xr, ry + 58, { size: 26, weight: 500, color: C.muted });
    text(ctx, v, x + 50, ry + 58, { size: 28, weight: 800, align: "left" });
    ctx.restore();
  });
  // the workers the contractor picked
  const ap = ep(t, Q["request.rows"] + 0.2, 0.4);
  ctx.save();
  ctx.globalAlpha *= ap;
  text(ctx, "העובדים שנבחרו", xr, y + 540, { size: 26, weight: 500, color: C.muted });
  [1, 4, 2].forEach((id, i) => avatar(ctx, x + 90 + i * 64, y + 528, 76, id));
  ctx.restore();
  button(ctx, "אישור ההצבה", x + w - 50 - 190, y + 670, 380, 84, { size: 30, scale: 1 - 0.05 * bump(t, Q["request.approve"] - 0.05, 0.22) });
  button(ctx, "החלפת עובד", x + 50 + 160, y + 670, 320, 84, { size: 30, kind: "ghost" });
  ctx.restore();
  tap(ctx, x + w - 50 - 190, y + 670, t, Q["request.approve"]);
}

// ── end card ─────────────────────────────────────────────────────────────────
const photo = new Image();
photo.src = "/public/brand/hero-worker-teal.webp";
export const ready = photo.decode().catch(() => {});

export function end(ctx, t, Q) {
  endPlate(ctx, t, Q, {
    photo,
    tags: [{ w: ["מנהלים", "עובדים?"] }, { w: ["יש", "לכם", "ידיים."], span: { from: 0, to: 2, at: Q["end.tag"] + 0.6 } }],
    cta: "הצטרפו כתאגיד",
  });
}

// "import" is a reserved word as a function name, so the plate id maps here
export { importPlate as import };
