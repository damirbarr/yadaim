import Link from "next/link";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase";
import { Logo } from "@/components/ui";
import { PasswordForm } from "@/components/PasswordForm";
import { getI18n } from "@/lib/i18n/server";
import { PublicShell } from "@/components/PublicShell";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("public.login.pw.resetTitle") };
}

/** Choose a new password. Reached only from the reset email, through /auth/confirm (which opened a short Supabase session). */
export default async function Reset() {
  if (!googleEnabled()) redirect("/login");
  const { data: { user } } = await (await supabaseAuth()).auth.getUser();
  if (!user) redirect("/login?mode=forgot&error=reset_expired");
  const { t } = await getI18n();
  return (
    <PublicShell>
    <main className="grid gap-6 px-4 py-12">
      <div className="sheet mx-auto w-full max-w-md space-y-3 p-6 md:p-8">
        <h1 className="text-[30px] font-bold leading-tight text-ink">{t("public.login.pw.resetTitle")}</h1>
        <p className="text-[14px] text-muted" dir="auto">{user.email}</p>
        <PasswordForm mode="reset" />
      </div>
    </main>
    </PublicShell>
  );
}
