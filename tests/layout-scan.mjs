// Opens every screen in Hebrew, Arabic and English at phone (390px) and desktop (1280px) width and fails on:
//   • horizontal page scroll (something wider than the screen)
//   • text aligned against the reading direction (e.g. left-aligned text in a Hebrew or Arabic page)
//   • text cut off inside its box without an ellipsis
// Read-only. Run against a dev server with fresh demo data: npm run test:layout
import { chromium } from "playwright";

const B = process.env.BASE_URL || "http://localhost:3000";
const netanya = encodeURIComponent("נתניה");
const PAGES = [
  [0, "/"], [0, "/login"], [14, "/onboarding"], [0, "/o/gesher"],
  [8, "/c"], [8, `/c/search?trade=formwork&city=${netanya}&count=2`], [8, "/c/orders"], [8, "/c/orders?view=list"], [8, "/c/crews"], [8, "/c/team"], [8, "/c/worker/3"],
  [1, "/a"], [1, "/a/calendar"], [1, "/a/requests"], [1, "/a/compliance"], [1, "/a/workers"], [1, "/a/workers/new"], [1, "/a/workers/1"], [1, "/a/crews"],
  [1, "/a/contractors"], [1, "/a/campaigns"], [1, "/a/billing"], [1, "/a/team"], [1, "/a/settings"],
  [13, "/admin"], [13, "/admin/users"], [13, "/admin/audit"],
];
const browser = await chromium.launch();
const problems = [];

for (const lang of ["he", "ar", "en"]) {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const p = await ctx.newPage();
    p.setDefaultTimeout(120_000);
    for (const [user, path] of PAGES) {
      await ctx.clearCookies();
      await ctx.addCookies([{ name: "yd_lang", value: lang, url: B }, ...(user ? [{ name: "yd_dev_as", value: String(user), url: B }] : [])]);
      await p.goto(B + path, { waitUntil: "networkidle" });
      const found = await p.evaluate(() => {
        document.querySelectorAll("details.fixed").forEach((d) => d.remove()); // dev toolbar
        const out = [];
        const W = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > W + 1) out.push(`page is ${document.documentElement.scrollWidth}px wide`);
        const rtl = document.documentElement.dir === "rtl";
        const name = (el) => `${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 40)}"`;
        for (const el of document.querySelectorAll("body *")) {
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
          if (!own || el.closest("[translate=no],[lang]:not(html),input,textarea,select,svg")) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "inline" || cs.visibility === "hidden" || el.offsetWidth === 0) continue;
          // a block whose text sits on the wrong side of its own box
          const r = el.getBoundingClientRect(), range = document.createRange();
          range.selectNodeContents(el);
          const t = range.getBoundingClientRect();
          const slack = r.width - t.width;
          // text-end / center are deliberate (price columns, numbers); only flag text that should sit at the start
          if (slack > 24 && !["center", "end", "justify"].includes(cs.textAlign) && cs.display !== "flex" && cs.display !== "inline-flex" && cs.display !== "grid") {
            const gapStart = rtl ? r.right - t.right : t.left - r.left;
            if (gapStart > 24 && gapStart > slack - 4) out.push(`text aligned to the wrong side: ${name(el)}`);
          }
          // cut off without an ellipsis
          if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === "hidden" && cs.textOverflow !== "ellipsis") out.push(`text cut off: ${name(el)}`);
        }
        return [...new Set(out)].slice(0, 8);
      });
      for (const f of found) problems.push(`${lang} ${width} ${path}: ${f}`);
    }
    await ctx.close();
  }
}
await browser.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else console.log("OK: no horizontal scroll, misaligned or cut-off text in any language or width");
