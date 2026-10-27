// End-to-end test of every role, run against a dev server with fresh demo data:
//
//   npm run db:reset && npm run dev        (terminal 1)
//   npm run test:e2e                        (terminal 2)
//
// Uses dev mode (no Google sign-in): the persona is chosen with the `yd_dev_as` cookie, exactly like the DEV toolbar.
// Env: BASE_URL (default http://localhost:3000), SHOTS=1 to save screenshots into tests/screenshots/.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const B = process.env.BASE_URL || "http://localhost:3000";
const DIR = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(DIR, "screenshots");
if (process.env.SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// Seed user ids (lib/seed.ts inserts them in this order)
const U = { agencyOwner: 1, agencyManager: 2, agencyViewer: 3, contractorOwner: 8, foreman: 9, admin: 13, newUser: 14 };

let passed = 0;
const ok = (cond, msg) => {
  if (!cond) throw new Error("FAILED: " + msg);
  passed++;
  console.log("  ✓", msg);
};
const step = (t) => console.log("\n▶", t);

const browser = await chromium.launch();
async function as(userId, { mobile = false } = {}) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } : { viewport: { width: 1360, height: 900 } });
  if (userId) await ctx.addCookies([{ name: "yd_dev_as", value: String(userId), url: B }]);
  const p = await ctx.newPage();
  p.setDefaultTimeout(90_000);
  p.on("pageerror", (e) => console.log("    [pageerror]", e.message));
  return p;
}
const shot = async (p, name) => process.env.SHOTS && p.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true });

