// Opens every screen in each UI language and fails on text that doesn't belong there:
//   • any language: raw message keys (a missing translation shows its key, e.g. "agency.workers.title")
//   • Hebrew and Arabic: Latin-script words (English, codes, browser-locale controls); email addresses are fine
//   • Hebrew: Arabic script · English and Arabic: nothing extra, because demo data (names, addresses) is Hebrew
// Language names in the switcher are marked with `lang` and skipped. Run against fresh demo data:
//   npm run db:reset && npm run dev        (terminal 1)
//   npm run test:lang                       (terminal 2)
import { chromium } from "playwright";

const B = process.env.BASE_URL || "http://localhost:3000";
const U = { agencyOwner: 1, agencyViewer: 3, contractorOwner: 8, admin: 13, newUser: 14 };
const browser = await chromium.launch();
const found = new Map();

const KEY = /\b(common|domain|roles|public|contractor|agency|import|market|team|admin)\.[a-zA-Z_]+(\.[a-zA-Z_]+)*\b/g;
let LANG = "he";
let siteHref;

async function scan(user, paths) {
  const ctx = await browser.newContext({ locale: "he-IL", viewport: { width: 1360, height: 900 } });
  await ctx.addCookies([{ name: "yd_lang", value: LANG, url: B }]);
  if (user) await ctx.addCookies([{ name: "yd_dev_as", value: String(user), url: B }]);
  const p = await ctx.newPage();
  p.setDefaultTimeout(120_000);
  for (let path of paths) {
    if (typeof path === "function") path = await path(p);
    if (!path) continue;
    await p.goto(B + path, { waitUntil: "networkidle" });
    const text = await p.evaluate((lang) => {
      // the dev-mode persona switcher is a developer tool, not product UI
      document.querySelectorAll("details.fixed").forEach((d) => d.remove());
      // language names in the switcher are written in their own language on purpose
      document.querySelectorAll("body [lang]").forEach((e) => { if (e.getAttribute("lang") !== lang) e.remove(); });
      // stored data shown as-is (file names, free text) is marked translate="no"
      document.querySelectorAll('[translate="no"]').forEach((e) => e.remove());
      return document.body.innerText + " " + [...document.querySelectorAll("input,textarea")].map((i) => i.placeholder || "").join(" ");
    }, LANG);
    const hit = (w) => {
      const k = `${LANG}: ${w}`;
      if (!found.has(k)) found.set(k, new Set());
      found.get(k).add(path.split("?")[0]);
    };
    for (const [w] of text.matchAll(KEY)) hit(w);
    if (LANG !== "en") {
      for (const [w] of text.matchAll(/[A-Za-z][\w.@\-/]*/g)) {
        if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+\.?$/.test(w)) continue; // email address
        if (!KEY.test(w)) hit(w);
        KEY.lastIndex = 0;
      }
    }
    if (LANG === "he") for (const [w] of text.matchAll(/[\u0600-\u06FF]+/g)) hit(w);
  }
  await ctx.close();
}
const first = (list, sel) => async (p) => {
  await p.goto(B + list, { waitUntil: "networkidle" });
  return p.locator(sel).first().getAttribute("href");
};
const netanya = encodeURIComponent("נתניה");

for (LANG of ["he", "ar", "en"]) {
  await scan(null, ["/", "/login"]);
  await scan(U.contractorOwner, [
    "/c", `/c/search?trade=formwork&city=${netanya}&days=1&count=2`, first(`/c/search?trade=formwork&city=${netanya}`, "article a"),
    "/c/orders", first("/c/orders", "main a[href^='/c/orders/']"), "/c/crews", "/c/team",
    async (p) => {
      await p.goto(`${B}/c/search?trade=tiling&city=${netanya}&count=2`);
      const ids = await p.locator("article a").evaluateAll((as) => as.map((a) => a.href.match(/worker\/(\d+)/)?.[1]).filter(Boolean));
      return `/c/checkout?trade=tiling&city=${netanya}&w=${ids.slice(0, 2).join(",")}`;
    },
    async (p) => {
      // found once in Hebrew (the first pass), then reused for the other languages
      if (siteHref === undefined) {
        await p.goto(B + "/c/orders");
        const h = await p.locator('a:has-text("היום באתר")').first().getAttribute("href");
        siteHref = h && h + "/site";
      }
      return siteHref;
    },
  ]);
  await scan(U.agencyOwner, [
    "/a", "/a/requests", first("/a/requests", "a[href^='/a/requests/']"), "/a/compliance", "/a/workers", first("/a/workers", "tbody a"),
    "/a/workers/new", "/a/contractors", "/a/campaigns", "/a/billing", "/a/team", "/a/settings", "/o/bniya-hatzafon",
  ]);
  await scan(U.admin, ["/admin", "/admin/users", "/admin/audit"]);
  await scan(U.newUser, ["/onboarding"]);
  await scan(U.agencyViewer, ["/a/settings"]);
}
await browser.close();

if (found.size) {
  console.error("Text that doesn't belong to the screen's language:");
  for (const [w, pages] of [...found.entries()].sort()) console.error("  " + w.padEnd(26), [...pages].join(" "));
  process.exitCode = 1;
} else console.log("OK: every screen is clean in Hebrew, Arabic and English");
