import { redirect } from "next/navigation";
import { get } from "@/lib/db";
import { googleEnabled, homeFor, startSession } from "@/lib/auth";
import { upsertFromIdentity } from "@/lib/accounts";
import { audit } from "@/lib/audit";
import { supabaseAuth } from "@/lib/supabase";
import type { Role } from "@/lib/rbac";

/** Google → Supabase → here. Exchange the code, map the identity to an app user, open an app session. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!googleEnabled() || !code) redirect("/login?error=oauth");
  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  const user = data?.user;
  if (error || !user?.email) redirect("/login?error=oauth");
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const res = await upsertFromIdentity({
    email: user.email,
    name: meta.full_name || meta.name || "",
    avatar: meta.avatar_url || meta.picture || null,
    subject: user.id,
  });
  // We only use Supabase for identity; the app keeps its own session cookie.
  await sb.auth.signOut({ scope: "local" }).catch(() => {});
  if (res.disabled) redirect("/login?error=disabled");
  await startSession(res.id);
  await audit({ id: res.id }, "login", user.email, "google");
  const u = await get<{ role: Role }>(`SELECT role FROM users WHERE id = ?`, res.id);
  redirect(homeFor(u!.role));
}
