import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, devBypass, googleEnabled, homeFor } from "@/lib/auth";
import { Logo, Notice } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("public.login.title") };
}

const ERRORS = ["oauth", "disabled", "google_not_configured"] as const;

function GoogleButton({ intent, children, primary }: { intent?: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a href={`/auth/google${intent ? `?intent=${intent}` : ""}`} className={`${primary ? "btn-primary" : "btn-ghost"} w-full py-3 text-base`}>
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {children}
    </a>
  );
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; intent?: string }> }) {
  const sp = await searchParams;
  const u = await currentUser();
  if (u && !u.dev) redirect(homeFor(u.role));
  const google = googleEnabled();
  const { t } = await getI18n();
  const err = sp.error && (ERRORS as readonly string[]).includes(sp.error) ? t(`public.login.errors.${sp.error as (typeof ERRORS)[number]}`) : t("public.login.errors.other");
  return (
    <main className="grid min-h-dvh md:grid-cols-[1fr_1.1fr]">
      <section className="blueprint relative hidden flex-col justify-between p-10 md:flex">
        <Link href="/"><Logo dark /></Link>
        <div>
          <div className="text-[13px] font-bold text-hazard">{t("public.login.sideEyebrow")}</div>
          <h2 className="mt-3 text-[48px] font-bold leading-[1.05] text-white">{t("public.landing.h1a")}<br /><em className="not-italic text-hazard">{t("public.landing.h1b")}</em></h2>
          <svg viewBox="0 0 400 40" className="mt-8 w-72" aria-hidden><g stroke="#d4f25a" strokeWidth="1.2"><path d="M4 20h392M4 12v16M396 12v16" /></g></svg>
          <p className="mt-2 max-w-sm text-[15px] text-[#c9d6e3]">{t("public.login.sideText")}</p>
        </div>
        <div className="flex items-center justify-between gap-3"><span className="text-[13px] text-white/45">{t("public.login.sideFoot")}</span><LanguageSwitcher dark /></div>
      </section>

      <section className="grid content-center gap-6 px-4 py-10 md:px-14">
        <div className="grid justify-items-center gap-3 md:hidden"><Link href="/"><Logo /></Link><LanguageSwitcher /></div>
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="sheet space-y-3 border-t-[3px] border-t-ink p-6 md:p-8">
            <div className="eyebrow">{t("public.login.welcome")}</div>
            <h1 className="text-[34px] font-bold leading-tight text-ink">{t("public.login.title")}</h1>
            {sp.error && <Notice tone="bad">{err}</Notice>}
            {google ? (
              <>
                <GoogleButton intent="contractor" primary={sp.intent !== "agency"}>{t("public.login.googleContractor")}</GoogleButton>
                <GoogleButton intent="agency" primary={sp.intent === "agency"}>{t("public.login.googleAgency")}</GoogleButton>
                <p className="border-t border-dashed border-line pt-3 text-[13px] text-muted">{t("public.login.help")}</p>
              </>
            ) : (
              <Notice tone="warn">{t("public.login.noGoogle")}</Notice>
            )}
          </div>
          {devBypass() && (
            <div className="sheet paper-grid space-y-2 border-dashed p-5 text-[14px]">
              <div className="flex items-center gap-2 font-bold text-ink"><span className="stripe h-3 w-6" />{t("public.login.dev.title")}</div>
              <p className="text-muted">{t("public.login.dev.text")}</p>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/c" className="btn-ghost btn-sm">{t("public.login.dev.contractor")}</Link>
                <Link href="/a" className="btn-ghost btn-sm">{t("public.login.dev.agency")}</Link>
                <Link href="/admin" className="btn-ghost btn-sm">{t("public.login.dev.admin")}</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
