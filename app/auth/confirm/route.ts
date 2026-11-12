import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { googleEnabled } from "@/lib/auth";
import { finishLogin } from "@/lib/login";
import { supabaseAuth } from "@/lib/supabase";

/**
 * Where Supabase's emails land. Two link shapes:
 *   • ?token_hash=…&type=email|recovery: from custom email templates (docs/DEPLOY.md). Verified on the server, so the
 *     link works in any browser.
 *   • ?code=…: from Supabase's default templates (free plan without custom SMTP can't change them). PKCE, so it works
 *     in the browser that signed up or asked for the reset. A reset carries next=reset in the redirect address.
 * Sign-up → signed in (then onboarding). Reset → /auth/reset to choose a new password, keeping the Supabase session.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const tokenHash = sp.get("token_hash"), code = sp.get("code");
  const type = sp.get("type") as EmailOtpType | null;
  const recovery = type === "recovery" || sp.get("next") === "reset";
  if (!googleEnabled() || !(tokenHash && type) && !code) redirect("/login?error=confirm_failed");
  const sb = await supabaseAuth();
  const { data, error } = tokenHash && type ? await sb.auth.verifyOtp({ type, token_hash: tokenHash }) : await sb.auth.exchangeCodeForSession(code!);
  if (error || !data.user) redirect(recovery ? "/login?mode=forgot&error=reset_expired" : "/login?error=confirm_failed");
  if (recovery) redirect("/auth/reset");
  await sb.auth.signOut({ scope: "local" }).catch(() => {});
  await finishLogin(data.user, "password");
}
