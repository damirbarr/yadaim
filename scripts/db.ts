/**
 * Database CLI - works against PGlite (no DATABASE_URL) or Supabase / any Postgres (DATABASE_URL set).
 *
 *   npm run db:new -- add_latin_name   create supabase/migrations/<timestamp>_add_latin_name.sql
 *   npm run db:migrate                 apply pending migrations
 *   npm run db:status                  list migrations and whether each is applied
 *   npm run db:seed                    load demo data if the database is empty
 *   npm run db:seed -- --force         wipe all app tables, then load demo data
 *   npm run db:reset                   local only: delete ./data/pglite and ./data/uploads
 */
import fs from "node:fs";
import path from "node:path";

process.env.DB_AUTO_MIGRATE = "0";
process.env.SEED_DEMO = "0";

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const { MIGRATIONS_DIR, appliedVersions, migrate, migrationFiles, versionOf } = await import("../lib/migrations");
  if (cmd === "new") {
    const name = (arg ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!name) throw new Error("usage: npm run db:new -- <name>   e.g. add_latin_name");
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const file = path.join(MIGRATIONS_DIR, `${stamp}_${name}.sql`);
    fs.writeFileSync(file, `-- ${name.replace(/_/g, " ")}\n-- Plain Postgres. Runs once, in a transaction. New tables get RLS automatically.\n\n`);
    console.log("created", path.relative(process.cwd(), file));
    return;
  }
  if (cmd === "reset") {
    if (process.env.DATABASE_URL) throw new Error("db:reset is for the local PGlite database only. Use `npm run db:seed -- --force` against Supabase.");
    for (const d of ["pglite", "uploads"]) fs.rmSync(path.join(process.cwd(), "data", d), { recursive: true, force: true });
    console.log("local database and uploads deleted - it will be recreated with demo data on next `npm run dev`");
    return;
  }
  const { driver } = await import("../lib/db");
  const d = await driver();
  console.log(`connected (${d.kind})`);
  if (cmd === "migrate") {
    const ran = await migrate(d);
    console.log(ran.length ? `applied:\n  ${ran.join("\n  ")}` : "up to date");
  } else if (cmd === "status") {
    const done = await appliedVersions(d);
    for (const f of migrationFiles()) console.log(`${done.has(versionOf(f)) ? "✓ applied" : "· pending"}  ${f}`);
  } else if (cmd === "seed") {
    await migrate(d);
    const [{ n }] = await d.query(`select count(*)::int as n from users`, []);
    if (n && !process.argv.includes("--force")) {
      console.log(`database already has ${n} users - nothing to do (use --force to wipe and reseed)`);
    } else {
      if (n) {
        const tables = (await d.query(`select tablename from pg_tables where schemaname = 'public'`, [])).map((r) => `"${r.tablename}"`);
        await d.exec(`truncate ${tables.join(", ")} restart identity cascade`);
      }
      const { seed } = await import("../lib/seed");
      const t = Date.now();
      await seed(d.query.bind(d));
      console.log(`demo data loaded in ${Date.now() - t}ms`);
    }
  } else {
    console.log("usage: tsx scripts/db.ts new <name> | migrate | status | seed [--force] | reset");
    process.exitCode = 1;
  }
  process.exit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
