// Every setting the server reads from the environment, in one place. Values are read on access (not at
// import), so the same build works in dev, Vercel and Docker. To add an integration: add its variables
// here and to .env.example, then read them only through `config`. (No "server-only" import: the db CLI in
// scripts/ uses this too. Client components must not import it.)

const env = (k: string) => process.env[k]?.trim() || undefined;
const flag = (k: string, fallback: boolean) => (env(k) === undefined ? fallback : env(k) === "1");

export const config = {
  get appUrl() { return (env("APP_URL") ?? "http://localhost:3000").replace(/\/$/, ""); },
  get production() { return process.env.NODE_ENV === "production"; },
  get onVercel() { return !!env("VERCEL"); },

  db: {
    /** Supabase (or any Postgres) connection string. Unset → embedded PGlite in ./data/pglite. */
    get url() { return env("DATABASE_URL"); },
    get poolMax() { return Number(env("DB_POOL_MAX") ?? 5); },
    get pgliteDir() { return env("PGLITE_DIR"); },
    /** Apply pending migrations on boot. Default: on for PGlite, off for Supabase (use `npm run db:migrate`). */
    get autoMigrate() { return flag("DB_AUTO_MIGRATE", !config.db.url); },
    /** Load demo data into an empty database on boot. Default: on for PGlite only. */
    get seedDemo() { return flag("SEED_DEMO", !config.db.url); },
  },

  supabase: {
    get url() { return env("NEXT_PUBLIC_SUPABASE_URL"); },
    get anonKey() { return env("NEXT_PUBLIC_SUPABASE_ANON_KEY"); },
    /** Server only. Never send it to the browser. */
    get serviceRoleKey() { return env("SUPABASE_SERVICE_ROLE_KEY"); },
    get bucket() { return env("SUPABASE_BUCKET") ?? "uploads"; },
  },

  auth: {
    /** Platform admins: the people who build and run Yadaim. The only way to become one. */
    get adminEmails() { return (env("ADMIN_EMAILS") ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean); },
    /** Dev mode (no sign-in). On in `next dev`, off in production unless AUTH_DEV_BYPASS=1. */
    get devBypass() { return flag("AUTH_DEV_BYPASS", !config.production); },
    get secureCookies() { return config.production && env("INSECURE_COOKIES") !== "1"; },
  },
};

/** Which integrations are switched on, derived from the settings above. */
export const features = {
  get googleSignIn() { return !!(config.supabase.url && config.supabase.anonKey); },
  get supabaseStorage() { return !!(config.supabase.url && config.supabase.serviceRoleKey); },
};
