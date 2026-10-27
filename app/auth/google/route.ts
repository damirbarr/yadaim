import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase";
import { appUrl } from "@/lib/wa";

/** Start Google sign-in through Supabase Auth. ?intent=contractor|agency pre-selects the onboarding choice. */
export async function GET(req: Request) {
  if (!googleEnabled()) redirect("/login?error=google_not_configured");
  const intent = new URL(req.url).searchParams.get("intent");
  if (intent === "contractor" || intent === "agency") (await cookies()).set("yd_intent", intent, { path: "/", maxAge: 600, sameSite: "lax", httpOnly: true });
  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: appUrl("/auth/callback"), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
