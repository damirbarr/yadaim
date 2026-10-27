// Static, view-only snapshot of the demo for GitHub Pages (`npm run snapshot`).
//
// Pages needs plain files, but the app needs a server (DB, cookies, server actions). So we crawl a running
// app with fresh demo data and save what it renders: every page as HTML in he/ar/en, the CSS, fonts and
// images it uses, internal links pointing at the saved copies and every action switched off.
//
//   BASE_URL       the running app            (default http://localhost:3000)
//   OUT_DIR        where the site is written  (default out-demo)
//   SNAPSHOT_BASE  path the site is served at (default /yadaim, i.e. https://<user>.github.io/yadaim/)
//   MAX_PAGES      safety cap per language    (default 400; the demo data gives about 330)
//
// Two phases. Crawl: open each page on the app (as the persona its area needs), strip the scripts and
// collect links. Rewrite: once every language is crawled we know which pages exist, so each saved page is
// reopened offline and its links, forms, language switcher and asset URLs are rewritten.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile, stat, readdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = path.resolve(process.env.OUT_DIR ?? "out-demo");
const BASE = ("/" + (process.env.SNAPSHOT_BASE ?? "/yadaim").replace(/^\/+|\/+$/g, "")).replace(/^\/$/, "");
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 400);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 6);
const LANGS = (process.env.LANGS ?? "he,ar,en").split(",");
const SEEDS = ["/", "/login", "/c", "/a"];
const SKIP = /^\/(admin|api|auth|r|signup|forbidden|onboarding)(\/|$)/;
// Links that carry query strings can multiply (filters, days of a month); a few of each page are enough.
const MAX_QUERY_VARIANTS = 8;

const TEXT = {
  he: { banner: "דמו לצפייה בלבד: אפשר לעבור בין המסכים, פעולות לא נשמרות.", off: "בדמו לצפייה בלבד" },
  ar: { banner: "عرض تجريبي للمشاهدة فقط: يمكن التنقّل بين الشاشات، والإجراءات لا تُحفظ.", off: "عرض تجريبي للقراءة فقط" },
  en: { banner: "View-only demo: browse every screen; actions are not saved.", off: "View-only demo" },
};

// The persona each area is viewed as (seeded ids, see AGENTS.md "Demo personas"). Anonymous elsewhere.
const personaFor = (p) => (/^\/a(\/|$)/.test(p) ? "1" : /^\/c(\/|$)/.test(p) ? "8" : null);

// Calendars: the current month and the next one only (same clock and zone as lib/domain.ts todayISO).
const thisMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const nextMonth = (() => { const [y, m] = thisMonth.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; })();

const sha = (s, n = 8) => createHash("sha1").update(s).digest("hex").slice(0, n);

/** Canonical page key: path without trailing slash + query, no fragment. */
function keyOf(u) {
  const p = u.pathname.replace(/\/+$/, "") || "/";
  return p + (u.search && u.search !== "?" ? u.search : "");
}

/** Folder of a page inside a language, e.g. "/c/search?trade=x" → "c/search/q-1a2b3c4d". */
function folderOf(key) {
  const u = new URL(key, "http://x");
  const segs = u.pathname.split("/").filter(Boolean).map((s) => (/^[A-Za-z0-9._-]+$/.test(s) ? s : `s-${sha(decodeURIComponent(s))}`));
  if (u.search) segs.push(`q-${sha(u.search)}`);
  return segs.join("/");
}
const pageUrl = (lang, key) => { const f = folderOf(key); return `${BASE}/${lang}/${f ? f + "/" : ""}`; };

/** Query string without the basket, in a stable order, to compare searches. */
const searchOf = (u) => { const p = new URLSearchParams(u.search); p.delete("w"); p.sort(); return p.toString(); };

function allowed(key, demo) {
  const u = new URL(key, "http://x");
  if (SKIP.test(u.pathname)) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(u.pathname)) return false; // files, not pages
  const m = u.searchParams.get("m");
  if (m && m !== thisMonth && m !== nextMonth) return false;
  if (u.searchParams.has("d") && (u.searchParams.has("m") || /calendar/.test(u.pathname))) return false; // one panel per day is too many
  // Booking: the default search with two workers in the basket (and its trade tabs), its checkout, and the
  // "book this worker" checkout of each worker in it. Other baskets would only repeat these screens.
  const w = u.searchParams.get("w");
  if (u.pathname === "/c/checkout") return !!w && !!demo.search && searchOf(u) === demo.search && (w === demo.basket || !w.includes(","));
  if (u.pathname === "/c/search" && demo.search) {
    // One search, in each trade (the tabs), with and without the basket.
    const same = (q) => { const p = new URLSearchParams(q); p.delete("trade"); return p.toString(); };
    return same(searchOf(u)) === same(demo.search) && (!w || w === demo.basket);
  }
  if (w) return false;
  return true;
}

