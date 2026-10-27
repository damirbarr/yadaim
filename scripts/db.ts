/**
 * Database CLI — works against PGlite (no DATABASE_URL) or any Postgres/Supabase (DATABASE_URL set).
 *
 *   npm run db:migrate          apply lib/schema.ts (idempotent)
 *   npm run db:seed             load demo data if the database is empty
 *   npm run db:seed -- --force  wipe all app tables, then load demo data
 *   npm run db:export-schema    write supabase/migrations/0001_init.sql from lib/schema.ts
 *   npm run db:reset            local only: delete ./data/pglite and ./data/uploads
 */
import fs from "node:fs";
import path from "node:path";

process.env.DB_AUTO_MIGRATE = "0";
process.env.SEED_DEMO = "0";

const TABLES = ["audit_log", "events", "campaign_recipients", "campaigns", "crm_contacts", "crews", "booking_workers", "bookings", "documents", "workers", "sessions", "invites", "users", "contractors", "agencies"];

async function main() {
  const cmd = process.argv[2];
  const { SCHEMA } = await import("../lib/schema");
  if (cmd === "export-schema") {
    const out = path.join(process.cwd(), "supabase", "migrations", "0001_init.sql");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `-- Generated from lib/schema.ts by \`npm run db:export-schema\`. Do not edit by hand.\n${SCHEMA.trim()}\n`);
    console.log("wrote", out);
    return;
  }
  if (cmd === "reset") {
    if (process.env.DATABASE_URL) throw new Error("db:reset is for the local PGlite database only. Use `npm run db:seed -- --force` against Supabase.");
    for (const d of ["pglite", "uploads"]) fs.rmSync(path.join(process.cwd(), "data", d), { recursive: true, force: true });
    console.log("local database and uploads deleted — it will be recreated with demo data on next `npm run dev`");
    return;
  }
  const { driver } = await import("../lib/db");
  const d = await driver();
  console.log(`connected (${d.kind})`);
  if (cmd === "migrate") {
    await d.exec(SCHEMA);
    console.log("schema applied");
  } else if (cmd === "seed") {
    await d.exec(SCHEMA);
    const [{ n }] = await d.query(`select count(*)::int as n from users`, []);
    if (n && !process.argv.includes("--force")) {
      console.log(`database already has ${n} users — nothing to do (use --force to wipe and reseed)`);
    } else {
      if (n) await d.exec(`truncate ${TABLES.join(", ")} restart identity cascade`);
      const { seed } = await import("../lib/seed");
      const t = Date.now();
      await seed(d.query.bind(d));
      console.log(`demo data loaded in ${Date.now() - t}ms`);
    }
  } else {
    console.log("usage: tsx scripts/db.ts migrate|seed [--force]|export-schema|reset");
    process.exitCode = 1;
  }
  process.exit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
