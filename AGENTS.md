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
4. `docs/LOCAL_DEV.md` and `docs/DEPLOY.md`: run, test, deploy.
5. `docs/CONVERSATION.md`, `docs/source/`, `docs/market-research.md`: background and why things are the way they are.

## Commands
```bash
npm install
npm run dev                 # http://localhost:3000. Embedded Postgres (PGlite) + demo data + dev mode (no sign-in)
npm run typecheck
npm run build
npm run db:reset            # wipe local DB → fresh demo data on next `npm run dev` (do this before e2e and if "today" data looks stale)
npm run test:e2e            # 33-check Playwright run of every role, against a running dev server with fresh data
npm run db:export-schema    # after editing lib/schema.ts
```
Only one `next dev` can run per directory. Seed data is generated relative to **today's date**, so reset when the day changes.

## Definition of done (every change)
- [ ] `npm run typecheck` and `npm run build` pass.
- [ ] `npm run db:reset && npm run dev`, then `npm run test:e2e` passes. Extend `tests/e2e.mjs` for new user-facing flows.
- [ ] New mutations check a **permission** (`requireAgency("agency.x")`, etc.) and write `audit()` for anything security- or money-relevant.
- [ ] Schema changes are **idempotent** statements appended to `lib/schema.ts`, and `supabase/migrations/0001_init.sql` is regenerated.
- [ ] `docs/STATUS.md` is updated (tick items, add limitations). Update `docs/ARCHITECTURE.md` if structure changed.
- [ ] UI copy is Hebrew, RTL-correct, and gender-neutral where possible (address users in plural: "בחרו", "העלו"). The contractor UI is checked at 390px width.

## Golden rules
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
7. **Dev mode is a convenience, not a security model.** `devBypass()` is off in production unless `AUTH_DEV_BYPASS=1`. Don't add code paths that skip `require*()` in dev.
8. **Don't send real messages from tests.** WhatsApp is `wa.me` links today; if you add an API sender, put it behind an interface in `lib/wa.ts` with a no-op or dev implementation.

## How to add things
**A new screen in the agency area**
1. `app/a/<name>/page.tsx`: an async Server Component that calls `const { user, agencyId } = await requireAgency("agency.view")`.
2. Add a nav item in `app/a/layout.tsx` with its `perm`.
3. Mutations go in `app/actions/agency.ts` (or a new `app/actions/<area>.ts` with `"use server"`). For forms that show errors, use the `FormState` + `useActionState` pattern (see `components/WorkerForm.tsx`). For simple buttons, use `<form action={serverAction}>`.
4. Call `revalidatePath()` after writes and `redirect()` for navigation.

**A new column/table:** append to `lib/schema.ts`, e.g. `alter table workers add column if not exists latin_name text;`. Update the types in `lib/queries.ts`, the seed if useful, then run `npm run db:export-schema`.

**A new permission:** `lib/rbac.ts` → `PERMISSIONS` (Hebrew label) plus `MATRIX`. The team page table updates itself.

**UI language:** everything a user sees is **Hebrew**, with no English words, labels or codes. That includes browser controls: use `FileField` (not a raw `<input type="file">`), `DateField` / `TimeField` (not native date or time inputs, which show the browser's locale), and Hebrew labels for audit actions. Email addresses are the only Latin text allowed. Check with the Latin-text scan described in `docs/LOCAL_DEV.md`.

## Conventions
- TypeScript strict, Server Components by default, `"use client"` only for interactive pieces (`components/*Form.tsx`, `ResultsGrid`, `PriceToggles`, `Nav`).
- Next.js 16: `params`, `searchParams` and `cookies()` are **async** (await them). There is no middleware; guards live in layouts and pages via `require*()`.
- Styling: Tailwind 4 with design tokens in `app/globals.css` and utilities `card`/`sheet`, `btn-primary|hazard|ghost|ok`, `btn-sm`, `input`, `label`, `chip-*`, `seg`, `tbl`, `num` (wrap numbers in `.num` for LTR digits inside RTL). UI primitives live in `components/ui.tsx` (`PageHead`, `Stat`, `Empty`, `Avatar`, `ScoreRing`, `Notice`, `Logo`).
- **Design language "שרטוט" (blueprint), chosen by the owner in round 5.** Keep new screens in it; don't drift back to generic rounded cards:
  - Colours: navy `ink` #0e2a44 (frames, primary buttons), paper `paper` #f4efe4 (page background), white sheets with 1px `line` #d9cfbc borders, lime `hazard` #d4f25a as the single accent (only on navy or as a highlight, never as body text on paper), orange `signal` #ff7a45 for "now/attention" dots. Status: `ok/warn/bad/info` (+ `-soft`).
  - Type: Frank Ruhl Libre (serif) for every `h1`–`h3`, big numbers and prices (`font-display`); Assistant for body. Use the `eyebrow` class (small, spaced, muted) above titles, e.g. "גיליון יומי · 27.10".
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