// ---------------------------------------------------------------- crawl

/** Runs in the page: drop scripts and dev chrome, then report links and GET-form targets. */
function crawlInPage() {
  document.querySelectorAll('script, link[rel="modulepreload"], link[rel="preload"][as="script"], nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog-overlay], details.fixed').forEach((n) => n.remove());
  const links = [...document.querySelectorAll("a[href]")].map((a) => a.href);
  // A GET form (the contractor search) leads to the page its current values describe.
  const forms = [...document.querySelectorAll("form")].filter((f) => (f.getAttribute("method") ?? "get").toLowerCase() === "get" && f.getAttribute("action") && !f.querySelector('[name="locale"]'))
    .map((f) => { const u = new URL(f.getAttribute("action"), location.href); u.search = new URLSearchParams(new FormData(f)).toString(); return u.href; });
  // On search results: the first two workers, for the basket (ResultsGrid's checkout link is ?<qs>&w=a,b).
  const ids = location.pathname === "/c/search"
    ? [...new Set([...document.querySelectorAll('a[href^="/c/worker/"]')].map((a) => a.getAttribute("href").split("?")[0].split("/").pop()))].slice(0, 2)
    : [];
  const qs = ids.length ? document.querySelector('a[href^="/c/worker/"]').getAttribute("href").split("?")[1] ?? "" : "";
  const assets = [];
  const add = (v) => v && assets.push(new URL(v, location.href).href);
  document.querySelectorAll('link[href]:not([rel="canonical"]):not([rel="alternate"])').forEach((l) => add(l.getAttribute("href")));
  document.querySelectorAll("img[src], source[src], video[poster]").forEach((e) => add(e.getAttribute("src") ?? e.getAttribute("poster")));
  document.querySelectorAll("img[srcset], source[srcset]").forEach((e) => e.getAttribute("srcset").split(",").forEach((c) => add(c.trim().split(/\s+/)[0])));
  document.querySelectorAll("[style*='url(']").forEach((e) => { for (const m of e.getAttribute("style").matchAll(/url\((['"]?)([^'")]+)\1\)/g)) add(m[2]); });
  document.querySelectorAll("a[href]").forEach((a) => { const u = new URL(a.href); if (/^\/(templates\/|api\/files\/p_)/.test(u.pathname)) add(a.href); });
  return { html: "<!DOCTYPE html>\n" + document.documentElement.outerHTML, links, forms, ids, qs, assets };
}

async function crawl(browser, lang) {
  const contexts = {};
  const ctxFor = async (persona) => {
    const k = persona ?? "anon";
    if (contexts[k]) return contexts[k];
    const ctx = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1280, height: 900 } });
    const cookies = [{ name: "yd_lang", value: lang, url: BASE_URL }];
    if (persona) cookies.push({ name: "yd_dev_as", value: persona, url: BASE_URL });
    await ctx.addCookies(cookies);
    // Only the document matters here; inline scripts still run (they resolve streamed Suspense
    // boundaries), but the React runtime never loads, so we save exactly the server render.
    await ctx.route("**/*", (r) => (["document"].includes(r.request().resourceType()) ? r.continue() : r.abort()));
    return (contexts[k] = ctx);
  };

  const pages = new Map(); // key → { html, assets }
  const seen = new Set();
  const variants = new Map();
  const enqueue = (list, href, force = false) => {
    let u;
    try { u = new URL(href, BASE_URL); } catch { return; }
    if (u.origin !== new URL(BASE_URL).origin) return;
    const key = keyOf(u);
    if (seen.has(key) || (!force && !allowed(key, demo))) return;
    if (u.search && !force) {
      // A worker card is reached from many searches and orders; one copy of it is enough. Search tabs are
      // what the contractor side is about and are never capped.
      const cap = /^\/c\/worker\//.test(u.pathname) ? 1 : u.pathname === "/c/search" ? Infinity : MAX_QUERY_VARIANTS;
      const n = variants.get(u.pathname) ?? 0;
      if (n >= cap) return;
      variants.set(u.pathname, n + 1);
    }
    seen.add(key);
    list.push(key);
  };
  // The search form on the contractor home, as it comes, is "the default search".
  const demo = { defaultSearch: null, search: null, basket: null, basketSearch: null };

  let level = [];
  SEEDS.forEach((s) => enqueue(level, s));
  const failed = [];
  while (level.length && pages.size < MAX_PAGES) {
    level = level.slice(0, MAX_PAGES - pages.size);
    const results = new Array(level.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, level.length) }, async () => {
      while (next < level.length) {
        const i = next++;
        const key = level[i];
        const ctx = await ctxFor(personaFor(new URL(key, BASE_URL).pathname));
        const page = await ctx.newPage();
        try {
          const res = await page.goto(key, { waitUntil: "load" });
          const finalKey = keyOf(new URL(page.url()));
          if (!res || res.status() >= 400 || finalKey !== key) { results[i] = { key, error: `${res?.status()} → ${finalKey}` }; continue; }
          results[i] = { key, ...(await page.evaluate(crawlInPage)) };
        } catch (e) {
          results[i] = { key, error: String(e.message).split("\n")[0] };
        } finally {
          await page.close();
        }
      }
    }));
    // Discovery runs in a fixed order (the level's order, then document order), so runs are reproducible.
    const found = [];
    for (const r of results) {
      if (r.error) { failed.push(`${r.key} (${r.error})`); continue; }
      pages.set(r.key, r);
      if (r.key === "/c" && r.forms.length) demo.defaultSearch = keyOf(new URL(r.forms[0]));
      if (r.key === demo.defaultSearch && r.ids.length === 2) {
        Object.assign(demo, { search: searchOf(new URL("?" + r.qs, BASE_URL)), basket: r.ids.join(",") });
        // Results come back with the full query (lodging, transport); that is the search we keep.
        const full = new URL(`/c/search?${r.qs}`, BASE_URL);
        full.searchParams.set("w", demo.basket);
        demo.basketSearch = keyOf(full);
        enqueue(found, full.href);
      }
      for (const h of [...r.forms, ...r.links]) enqueue(found, h);
    }
    // Plain pages before query variants, so the cap trims filters first.
    level = [...found.filter((k) => !k.includes("?")), ...found.filter((k) => k.includes("?"))];
  }
  await Promise.all(Object.values(contexts).map((c) => c.close()));
  return { pages, failed, demo };
}

// ---------------------------------------------------------------- assets

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg", "image/avif": ".avif", "image/x-icon": ".ico", "text/css": ".css", "font/woff2": ".woff2", "font/woff": ".woff", "text/csv": ".csv" };

async function downloadAssets(request, urls) {
  const map = new Map(); // absolute app URL → snapshot URL
  const files = new Map(); // snapshot URL → Buffer
  const origin = new URL(BASE_URL).origin;
  const missing = [];
  const fetchOne = async (abs) => {
    if (map.has(abs)) return map.get(abs);
    const u = new URL(abs);
    if (u.origin !== origin) return null;
    const res = await request.get(abs);
    if (!res.ok()) { missing.push(`${u.pathname} (${res.status()})`); map.set(abs, null); return null; }
    const type = (res.headers()["content-type"] ?? "").split(";")[0].trim();
    let out;
    if (u.pathname.startsWith("/_next/static/")) out = `${BASE}/assets/${u.pathname.slice("/_next/static/".length)}`;
    else {
      const clean = u.pathname.slice(1).split("/").map((s) => s.replace(/[^A-Za-z0-9._-]/g, "_")).join("/");
      out = `${BASE}/files/${clean}${u.search ? "-" + sha(u.search) : ""}`;
      if (!/\.[a-z0-9]{2,5}$/i.test(out) && EXT[type]) out += EXT[type];
    }
    map.set(abs, out);
    let body = await res.body();
    if (type === "text/css") {
      // Fonts and images inside stylesheets: fetch them and point at their saved copies.
      let css = body.toString("utf8");
      const refs = [...new Set([...css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map((m) => m[2]).filter((r) => !r.startsWith("data:") && !r.startsWith("#")))];
      for (const r of refs) {
        const target = await fetchOne(new URL(r, abs).href);
        if (target) css = css.split(`url(${r})`).join(`url(${target})`).split(`url("${r}")`).join(`url("${target}")`).split(`url('${r}')`).join(`url('${target}')`);
      }
      body = Buffer.from(css);
    }
    files.set(out, body);
    return out;
  };
  for (const u of [...urls].sort()) await fetchOne(u);
  return { map, files, missing };
}

// ---------------------------------------------------------------- rewrite

/** Runs in the saved page (offline): links, forms, language switcher, assets, banner. */
function rewriteInPage({ key, pages, langLinks, assetMap, text, base, alias }) {
  const here = new URL(key, location.origin);
  const resolve = (v) => new URL(v, here);
  // Look pages up by path + sorted query, so a form that lists its fields in another order still matches.
  const norm = (k) => { const u = new URL(k, location.origin); u.searchParams.sort(); return (u.pathname.replace(/\/+$/, "") || "/") + u.search; };
  const index = {};
  for (const [k, v] of Object.entries(pages)) index[norm(k)] ??= v;
  const target = (k) => pages[k] ?? index[norm(k)];
  const dropped = [];
  const off = (el) => { dropped.push(el.getAttribute("href")); el.setAttribute("href", "#"); el.setAttribute("aria-disabled", "true"); el.setAttribute("title", text.off); el.removeAttribute("target"); };
  const asset = (v) => { try { return assetMap[resolve(v).href]; } catch { return undefined; } };

  // Language switcher → links to this page in each language, looking exactly like the buttons.
  document.querySelectorAll("form").forEach((f) => {
    if (!f.querySelector('button[name="locale"]')) return;
    const box = document.createElement("div");
    box.className = f.className;
    box.setAttribute("role", "group");
    if (f.getAttribute("aria-label")) box.setAttribute("aria-label", f.getAttribute("aria-label"));
    f.querySelectorAll('button[name="locale"]').forEach((b) => {
      const a = document.createElement("a");
      a.className = b.className;
      for (const at of ["lang", "dir"]) if (b.getAttribute(at)) a.setAttribute(at, b.getAttribute(at));
      if (b.getAttribute("aria-pressed") === "true") a.setAttribute("aria-current", "true");
      a.setAttribute("hreflang", b.value);
      a.setAttribute("href", langLinks[b.value] ?? `${base}/${b.value}/`);
      a.innerHTML = b.innerHTML;
      box.appendChild(a);
    });
    f.replaceWith(box);
  });

  // Every other form: a GET form whose result was captured keeps working as a link; the rest is read-only.
  document.querySelectorAll("form").forEach((f) => {
    const isGet = (f.getAttribute("method") ?? "get").toLowerCase() === "get" && f.getAttribute("action") && !f.getAttribute("action").startsWith("javascript:");
    let dest = null;
    if (isGet) {
      const u = resolve(f.getAttribute("action"));
      u.search = new URLSearchParams(new FormData(f)).toString();
      const k = u.pathname.replace(/\/+$/, "") + (u.search && u.search !== "?" ? u.search : "");
      const a = Object.entries(alias).find(([from]) => norm(from) === norm(k))?.[1];
      dest = (a && target(a)) ?? target(k);
    }
    f.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"], input[type="reset"]').forEach((b) => {
      const submits = b.tagName === "BUTTON" ? (b.getAttribute("type") ?? "submit") === "submit" : b.type === "submit";
      if (dest && submits) {
        const a = document.createElement("a");
        a.className = b.className;
        a.setAttribute("href", dest);
        a.setAttribute("data-snap-done", "");
        a.innerHTML = b.tagName === "BUTTON" ? b.innerHTML : b.value;
        b.replaceWith(a);
        return;
      }
      b.disabled = true;
      b.setAttribute("title", text.off);
    });
    f.querySelectorAll("input, textarea").forEach((i) => {
      if (["checkbox", "radio", "file", "range", "color"].includes(i.type)) i.disabled = true; else i.readOnly = true;
    });
    f.querySelectorAll("select").forEach((s) => { s.disabled = true; });
    f.removeAttribute("action");
    f.removeAttribute("method");
    f.removeAttribute("enctype");
    f.setAttribute("onsubmit", "return false");
    f.querySelectorAll('input[type="hidden"]').forEach((h) => h.remove()); // server-action ids, nothing to keep
  });
  // Controls outside forms (client-side toggles) can't do anything without the app's scripts.
  document.querySelectorAll("button:not([disabled])").forEach((b) => { b.disabled = true; b.setAttribute("title", text.off); });

  // Links: to the saved copy of the page, an asset, or nowhere.
  document.querySelectorAll("a[href]").forEach((a) => {
    const raw = a.getAttribute("href");
    if (a.hasAttribute("hreflang") || a.hasAttribute("data-snap-done") || raw.startsWith("#") || /^(mailto|tel|sms|https?:\/\/wa\.me)/i.test(raw)) return;
    let u;
    try { u = resolve(raw); } catch { return off(a); }
    if (u.origin !== location.origin) return; // external sites stay as they are
    const asFile = asset(raw);
    if (asFile) { a.setAttribute("href", asFile); return; }
    const k = (u.pathname.replace(/\/+$/, "") || "/") + (u.search && u.search !== "?" ? u.search : "");
    const t = target(k);
    if (!t) return off(a);
    if (u.pathname === here.pathname && u.search === here.search && u.hash) { a.setAttribute("href", u.hash); return; }
    a.setAttribute("href", t + u.hash);
  });

  // Assets: stylesheets, icons, images.
  document.querySelectorAll("link[href]").forEach((l) => { const t = asset(l.getAttribute("href")); if (t) l.setAttribute("href", t); else if (l.getAttribute("rel") !== "canonical") l.remove(); });
  document.querySelectorAll("img[src], source[src]").forEach((e) => { const t = asset(e.getAttribute("src")); e.setAttribute("src", t ?? "data:,"); });
  document.querySelectorAll("video[poster]").forEach((e) => { const t = asset(e.getAttribute("poster")); if (t) e.setAttribute("poster", t); else e.removeAttribute("poster"); });
  document.querySelectorAll("img[srcset], source[srcset]").forEach((e) => {
    e.setAttribute("srcset", e.getAttribute("srcset").split(",").map((c) => { const [u, ...d] = c.trim().split(/\s+/); return [asset(u) ?? u, ...d].join(" "); }).join(", "));
  });
  document.querySelectorAll("[style*='url(']").forEach((e) => {
    e.setAttribute("style", e.getAttribute("style").replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => { const t = asset(u); return t ? `url(${q}${t}${q})` : m; }));
  });
  document.querySelectorAll('meta[name="next-size-adjust"]').forEach((m) => m.remove());
  document.querySelectorAll("[data-snap-done]").forEach((a) => a.removeAttribute("data-snap-done"));

  // The banner. Sticky app headers move down by its height so it never covers them.
  const style = document.createElement("style");
  style.textContent = `:root{--snap-h:28px}@media (max-width:520px){:root{--snap-h:44px}}
.snap-banner{position:sticky;top:0;z-index:60;display:flex;align-items:center;justify-content:center;height:var(--snap-h);padding:0 16px;background:#0e2a44;color:#fff;font-size:13px;line-height:18px;text-align:center;border-bottom:1px solid rgba(212,242,90,.6)}
.sticky.top-0{top:var(--snap-h)!important}.sticky.top-0.h-dvh{height:calc(100dvh - var(--snap-h))!important}
[aria-disabled="true"]{cursor:not-allowed}button[disabled]{cursor:not-allowed}`;
  document.head.appendChild(style);
  const bar = document.createElement("div");
  bar.className = "snap-banner";
  bar.setAttribute("role", "note");
  bar.textContent = text.banner;
  document.body.prepend(bar);
  return { html: "<!DOCTYPE html>\n" + document.documentElement.outerHTML, dropped };
}

