import { redirect } from "next/navigation";
import { googleEnabled } from "@/lib/auth";
import { finishLogin } from "@/lib/login";
import { supabaseAuth } from "@/lib/supabase";

/** Google → Supabase → here. Exchange the code, map the identity to an app user, open an app session. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!googleEnabled() || !code) redirect("/login?error=oauth");
  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data?.user?.email) redirect("/login?error=oauth");
  // We only use Supabase for identity; the app keeps its own session cookie.
  await sb.auth.signOut({ scope: "local" }).catch(() => {});
  await finishLogin(data.user, "google");
}
