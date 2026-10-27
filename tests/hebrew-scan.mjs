// Fails if any screen shows Latin-script text (English words, codes, browser-locale controls).
// Email addresses are allowed. Run against a dev server with fresh demo data:
//   npm run db:reset && npm run dev        (terminal 1)
//   npm run test:hebrew                     (terminal 2)
import { chromium } from "playwright";

const B = process.env.BASE_URL || "http://localhost:3000";
const U = { agencyOwner: 1, agencyViewer: 3, contractorOwner: 8, admin: 13, newUser: 14 };
const browser = await chromium.launch();
const found = new Map();

async function scan(user, paths) {
  const ctx = await browser.newContext({ locale: "he-IL", viewport: { width: 1360, height: 900 } });
  if (user) await ctx.addCookies([{ name: "yd_dev_as", value: String(user), url: B }]);
  const p = await ctx.newPage();
  p.setDefaultTimeout(120_000);
  for (let path of paths) {
    if (typeof path === "function") path = await path(p);
    if (!path) continue;
    await p.goto(B + path, { waitUntil: "networkidle" });
    const text = await p.evaluate(() => {
      // the dev-mode persona switcher is a developer tool, not product UI
      document.querySelectorAll("details.fixed").forEach((d) => d.remove());
      return document.body.innerText + " " + [...document.querySelectorAll("input,textarea")].map((i) => i.placeholder || "").join(" ");
    });
    for (const [w] of text.matchAll(/[A-Za-z][\w.@\-/]*/g)) {
      if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+\.?$/.test(w)) continue; // email address
      if (!found.has(w)) found.set(w, new Set());
      found.get(w).add(path.split("?")[0]);
    }
  }
  await ctx.close();
}
const first = (list, sel) => async (p) => {
  await p.goto(B + list, { waitUntil: "networkidle" });
  return p.locator(sel).first().getAttribute("href");
};
const netanya = encodeURIComponent("נתניה");

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
    await p.goto(B + "/c/orders");
    const h = await p.locator('a:has-text("היום באתר")').first().getAttribute("href");
    return h && h + "/site";
  },
]);
await scan(U.agencyOwner, [
  "/a", "/a/requests", first("/a/requests", "a[href^='/a/requests/']"), "/a/compliance", "/a/workers", first("/a/workers", "tbody a"),
  "/a/workers/new", "/a/contractors", "/a/campaigns", "/a/billing", "/a/team", "/a/settings", "/o/bniya-hatzafon",
]);
await scan(U.admin, ["/admin", "/admin/users", "/admin/audit"]);
await scan(U.newUser, ["/onboarding"]);
await scan(U.agencyViewer, ["/a/settings"]);
await browser.close();

if (found.size) {
  console.error("Latin-script text found:");
  for (const [w, pages] of [...found.entries()].sort()) console.error("  " + w.padEnd(26), [...pages].join(" "));
  process.exitCode = 1;
} else console.log("OK — every screen is Hebrew-only");