// ---------------------------------------------------------------- main

async function main() {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const crawled = {};
  for (const lang of LANGS) {
    const t = Date.now();
    crawled[lang] = await crawl(browser, lang);
    console.log(`crawl ${lang}: ${crawled[lang].pages.size} pages in ${((Date.now() - t) / 1000).toFixed(1)}s${crawled[lang].failed.length ? `, skipped ${crawled[lang].failed.length}` : ""}`);
    for (const f of crawled[lang].failed) console.log(`  skipped ${f}`);
    // A server that isn't up, or isn't in dev mode, gives a handful of public pages: don't publish that.
    if (!crawled[lang].pages.has("/a") || !crawled[lang].pages.has("/c")) throw new Error(`${lang}: /a or /c not captured; is the app running with AUTH_DEV_BYPASS=1 and demo data?`);
  }

  // Assets are fetched with the agency persona (photos are served to signed-in users only).
  const ctxAssets = await browser.newContext({ baseURL: BASE_URL });
  await ctxAssets.addCookies([{ name: "yd_dev_as", value: "1", url: BASE_URL }]);
  const allAssets = new Set(LANGS.flatMap((l) => [...crawled[l].pages.values()].flatMap((p) => p.assets)));
  const { map: assetMapM, files, missing } = await downloadAssets(ctxAssets.request, allAssets);
  const assetMap = Object.fromEntries([...assetMapM].filter(([, v]) => v));

  const pageMap = Object.fromEntries(LANGS.map((l) => [l, Object.fromEntries([...crawled[l].pages.keys()].map((k) => [k, pageUrl(l, k)]))]));

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const write = async (rel, data) => { const f = path.join(OUT_DIR, rel); await mkdir(path.dirname(f), { recursive: true }); await writeFile(f, data); };

  // Rewrite offline: the saved HTML is served to a page on the app's origin (so relative URLs resolve the
  // same way) while every other request is refused.
  const tRewrite = Date.now();
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  const stripBase = (u) => u.slice(BASE.length);
  const jobs = LANGS.flatMap((lang) => {
    // The contractor home's search button opens the default search with two workers already in the
    // basket, so the static demo can still walk through to checkout.
    // The search form on results pages carries the basket along, so that variant points there too.
    const { defaultSearch, basketSearch, basket } = crawled[lang].demo;
    const alias = defaultSearch && basketSearch && crawled[lang].pages.has(basketSearch)
      ? { [defaultSearch]: basketSearch, [`${defaultSearch}&w=${encodeURIComponent(basket)}`]: basketSearch } : {};
    return [...crawled[lang].pages].map(([key, p]) => ({ lang, key, html: p.html, alias }));
  });
  const dropped = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    const page = await ctx.newPage();
    let current = "";
    await page.route("**/*", (r) => (r.request().resourceType() === "document" ? r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: current }) : r.abort()));
    while (next < jobs.length) {
      const i = next++;
      const { lang, key, html: saved, alias } = jobs[i];
      current = saved;
      await page.goto(key, { waitUntil: "domcontentloaded" });
      const r = await page.evaluate(rewriteInPage, { key, pages: pageMap[lang], langLinks: Object.fromEntries(LANGS.map((l) => [l, pageMap[l][key]])), assetMap, text: TEXT[lang], base: BASE, alias });
      dropped[i] = lang === LANGS[0] ? r.dropped : [];
      await write(path.join(stripBase(pageMap[lang][key]), "index.html"), r.html);
    }
    await page.close();
  }));
  console.log(`rewrite: ${jobs.length} pages in ${((Date.now() - tRewrite) / 1000).toFixed(1)}s`);
  const offLinks = new Map(); // links to pages that weren't captured (first language), for the summary
  for (const h of dropped.flat()) { const g = (h.split("?")[0] || "?…").replace(/\/\d+/g, "/:id"); offLinks.set(g, (offLinks.get(g) ?? 0) + 1); }
  for (const [out, body] of files) await write(stripBase(out), body);
  const home = `${BASE}/${LANGS[0]}/`;
  const redirect = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>ידיים</title><meta http-equiv="refresh" content="0; url=${home}"><link rel="canonical" href="${home}"></head><body style="background:#f4efe4"><a href="${home}">ידיים</a></body></html>\n`;
  await write("index.html", redirect);
  await write("404.html", redirect);
  await write(".nojekyll", "");
  // What was captured, for checking a run against the last one.
  await write("snapshot.json", JSON.stringify(Object.fromEntries(LANGS.map((l) => [l, Object.fromEntries([...crawled[l].pages.keys()].map((k) => [k, pageMap[l][k]]))])), null, 1));
  await browser.close();

  let bytes = 0, count = 0;
  const walk = async (d) => { for (const e of await readdir(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) await walk(f); else { bytes += (await stat(f)).size; count++; } } };
  await walk(OUT_DIR);
  console.log(`\nsnapshot → ${OUT_DIR} (served at ${BASE}/)`);
  for (const l of LANGS) console.log(`  ${l}: ${crawled[l].pages.size} pages`);
  const groups = new Map();
  for (const k of crawled[LANGS[0]].pages.keys()) {
    const g = k.split("?")[0].replace(/\/\d+/g, "/:id").replace(/^\/o\/[^/]+/, "/o/:slug") + (k.includes("?") ? "?…" : "");
    groups.set(g, (groups.get(g) ?? 0) + 1);
  }
  console.log("  " + [...groups].map(([g, n]) => `${g} ${n}`).join(" · "));
  console.log(`  links switched off (${LANGS[0]}): ` + ([...offLinks].sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(" · ") || "none"));
  console.log(`  assets: ${files.size}${missing.length ? `, missing ${missing.length}: ${missing.join(", ")}` : ""}`);
  console.log(`  ${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
