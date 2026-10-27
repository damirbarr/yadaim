# Architecture

One Next.js 16 app is both frontend and backend: React Server Components render pages, Server Actions handle every mutation, and Route Handlers cover OAuth, files, WhatsApp redirects and CSV export. It deploys as a single unit (Vercel, or one Docker container). Supabase supplies Postgres, Google sign-in and file storage.

```
 Browser (contractor phone · agency desktop · admin)
        │  HTML/RSC + Server Actions (POST)
        ▼
 ┌────────────────────────── Next.js app (Vercel) ───────────────────────────┐
 │ app/(pages)  ── lib/auth.ts (session + dev persona) ── lib/rbac.ts (can)  │
 │ app/actions/* (mutations)   lib/queries.ts (domain reads)                 │
 │ app/api/*, app/auth/*, app/r/*  (route handlers)                          │
 │            lib/db.ts  ──────────────┬──────────────── lib/storage.ts      │
 └─────────────────────────────────────┼───────────────────────┼─────────────┘
                    DATABASE_URL set?  │                       │ SUPABASE_SERVICE_ROLE_KEY set?
              yes ▼                no ▼                    yes ▼            no ▼
     Supabase Postgres         PGlite (./data/pglite)   Supabase Storage   ./data/uploads
     (postgres.js, pooler)     embedded, zero setup     private bucket     local disk
                                                    
 Google ──OAuth──► Supabase Auth ──code──► /auth/callback ──► app session cookie (yd_session)
```

## Directory map
| Path | What |
|---|---|
| `app/page.tsx` | Landing page |
| `app/login`, `app/onboarding`, `app/forbidden`, `app/signup` (→ login) | Auth screens |
| `app/auth/google`, `app/auth/callback` | Google OAuth via Supabase (route handlers) |
| `app/c/*` | Contractor area: search, worker profile, checkout, orders, site check-in, crews, team |
| `app/a/*` | Agency area: today, requests, compliance, workers, contractors CRM, campaigns, billing, team, settings |
| `app/admin/*` | Platform admin: organisations, users & roles, audit log. 404 for anyone who isn't a platform admin |
| `app/o/[slug]`, `app/r/[ref]` | Public agency offer page; campaign tracking redirect |
| `app/api/files/[name]` | Serves uploads with permission checks |
| `app/api/wa/[rid]` | Marks a campaign message as sent, then redirects to `wa.me` |
| `app/api/reports/placements` | Monthly placement report (CSV) for the Population Authority |
| `app/actions/*.ts` | Server Actions per area (`auth`, `contractor`, `agency`, `team`, `admin`, `worker`) |
| `components/*` | UI. `ui.tsx` primitives, client forms (`*Form.tsx`, incl. `ImportForm` for file import + column mapping), Hebrew `FileField`, `DateField`/`TimeField`, `DevToolbar`, `Nav` |
| `app/globals.css` | Design tokens and utilities for the "שרטוט" (blueprint) design language; Rubik is the only font. Rules in `AGENTS.md` → Conventions |
| `lib/config.ts` | Every env var in one place (`config`) and what is switched on (`features`). Code reads `config.x.y`, never `process.env` |
| `lib/db.ts` | Driver selection, `all/get/run/insert/tx`, auto-migrate and seed |
| `supabase/migrations/*.sql` | The schema: numbered SQL files, the only source of truth (first: `20261027000000_init.sql`) |
| `lib/migrations.ts` | Runs pending migrations in order, one transaction each, tracked in `supabase_migrations.schema_migrations` (same table as the Supabase CLI); enables RLS on every `public` table after each run |
| `lib/seed.ts` | Deterministic demo data |
| `lib/auth.ts` | Sessions, dev persona, impersonation, `requireAgency/Contractor/Admin(perm)` |
| `lib/rbac.ts` | Roles, permissions, matrix, `can()` |
| `lib/accounts.ts` | Google identity → app user (invites, ADMIN_EMAILS) |
| `lib/domain.ts` | Trades, regions, documents, pricing, Israel dates, booking phases |
| `lib/queries.ts` | Search, availability, document checks, reliability, utilisation, idle forecast |
| `lib/importer.ts` | CSV/XLSX parsing; `ImportField[]` definitions (workers, contacts), `autoMap()` header matching, `readImport()` (imports straight away when the sheet matches, otherwise returns a column-mapping request); date and phone normalisation |
| `lib/supabase.ts` | The only place that creates Supabase clients |
| `lib/storage.ts` | `FileStore` interface (`put`/`get`): Supabase Storage or local disk |
| `lib/wa.ts` | `wa.me` link builder, `appUrl()` |
| `scripts/db.ts` | `db:new`, `db:migrate`, `db:status`, `db:seed`, `db:reset` |
| `tests/e2e.mjs` | Playwright end-to-end test of every role (36 checks) |

