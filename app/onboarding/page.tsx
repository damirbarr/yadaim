import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, homeFor } from "@/lib/auth";
import { OnboardingForm } from "@/components/OnboardingForm";
import { Logo } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logout } from "@/app/actions/auth";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("public.onboarding.title") };
}

export default async function Onboarding() {
  const u = await currentUser("pending");
  if (!u) redirect("/login");
  if (u.role !== "pending") redirect(homeFor(u.role));
  const intent = (await cookies()).get("yd_intent")?.value === "agency" ? "agency" : "contractor";
  const { t, rich } = await getI18n();
  return (
    <main className="min-h-dvh">
      <header className="blueprint border-b-2 border-hazard">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 px-4 py-4"><Link href="/"><Logo dark /></Link><LanguageSwitcher dark /></div>
      </header>
      <div className="mx-auto grid max-w-2xl gap-6 px-4 py-10">
        <div className="sheet border-t-[3px] border-t-ink p-6 md:p-8">
          <div className="eyebrow mb-1">{t("public.onboarding.eyebrow")}</div>
          <h1 className="mb-1 text-[34px] font-bold leading-tight text-ink">{t("public.onboarding.hello", { name: u.name.split(" ")[0] })}</h1>
          <p className="mb-6 border-b border-dashed border-line pb-4 text-[15px] text-muted">{rich("public.onboarding.signedInAs", { email: (c) => <span dir="ltr">{c}</span> }, { email: u.email })}</p>
          <OnboardingForm initialKind={intent} name={u.name} />
        </div>
        <form action={logout} className="text-center"><button className="text-sm text-muted underline">{t("common.logout")}</button></form>
      </div>
    </main>
  );
}
