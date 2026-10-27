import fs from "node:fs";
import path from "node:path";

// Schema changes are plain SQL files in supabase/migrations/, applied in file-name order, once each.
// Applied versions are recorded in the same table the Supabase CLI uses, so `npm run db:migrate` and
// `supabase db push` are interchangeable. To change the schema: `npm run db:new <name>`, write SQL, done.

export const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

type Exec = { exec(sql: string): Promise<void>; query(sql: string, params: unknown[]): Promise<Record<string, unknown>[]>; tx<T>(fn: (d: Exec) => Promise<T>): Promise<T> };

export function migrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
}

export const versionOf = (file: string) => file.split("_")[0];

/** Versions already applied (creates the bookkeeping table on first use). */
export async function appliedVersions(d: Exec): Promise<Set<string>> {
  await d.exec(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
  `);
  return new Set((await d.query(`select version from supabase_migrations.schema_migrations`, [])).map((r) => String(r.version)));
}

/** Apply every migration not applied yet. Returns the file names it ran. */
export async function migrate(d: Exec): Promise<string[]> {
  const done = await appliedVersions(d);
  const ran: string[] = [];
  for (const file of migrationFiles()) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    if (done.has(version)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await d.tx(async (t) => {
      await t.exec(sql);
      await t.query(`insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)`, [version, rest.join("_")]);
    });
    ran.push(file);
  }
  await d.exec(LOCK_PUBLIC_TABLES);
  return ran;
}

// Supabase serves the public schema over its REST API with the anon key. The app talks to Postgres directly,
// so every table is locked for those API roles (RLS on, no policies). Done here, after every run, so a new
// table can never be forgotten.
const LOCK_PUBLIC_TABLES = `
do $$ declare t record; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;`;
