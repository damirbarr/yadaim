import "server-only";
import { redirect } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { get } from "./db";
import { homeFor, startSession } from "./auth";
import { upsertFromIdentity } from "./accounts";
import { audit } from "./audit";
import type { Role } from "./rbac";

/**
 * A verified Supabase identity (Google, or an email whose address was confirmed) becomes an app user and an app
 * session, then goes to its home. Accounts are matched by email, so Google and password sign-in reach the same
 * user. Callers must sign out of Supabase first: the app keeps its own session cookie.
 */
export async function finishLogin(user: SupabaseUser, method: "google" | "password"): Promise<never> {
  if (!user.email) redirect("/login?error=oauth");
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const res = await upsertFromIdentity({ email: user.email, name: meta.full_name || meta.name || "", avatar: meta.avatar_url || meta.picture || null, subject: user.id });
  if (res.disabled) redirect("/login?error=disabled");
  await startSession(res.id);
  await audit({ id: res.id }, "login", user.email, method);
  const u = await get<{ role: Role }>(`SELECT role FROM users WHERE id = ?`, res.id);
  redirect(homeFor(u!.role));
}
