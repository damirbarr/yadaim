# AGENTS.md: working on Yadaim (ידיים)

> מדריך לאייג'נט (או למפתח) שממשיך את הפרויקט. ההנחיות באנגלית, וכל טקסט שמוצג למשתמש נכתב בעברית.

Yadaim is a two-sided web app for Israel's licensed **foreign-worker construction agencies** (תאגידים) and **registered contractors** (קבלנים).
- Agencies manage workers and their document validity, fill idle days by marketing to their contractor list, and approve placements.
- Contractors book specific workers by trade and day at an all-in price, check them in on site (no fit = no pay), approve hours and rate them.
- There is **no worker-facing interface**. The product has exactly two sides, agency and contractor, plus a platform admin.
- Money between contractor and agency never passes through the platform. We charge agencies one fixed fee per approved worker-hour (`PLATFORM.feePerHour`, ₪1). The price is **not** shown on the landing page.

## Read first (in this order)
1. `docs/STATUS.md`: what exists, what doesn't, and the **prioritized backlog with acceptance criteria**. Start work here.
2. `docs/ARCHITECTURE.md`: code map, data model, auth/RBAC, DB drivers.
3. `docs/PLAN.md`: product intent, business model, legal constraints, roadmap.
4. `docs/SUPABASE.md`: the whole Supabase integration and how to change or extend it (migrations, config, storage, auth).
5. `docs/LOCAL_DEV.md` and `docs/DEPLOY.md`: run, test, deploy.
6. `docs/CONVERSATION.md`, `docs/source/`, `docs/market-research.md`: background and why things are the way they are.

## Commands
```bash
npm install
npm run dev                 # http://localhost:3000. Embedded Postgres (PGlite) + demo data + dev mode (no sign-in)
npm run typecheck
npm run build
npm run db:reset            # wipe local DB → fresh demo data on next `npm run dev` (do this before e2e and if "today" data looks stale)
npm run test:e2e            # 33-check Playwright run of every role, against a running dev server with fresh data
npm run db:new -- <name>    # new migration file in supabase/migrations/ (the only way to change the schema)
npm run db:migrate          # apply pending migrations (PGlite applies them on boot by itself)
```
Only one `next dev` can run per directory. Seed data is generated relative to **today's date**, so reset when the day changes.

## Definition of done (every change)
- [ ] `npm run typecheck` and `npm run build` pass.
- [ ] `npm run db:reset && npm run dev`, then `npm run test:e2e` passes. Extend `tests/e2e.mjs` for new user-facing flows.
- [ ] New mutations check a **permission** (`requireAgency("agency.x")`, etc.) and write `audit()` for anything security- or money-relevant.
- [ ] Schema changes are a **new** file from `npm run db:new`; never edit a migration that is already on `main`.
- [ ] **Responsive:** every screen you touched works at **390px** (phone) and **1280px+** (desktop): no horizontal page scroll, no squeezed text columns, tap targets ≥ 40px, wide tables get a phone layout (see `/a/workers`). Look at screenshots of both widths before calling it done.
- [ ] **Intuitive:** a first-time user (agency office staff, a contractor on site with one hand on the phone) can do it without explanation. One action per intent: picking a file uploads it, changing a select saves it, and there is no "confirm" or "import" click after a choice that is already explicit.
- [ ] `docs/STATUS.md` is updated (tick items, add limitations). Update `docs/ARCHITECTURE.md` if structure changed.
- [ ] UI copy is Hebrew, RTL-correct, and gender-neutral where possible (address users in plural: "בחרו", "העלו"). The contractor UI is checked at 390px width.

## Golden rules
0. **Super intuitive, on every screen size.** Both audiences (agencies and contractors) are busy, non-technical and often on a phone. Prefer fewer steps, plain Hebrew labels, sensible defaults and immediate feedback over options and explanations. If a flow needs a help text to be understood, simplify the flow. Every change is checked on mobile (390px) and desktop.
1. **Permissions, not roles.** Gate pages and actions with `requireAgency(perm)`, `requireContractor(perm)` or `requireAdmin(perm)`, and hide UI with `can(user, perm)`. To add a capability, add a key to `PERMISSIONS` and to `MATRIX` in `lib/rbac.ts`. Never compare `user.role === "..."` for authorization in new code.
2. **Scope every query to the caller's organisation** (`agency_id` / `contractor_id` from `require*()`), never from form input. See the `ownBooking` / `ownWorker` helpers in `app/actions/*`.
3. **One DB API.** Use `all/get/run/insert/tx` from `lib/db.ts` with `?` placeholders. Inside `tx(async () => …)` keep using the same helpers; they join the transaction automatically. Don't import `postgres` or PGlite directly.
4. **SQL must run on Postgres** (PGlite and Supabase are identical): no `SUM(boolean)` (use `COUNT(col)`); every non-aggregated column belongs in `GROUP BY`; use `now_txt()` / `now_txt(interval '-3 days')` for timestamps; `ON CONFLICT DO NOTHING RETURNING id` for upserts; dates are `YYYY-MM-DD` text.
5. **Legal and product invariants.** Breaking these is a bug:
   - Workers are placed only with **verified contractors** and only from **verified, non-suspended agencies** whose reliability is ≥ 60.
   - A worker is bookable only if **every required document** (`requiredDocs(trade)`) is verified and valid **through the booking's last day**.
   - Respect the agency's **`min_days`** (minimum placement length). Per-day placement isn't legally confirmed yet; see `docs/PLAN.md` §10.
   - **No-fit / no-show workers are never billed** (`bookingTotals`, `approveHours`).
   - Marketing messages go out only after the agency approves them, at most **one per contact per 3 days**, never to opted-out contacts.
   - The agency is the legal employer and approves every placement. We don't move money.
