import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

// The only file that creates Supabase clients. What we use Supabase for:
//   • Auth    - identity only: Google, or email + password (confirmed by email). Sessions and permissions are the app's own (lib/auth.ts).
//   • Storage - a private bucket behind lib/storage.ts.
//   • Postgres - through DATABASE_URL in lib/db.ts, not through supabase-js.
// To use another Supabase feature (Realtime, Edge Functions…), add a function here that returns the client.

/** Request-bound client, used for the OAuth handshake (it keeps the PKCE verifier in cookies). */
export async function supabaseAuth() {
  const jar = await cookies();
  return createServerClient(config.supabase.url!, config.supabase.anonKey!, {
    cookies: {
      getAll: () => jar.getAll(),
      // Server Components can't set cookies (only actions and route handlers can); reading the session there is enough.
      setAll: (list) => { try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch {} },
    },
  });
}

let admin: SupabaseClient | undefined;
/** Service-role client for server-side work (Storage). Never expose this key to the browser. */
export function supabaseAdmin() {
  admin ??= createClient(config.supabase.url!, config.supabase.serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
