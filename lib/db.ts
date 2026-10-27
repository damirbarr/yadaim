import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { migrate } from "./migrations";

// One async API over two Postgres drivers:
//   • DATABASE_URL set  → postgres.js (Supabase / any Postgres)            - production
//   • otherwise         → PGlite, embedded Postgres in ./data/pglite       - zero-setup local dev
// The schema lives in supabase/migrations/ (see lib/migrations.ts).
// SQL is written with `?` placeholders; they are converted to $1..$n here.

type Row = Record<string, unknown>;
interface Driver {
  query(sql: string, params: unknown[]): Promise<Row[]>;
  exec(sql: string): Promise<void>;
  tx<T>(fn: (d: Driver) => Promise<T>): Promise<T>;
  kind: "pglite" | "postgres";
}

const toPg = (sql: string) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};
const clean = (params: unknown[]) => params.map((p) => (p === undefined ? null : p));

async function pgliteDriver(): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = config.db.pgliteDir;
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const pg = await PGlite.create(dir, { parsers: { 20: Number, 1700: Number } });
  type Q = { query: typeof pg.query; exec: typeof pg.exec };
  const mk = (c: Q, root: boolean): Driver => {
    const d: Driver = {
      kind: "pglite",
      query: async (sql, params) => (await c.query<Row>(toPg(sql), clean(params))).rows,
      exec: async (sql) => void (await c.exec(sql)),
      tx: (fn) => (root ? pg.transaction((t) => fn(mk(t as unknown as Q, false))) : fn(d)),
    };
    return d;
  };
  return mk(pg, true);
}

async function postgresDriver(url: string): Promise<Driver> {
  const postgres = (await import("postgres")).default;
  const num = (oid: number) => ({ to: oid, from: [oid], parse: (x: string) => Number(x), serialize: (x: unknown) => String(x) });
  const sql = postgres(url, {
    prepare: false, // required for Supabase's transaction pooler (port 6543)
    max: config.db.poolMax,
    idle_timeout: 20,
    types: { int8: num(20), numeric: num(1700) },
    onnotice: () => {},
  });
  type S = Pick<typeof sql, "unsafe">;
  const mk = (c: S, root: boolean): Driver => {
    const d: Driver = {
      kind: "postgres",
      query: async (q, params) => (await c.unsafe(toPg(q), clean(params) as never[])) as unknown as Row[],
      exec: async (q) => void (await c.unsafe(q)),
      tx: (fn) => (root ? (sql.begin((t) => fn(mk(t, false))) as Promise<never>) : fn(d)),
    };
    return d;
  };
  return mk(sql, true);
}

type G = typeof globalThis & { __yd?: Promise<Driver> };
const store = new AsyncLocalStorage<Driver>();

async function boot(): Promise<Driver> {
  const url = config.db.url;
  if (!url && config.onVercel && !config.demo) throw new Error("DATABASE_URL is not set. On Vercel the app needs Supabase Postgres (see docs/SUPABASE.md).");
  const d = url ? await postgresDriver(url) : await pgliteDriver();
  if (config.db.autoMigrate) await migrate(d);
  if (config.db.seedDemo) {
    const [{ n }] = await d.query(`select count(*)::int as n from users`, []);
    if (n === 0) {
      const { seed } = await import("./seed");
      await seed(d.query.bind(d));
    }
  }
  return d;
}

export function driver(): Promise<Driver> {
  const g = globalThis as G;
  if (!g.__yd) g.__yd = boot().catch((e) => { g.__yd = undefined; throw e; });
  return g.__yd;
}

async function current() {
  return store.getStore() ?? (await driver());
}

/** All rows. */
export async function all<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
  return (await (await current()).query(sql, params)) as T[];
}
/** First row or undefined. */
export async function get<T = Row>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  return (await all<T>(sql, ...params))[0];
}
/** INSERT/UPDATE/DELETE; returns affected rows when the statement has RETURNING. */
export async function run(sql: string, ...params: unknown[]): Promise<Row[]> {
  return (await current()).query(sql, params);
}
/** INSERT … and return the new id. */
export async function insert(sql: string, ...params: unknown[]): Promise<number> {
  const rows = await (await current()).query(`${sql} returning id`, params);
  return Number(rows[0]?.id);
}
/** Run `fn` in a transaction; every all/get/run/insert inside it uses the transaction automatically. */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  const active = store.getStore();
  if (active) return fn();
  const d = await driver();
  return d.tx((t) => store.run(t, fn));
}