6. **Privacy.** Passport numbers are masked for contractors. Documents (`d_*`) are served only through `/api/files` with checks. Never make the Storage bucket public, never disable RLS, never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
7. **Admin is for the people who build Yadaim, nobody else.** Platform admin comes only from `ADMIN_EMAILS` in the server environment (`isPlatformAdmin()` in `lib/auth.ts`). No screen, action or invite may grant, change or revoke it, and `/admin` answers 404 to anyone else.
8. **Dev mode is a convenience, not a security model.** `devBypass()` is off in production unless `AUTH_DEV_BYPASS=1`. Don't add code paths that skip `require*()` in dev.
9. **Don't send real messages from tests.** WhatsApp is `wa.me` links today; if you add an API sender, put it behind an interface in `lib/wa.ts` with a no-op or dev implementation.

## How to add things
**A new screen in the agency area**
1. `app/a/<name>/page.tsx`: an async Server Component that calls `const { user, agencyId } = await requireAgency("agency.view")`.
2. Add a nav item in `app/a/layout.tsx` with its `perm`.
3. Mutations go in `app/actions/agency.ts` (or a new `app/actions/<area>.ts` with `"use server"`). For forms that show errors, use the `FormState` + `useActionState` pattern (see `components/WorkerForm.tsx`). For simple buttons, use `<form action={serverAction}>`.
4. Call `revalidatePath()` after writes and `redirect()` for navigation.

**A new column/table:** `npm run db:new -- add_latin_name`, write plain SQL in the new file (e.g. `alter table workers add column latin_name text;`), restart `npm run dev` (it applies pending migrations). Update the types in `lib/queries.ts` and the seed if useful. RLS is enabled on new tables automatically. Full guide: `docs/SUPABASE.md`.

**A new setting / integration:** add the env variable to `lib/config.ts` (and `.env.example`), read it only through `config`. Supabase clients are created only in `lib/supabase.ts`; files go through the `FileStore` in `lib/storage.ts`.

**A new spreadsheet import:** describe its columns as `ImportField[]` in `lib/importer.ts` (label + header aliases + `need` for required ones) and call `readImport()` in the action. `ImportForm` handles upload, the column-mapping step for non-template files, and errors.

**A new permission:** `lib/rbac.ts` → `PERMISSIONS` (Hebrew label) plus `MATRIX`. The team page table updates itself.

**Languages (Hebrew, Arabic, English).** No user-facing text lives in components, pages, actions or `lib/`. Every string is a key in `messages/<locale>/<namespace>.ts`.
- Hebrew (`messages/he/`) is the source; its shape defines the keys. `messages/ar/` and `messages/en/` are typed as `Messages["<namespace>"]`, so a missing key fails `npm run typecheck`.
- Server components, server actions, route handlers: `const { t, rich, fmt } = await getI18n();` (`@/lib/i18n/server`). Client components: `const { t, rich, fmt } = useI18n();` (`@/lib/i18n/client`). Page titles: `export async function generateMetadata() { const { t } = await getI18n(); return { title: t("…") }; }`.
- Placeholders: `t("ns.key", { name })` with `{name}` in the message. Counts: `plural({ one, other, … })` in the message, `t("ns.key", { n })` in code (Arabic may add `zero/two/few/many`). Inline markup: `<b>…</b>` or `<link>…</link>` in the message, `rich("ns.key", { b: (c) => <b>{c}</b>, link: (c) => <Link href="…">{c}</Link> })` in code. Never build a sentence by concatenating pieces; word order differs between languages.
- Values: `fmt.money()`, `fmt.date()` (27.10), `fmt.fullDate()`, `fmt.prettyDate()` (weekday + date), `fmt.relDay(iso, today)`, `fmt.trade(k)` / `fmt.trades(k)` (plural), `fmt.region()`, `fmt.city()`, `fmt.country()`, `fmt.doc()` / `fmt.docShort()`, `fmt.phase()`, `fmt.minDays()`, `fmt.tag()`. Don't use the Hebrew `label` fields in `lib/domain.ts` or `lib/rbac.ts` for display.
- Data stays as entered (names, addresses, cities stored in Hebrew; `fmt.city()` translates the known cities).
- Direction: Hebrew and Arabic are RTL, English is LTR (`<html dir>` is set from the locale). Use logical classes (`ms-/me-/ps-/pe-/start-/end-/text-start/text-end`), never `ml-/mr-/left-/right-/text-left/text-right`, and `rtl:`/`ltr:` variants when something must differ. Arrows and directional icons get `className="flip-ltr"`.
- Namespaces: `common` (layouts, nav, shared bits), `domain` (trades, places, documents, phases), `roles` (account kinds, permission levels, permission names, activity-log actions), and one per area. Add a key to all three languages in the same change.
- Never use the em dash character (U+2014) anywhere in the app or in messages; `npm run test:i18n` fails on it. Never promise a worker photo (not every worker has one).
- Copy: write each language natively, as a person in that market would say it, not a word-for-word translation. Short, concrete, plural/neutral address in Hebrew ("בחרו", "העלו"). Arabic: Modern Standard Arabic as used in Israeli Arab business communication, plural address ("اختاروا"). English: plain international English. Hebrew: תאגיד; Arabic: شركة القوى العاملة / الشركة; English: agency. Contractor: קבלן / مقاول / contractor.
- Adding a language: add it to `lib/i18n/locales.ts`, copy `messages/he/` to `messages/<code>/`, translate, register it in `messages/index.ts`, typecheck.