try {
  step("Dev mode: every area opens without signing in");
  const anon = await as(null);
  for (const [url, title] of [["/c", "הזמנה חדשה"], ["/a", "היום"], ["/admin", "ניהול"]]) {
    await anon.goto(B + url);
    ok((await anon.title()).includes(title), `${url} opens with a default demo persona`);
  }
  await anon.goto(B + "/login");
  ok((await anon.locator("text=מצב פיתוח").count()) > 0, "login page shows dev-mode shortcuts");

  step("Languages: one tap switches the whole app, direction included");
  const lang = await as(U.agencyOwner);
  await lang.goto(B + "/a/workers");
  for (const [code, dir] of [["en", "ltr"], ["ar", "rtl"], ["he", "rtl"]]) {
    await Promise.all([lang.waitForResponse((r) => r.request().method() === "POST"), lang.locator(`button[lang=${code}]`).first().click()]);
    await lang.waitForFunction((c) => document.documentElement.lang === c, code);
    ok((await lang.locator("html").getAttribute("dir")) === dir, `${code}: page switched (dir=${dir})`);
  }
  ok((await lang.locator("h1").first().innerText()).includes("העובדים שלי"), "back in Hebrew, same page");

  step("Contractor (owner) books two tilers");
  const c = await as(U.contractorOwner, { mobile: true });
  await c.goto(B + "/c/search?trade=tiling&city=" + encodeURIComponent("נתניה") + "&days=1&count=2");
  const cards = c.locator("article");
  ok((await cards.count()) >= 2, `search returned ${await cards.count()} tilers`);
  await cards.nth(0).locator('button:has-text("הוספה")').click();
  await cards.nth(1).locator('button:has-text("הוספה")').click();
  await shot(c, "01-search");
  await c.click('a:has-text("המשך להזמנה")');
  await c.waitForURL(/checkout/);
  await c.fill("input[name=address]", "רח׳ הרצל 12, נתניה");
  await shot(c, "02-checkout");
  await Promise.all([c.waitForURL(/\/c\/orders/), c.click('button:has-text("שליחת")')]);
  const bookingId = (c.url().match(/orders\/(\d+)/) || [])[1];
  ok(/sent/.test(c.url()), `booking #${bookingId} sent`);

  step("Agency manager approves requests");
  const m = await as(U.agencyManager);
  await m.goto(B + "/a/requests");
  await shot(m, "03-requests");
  const pending = await m.locator('a:has-text("לשיבוץ")').count();
  ok(pending >= 2, `${pending} pending requests`);
  await m.locator('a:has-text("לשיבוץ")').first().click();
  await m.waitForURL(/requests\/\d+/);
  await m.fill("input[name=driver_name]", "סאלח").catch(() => {});
  await Promise.all([m.waitForURL(/approved=/), m.click('button:has-text("אישור ושליחה לקבלן")')]);
  ok(true, "manager approved a request");

  step("RBAC: agency viewer is read-only");
  const v = await as(U.agencyViewer);
  await v.goto(B + "/a/settings");
  ok(v.url().includes("/forbidden"), "viewer → /a/settings is forbidden");
  await v.goto(B + "/a/billing");
  ok(v.url().includes("/forbidden"), "viewer → /a/billing is forbidden");
  await v.goto(B + "/a/workers");
  ok((await v.locator('a:has-text("הוספת עובד")').count()) === 0, "viewer sees no 'add worker'");
  await v.goto(B + "/a/requests");
  const req = v.locator('a:has-text("לשיבוץ")').first();
  if (await req.count()) {
    await Promise.all([v.waitForURL(/requests\/\d+/), req.click()]);
    ok((await v.locator("text=הרשאת צפייה בלבד").count()) === 1 && (await v.locator('button:has-text("אישור ושליחה")').count()) === 0, "viewer cannot approve requests");
  }
  ok((await v.locator('a[href="/a/team"]').count()) === 0, "viewer has no team menu");
  await m.goto(B + "/a/team");
  ok(m.url().includes("/forbidden"), "manager → team management is forbidden");

  step("Contractor work day: arrival, first-arrival questions, no-show, entry/exit, end of day, hours, rating, saved crew");
  await c.goto(B + "/c");
  const start = c.locator('[data-today] a[data-act="work-day"]').filter({ hasText: "בן גוריון" });
  ok((await start.count()) === 1 && (await start.innerText()).includes("תחילת יום עבודה"), "home opens the work day of today's crew");
  await Promise.all([c.waitForURL(/\/site/), start.click()]);
  const dayCards = c.locator("section[data-bw]");
  ok((await dayCards.count()) === 3, "one card per worker");
  // Every tap and every picked time is a server action; wait for its response and the re-render before the next one.
  const posted = () => c.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/site"));
  const settle = async () => { await c.waitForLoadState("networkidle"); await c.waitForTimeout(250); };
  const tap = async (i, act) => { await Promise.all([posted(), dayCards.nth(i).locator(`button[data-act="${act}"]`).click()]); await settle(); };
  const pick = async (i, name, v) => { await Promise.all([posted(), dayCards.nth(i).locator(`select[name=${name}]`).selectOption(v)]); await settle(); };
  await tap(0, "arrive"); await tap(0, "identity_ok-yes"); await tap(0, "trade_ok-yes");
  await tap(1, "arrive"); await tap(1, "identity_ok-yes"); await tap(1, "trade_ok-no");
  await tap(2, "noshow");
  ok((await dayCards.nth(2).innerText()).includes("היום הזה לא יחויב"), "no-show marked, the day is not billed");
  ok((await dayCards.nth(1).innerText()).includes("לא תואם · לא יחויב"), "no-fit worker flagged as not billed");
  await pick(0, "start", "07:00");
  ok((await c.locator('button[data-act="end-day"]').count()) === 1, "one tap ends the day for everyone still on site");
  await Promise.all([posted(), c.click('button[data-act="end-day"]')]); await settle();
  await pick(0, "end", "16:30");
  ok((await dayCards.nth(0).locator("[data-hours]").innerText()).includes("9"), "07:00 to 16:30 is 9 paid hours after the break");
  await shot(c, "04-site");
  ok((await c.locator('input[name^="hours_"]').count()) === 1 && (await c.locator('input[name^="hours_"]').inputValue()) === "9", "hours approval is pre-filled from attendance, only for the billable worker");
  await Promise.all([c.waitForURL(/done=1/), c.click('button:has-text("אישור שעות ודירוג")')]);
  ok((await c.locator("text=לא תואם · לא חויב").count()) === 1 && (await c.locator("text=לא הגיע · לא חויב").count()) === 1, "completed; no-fit and no-show workers not billed");
  await c.fill("input[name=name]", "ברזלנים טובים");
  await Promise.all([c.waitForURL(/crews/), c.click('button:has-text("שמירה")')]);
  ok((await c.locator("text=ברזלנים טובים").count()) === 1, "crew saved");
  const f = await as(U.foreman);
  await f.goto(B + "/c/team");
  ok(f.url().includes("/forbidden"), "foreman (manager) cannot manage the contractor team");

  step("Multi-day booking: daily attendance by the foreman, read-only for the agency");
  const fm = await as(U.foreman, { mobile: true });
  await fm.goto(B + "/c");
  const md = fm.locator('[data-today] a[data-act="work-day"]').filter({ hasText: "שמואל הנציב" });
  ok((await md.count()) === 1 && (await md.innerText()).includes("יום 4 מתוך 6"), "foreman sees day 4 of 6 of the multi-day crew");
  const mdId = (await md.getAttribute("href")).match(/orders\/(\d+)/)[1];
  await Promise.all([fm.waitForURL(/\/site/), md.click()]);
  const strip = fm.locator('nav[aria-label="ימי ההזמנה"] li');
  ok((await strip.count()) === 6, "the day strip shows all six work days");
  const mdCards = fm.locator("section[data-bw]");
  await Promise.all([fm.waitForResponse((r) => r.request().method() === "POST"), mdCards.nth(0).locator('button[data-act="arrive"]').click()]);
  await fm.waitForLoadState("networkidle");
  ok((await mdCards.nth(0).locator("select[name=start]").count()) === 1 && (await mdCards.nth(0).innerText()).includes("נבדק בהגעה הראשונה"), "arrival records the entry time; the questions are not asked again");
  await Promise.all([fm.waitForURL(/d=/), strip.first().locator("a").click()]);
  ok((await fm.locator("section[data-bw] [data-hours]").first().innerText()).includes("9"), "an earlier day shows its recorded hours");
  const ag = await as(U.agencyOwner);
  await ag.goto(B + `/a/requests/${mdId}`);
  const att = ag.locator("[data-attendance]");
  ok((await att.count()) === 1 && (await att.innerText()).includes("לא הגיע"), "the agency sees the daily attendance, missed day included");

  step("Compliance: renewal request over WhatsApp, then the agency renews the document with a scan");
  const o = await as(U.agencyOwner);
  await o.goto(B + "/a/compliance");
  const before = await o.locator("tbody tr").count();
  await o.click('button:has-text("שליחת בקשת חידוש")');
  const waRenew = await o.locator('a[href^="https://wa.me/"]').first().getAttribute("href");
  ok(decodeURIComponent(waRenew).includes("נא לשלוח בתשובה צילום"), "renewal request opens WhatsApp with a Hebrew message");
  await o.click('button:has-text("סגירה")');
  const workerHref = await o.locator("tbody tr").first().locator("a").getAttribute("href");
  await o.goto(B + workerHref);
  const png = path.join(DIR, ".tmp-doc.png");
  fs.writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  for (const k of ["visa", "insurance", "heights"]) await o.fill(`input[name=doc_${k}_expires]`, "2028-12-31");
  await o.locator("input[name=doc_insurance_file]").setInputFiles(png);
  await Promise.all([o.waitForURL(/saved=1/), o.click('button:has-text("שמירה")')]);
  await o.goto(B + "/a/compliance");
  ok((await o.locator("tbody tr").count()) < before, "renewed document left the compliance list");

  step("Excel import + CRM paste + campaign tracking");
  await o.goto(B + "/a/workers");
  await o.locator("input[type=file]").setInputFiles(path.join(DIR, "..", "public", "templates", "workers.xlsx")); // picking the file is the whole action
  await o.waitForSelector("text=נוספו");
  ok((await o.locator("text=נוספו 4 עובדים").count()) === 1, "XLSX template imported 4 workers");
  // A sheet that isn't the template: the user maps its columns once, then it imports.
  const odd = path.join(DIR, ".tmp-odd-workers.csv");
  fs.writeFileSync(odd, "Worker Name,Job,Nationality,Mobile,Visa valid until,Notes\nפטר ס.,טפסן,מולדובה,0521112233,31/12/2027,ותיק\nלי וי,רצף,סין,0523334455,30/06/2027,\n");
  await o.goto(B + "/a/workers");
  await o.locator("input[type=file]").setInputFiles(odd);
  await o.waitForSelector("text=התאימו את העמודות בקובץ");
  ok((await o.locator('select[aria-label="מקצוע"]').inputValue()) === "1", "unknown sheet: columns pre-matched, mapping step shown");
  await o.click('button:has-text("ייבוא מהקובץ")');
  await o.waitForSelector("text=נוספו 2 עובדים");
  ok(true, "mapped sheet imported 2 workers");
  await o.goto(B + "/a/contractors");
  await o.fill("textarea[name=pasted]", "דני רוזן 052-9998877\nשמעון ביטון, 054-1112299");
  await o.click('button:has-text("הוספת הרשימה")');
  await o.waitForSelector("text=נוספו");
  ok((await o.locator("text=נוספו 2 קבלנים").count()) === 1, "pasted WhatsApp contacts imported");
  await o.goto(B + "/a/campaigns");
  await Promise.all([o.waitForURL(/campaigns\/\d+/), o.click('button:has-text("בוואטסאפ")')]);
  const waHref = await o.locator('a:has-text("שליחה")').first().getAttribute("href");
  const r = await o.request.get(B + waHref, { maxRedirects: 0 });
  const wa = r.headers()["location"] || "";
  ok(wa.startsWith("https://wa.me/972"), "campaign send redirects to WhatsApp");
  const ref = decodeURIComponent(wa).match(/\/r\/([\w-]+)/)[1];
  await c.goto(B + "/r/" + ref);
  ok(/\/o\//.test(c.url()), "tracking link lands on the public offer page");
  const csv = await o.request.get(B + "/api/reports/placements?m=" + new Date().toISOString().slice(0, 7));
  ok(csv.status() === 200 && (await csv.text()).split("\n").length > 2, "placement report CSV exported");

  step("Team invite");
  await o.goto(B + "/a/team");
  await o.fill("input[name=email]", "new.manager@example.com");
  await o.click('button:has-text("הזמנה לצוות")');
  await o.waitForSelector("text=נשלחה הזמנה");
  ok(true, "owner invited a manager by email");

  step("Onboarding a new Google user as an agency, then Excel import");
  const n = await as(U.newUser);
  await n.goto(B + "/a");
  ok(n.url().includes("/onboarding"), "pending user is sent to onboarding");
  await n.click('label:has-text("אני תאגיד")');
  await n.fill("input[name=company]", "תאגיד בדיקה בע״מ");
  await n.fill("input[name=number]", "ת-2026-9999");
  await n.fill("input[name=phone]", "050-5555555");
  await n.selectOption("select[name=city]", "חדרה");
  await n.click('label:has-text("שרון")');
  await Promise.all([n.waitForURL(/welcome=1/), n.click('button:has-text("המשך")')]);
  ok((await n.locator("text=ממתין לאימות").count()) >= 1, "new agency created, pending verification");
  await n.locator("input[type=file]").setInputFiles(path.join(DIR, "..", "public", "templates", "workers.xlsx"));
  await n.waitForSelector("text=נוספו");
  ok(true, "new agency imported its workers from Excel");

  step("Admin: verify, impersonate, audit");
  const a = await as(U.admin);
  await a.goto(B + "/admin");
  await a.locator('tr:has-text("תאגיד בדיקה") button:has-text("אימות")').click();
  await a.waitForLoadState("networkidle");
  await a.reload();
  ok((await a.locator('tr:has-text("תאגיד בדיקה") >> text=מאומת').count()) === 1, "admin verified the new agency");
  await a.goto(B + "/admin/users");
  ok((await a.locator('form:has(button:has-text("שמירה")) option[value="admin"], form:has(button:has-text("הוספה")) option[value="admin"]').count()) === 0, "admin can't be granted from the admin screens");
  await a.goto(B + "/admin/users?q=agency@demo");
  await Promise.all([a.waitForURL(/\/a$/), a.locator('button:has-text("כניסה בתור")').first().click()]);
  ok((await a.locator("text=צופה במערכת בתור").count()) === 1, "impersonation banner shown");
  await Promise.all([a.waitForURL(/admin\/users/), a.click('button:has-text("חזרה לאדמין")')]);
  await a.goto(B + "/admin/audit");
  ok((await a.locator("text=כניסה בתור משתמש").count()) >= 1, "audit log recorded the impersonation (in Hebrew)");
  await shot(a, "06-audit");

  console.log(`\nALL PASSED (${passed} checks)`);
} catch (e) {
  console.error("\n" + e.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(path.join(DIR, ".tmp-doc.png"), { force: true });
  fs.rmSync(path.join(DIR, ".tmp-odd-workers.csv"), { force: true });
  await browser.close();
}