## Data model
```
agencies 1─* workers 1─* documents          users *─1 agencies | contractors   (role + org_role)
agencies 1─* bookings *─1 contractors         invites → users on first Google sign-in
bookings 1─* booking_workers *─1 workers      sessions (token, user, impersonator)
agencies 1─* crm_contacts 1─* campaign_recipients *─1 campaigns
contractors 1─* crews                          events (agency activity feed) · audit_log (admin trail)
```
- Business dates (`date`, `end_date`, `expires`) are `YYYY-MM-DD` text in Israel time. Timestamps (`*_at`) are UTC text produced by `now_txt()`. String comparison is safe for both.
- Flags are `int` 0/1, which keeps SQL portable.
- A booking covers `days` work days (Sun–Thu), from `date` to `end_date`. Its status is `requested | approved | rejected | cancelled | completed`. The UI phase (`locked` at 18:00 the evening before, `today`, `awaiting_hours`) is computed by `bookingPhase()`.
- `booking_workers.state = removed` keeps history when an agency swaps a worker.

## Request lifecycle
1. **Contractor** `createBooking` re-checks availability and documents inside a transaction, splits the order per agency, and records `events`. A campaign is attributed through the `yd_ref` cookie.
2. **Agency** `approveRequest` validates the chosen workers, adds or removes `booking_workers`, and stores transport details.
3. **Site** `siteCheck` sets identity/trade per worker. `no` means the worker is not billed.
4. **Hours** `approveHours` sets `hours_approved` and the rating, then `status=completed`. That feeds ratings, reliability, billing, and the placements CSV.

## Auth, sessions, dev mode
- **Production:** `/auth/google?intent=` → Supabase `signInWithOAuth(google)` with PKCE cookies → Google → Supabase → `/auth/callback` → `exchangeCodeForSession` → `upsertFromIdentity()` → `startSession()` sets the httpOnly `yd_session` cookie (30 days) → `homeFor(role)`. Supabase is used only for identity, and its session is signed out immediately.
- **Pending users** (`role='pending'`) are sent to `/onboarding`, where they create a contractor or agency and become its `owner`.
- **Invites:** `invites` rows (from team pages or admin) are applied on that email's first sign-in.
- **Admins:** platform admin comes only from `ADMIN_EMAILS` (comma-separated, case-insensitive; `isPlatformAdmin()` in `lib/auth.ts`). Listed emails are promoted on sign-in; a user removed from the list is demoted to pending at the next sign-in. Admin screens can't grant, change, disable or impersonate admins, and `/admin` returns 404 to anyone who isn't a platform admin.
- **Dev mode** (`devBypass()`: on under `next dev` unless `AUTH_DEV_BYPASS=0`, off in production unless `AUTH_DEV_BYPASS=1`): with no session, `currentUser(area)` returns the persona from the `yd_dev_as` cookie, or the first demo owner of that area. `DevToolbar` switches personas.
- **Impersonation** (non-admin users only): `beginImpersonation()` saves the admin token in `yd_admin_return` and opens a 2-hour session with `impersonator_id`. A banner is shown, and every `audit()` records the impersonator.

## RBAC
`lib/rbac.ts` defines 18 permissions and `MATRIX["<role>:<org_role>"]`. Every page and every action calls `requireAgency(perm)`, `requireContractor(perm)` or `requireAdmin(perm)`. These redirect to `/login`, `/onboarding`, the user's home, or `/forbidden?p=`. UI elements are hidden with `can(user, perm)`. **Never** gate by role string in new code; add a permission instead.

| | owner | manager | viewer |
|---|---|---|---|
| agency | everything | workers, requests, compliance, CRM, campaigns | view |
| contractor | everything | book, site check-in, crews | view orders |
| admin | everything incl. impersonate | orgs, users, audit | audit |

## Database drivers
`lib/db.ts` exposes `all<T>(sql, ...params)`, `get`, `run`, `insert` (appends `returning id`) and `tx(fn)`. SQL uses `?` placeholders, which become `$n`. Inside `tx`, calls are routed to the transaction automatically through `AsyncLocalStorage`, so helpers like `getWorker()` stay transactional. Both drivers parse `int8` and `numeric` as JS numbers.
- PGlite holds a single connection. Never `await` a query from outside the transaction while inside `tx()`, because it would deadlock. The ALS routing prevents this as long as you use `all/get/run/insert`.
- postgres.js runs with `prepare:false` for Supabase's transaction pooler.

## Security notes
- RLS is enabled on every table with no policies (automatically, after every migration run), so Supabase's anon/authenticated REST roles see nothing. The app connects as the owner role.
- Documents (`d_*`) are served only to the owning agency, contractors and admins. Photos (`p_*`) are public by unguessable name.
- Server Actions are protected by Next's origin check. Cookies are httpOnly and SameSite=Lax, and Secure in production.
- The passport number is masked for contractors. Only the last 4 digits are shown.

Supabase integration details (migrations, env vars, storage, sign-in): [`SUPABASE.md`](SUPABASE.md).