## Conventions
- TypeScript strict, Server Components by default, `"use client"` only for interactive pieces (`components/*Form.tsx`, `ResultsGrid`, `PriceToggles`, `Nav`).
- Next.js 16: `params`, `searchParams` and `cookies()` are **async** (await them). There is no middleware; guards live in layouts and pages via `require*()`.
- Styling: Tailwind 4 with design tokens in `app/globals.css` and utilities `card`/`sheet`, `btn-primary|hazard|ghost|ok`, `btn-sm`, `input`, `label`, `chip-*`, `seg`, `tbl`, `num` (wrap numbers in `.num` for LTR digits inside RTL). UI primitives live in `components/ui.tsx` (`PageHead`, `Stat`, `Empty`, `Avatar`, `ScoreRing`, `Notice`, `Logo`).
- **Design language "שרטוט" (blueprint), chosen by the owner in round 5.** Keep new screens in it; don't drift back to generic rounded cards:
  - Colours: navy `ink` #0e2a44 (frames, primary buttons), paper `paper` #f4efe4 (page background), white sheets with 1px `line` #d9cfbc borders, lime `hazard` #d4f25a as the single accent (only on navy or as a highlight, never as body text on paper), orange `signal` #ff7a45 for "now/attention" dots. Status: `ok/warn/bad/info` (+ `-soft`).
  - Type: **Rubik** for everything (headings, numbers, body), chosen by the owner. Headings and big numbers are bold (`font-display` keeps working as a hook). Use the `eyebrow` class (small, muted) above titles, e.g. "גיליון יומי · 27.10". No wide letter-spacing on Hebrew text.
  - Shape: sharp 3px corners (`rounded-[3px]`), no `rounded-xl/2xl`, no heavy shadows. Lists are rows split by `border-dashed border-line`, not stacks of cards. Section header = a bar with a serif title and a muted note on the left.
  - Navy panels use the `blueprint` class (grid lines baked in) with white/lime text: sidebars, headers, hero bands, the highlighted stat. `paper-grid` is the faint grid for empty states and charts. Dimension-line SVGs (lime line with end ticks) are the decorative motif; no stock photos or emoji.
  - Hebrew-only still applies to decoration: sheet corner marks are א/ב/ג, not A/B/C (the Hebrew scan will fail otherwise).
- Domain constants (trades, regions, documents, pricing, VAT, dates) live **only** in `lib/domain.ts`. Use `todayISO()`, `addDays()`, `endOfBlock()`, `bookingPhase()` and `ils()`, never `new Date()` arithmetic in pages.
- Comments explain *why*, not *what*. Keep the existing density.

## Gotchas
- **PGlite has one connection.** Awaiting a query outside `tx` while inside one deadlocks. The ALS routing in `lib/db.ts` prevents this if you only use the exported helpers.
- `int8` and `numeric` are parsed to JS numbers by both drivers; `COUNT(*)` is safe without casting.
- Playwright screenshots inject a caret style that triggers a harmless hydration warning ("1 Issue" badge). Use `caret: "initial"`.
- Server Action responses re-render the page. In tests, wait for the POST response before the next click (see the `answer()` helper in `tests/e2e.mjs`).
- `.next/dev/logs/next-development.log` has full server errors when the terminal output is truncated.

## Demo personas (dev mode)
Seeded user ids are stable: 1 agency owner, 2 agency manager, 3 agency viewer, 8 contractor owner, 9 contractor manager (foreman), 13 admin, 14 pending new user. Tests select them with the `yd_dev_as` cookie, and humans use the DEV button.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
