import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, devBypass, googleEnabled, homeFor } from "@/lib/auth";
import { Logo, Notice } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";
import { PublicShell } from "@/components/PublicShell";
import { PasswordForm, type PasswordMode } from "@/components/PasswordForm";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("public.login.title") };
}

const ERRORS = ["oauth", "disabled", "google_not_configured", "confirm_failed", "reset_expired"] as const;

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

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; intent?: string; mode?: string }> }) {
  const sp = await searchParams;
  const intent = sp.intent === "agency" || sp.intent === "contractor" ? sp.intent : undefined;
  const mode: PasswordMode = sp.mode === "signup" || sp.mode === "forgot" ? sp.mode : "signin";
  const u = await currentUser();
  if (u && !u.dev) redirect(homeFor(u.role));
  const google = googleEnabled();
  const { t, rich } = await getI18n();
  const err = sp.error && (ERRORS as readonly string[]).includes(sp.error) ? t(`public.login.errors.${sp.error as (typeof ERRORS)[number]}`) : t("public.login.errors.other");
  return (
    <PublicShell>
      <main className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:px-8 md:py-14">
      {/* The promise beside the form, in the landing's light style: navy headline with the lime underline, the worker photo. */}
      <section className="relative hidden min-h-[520px] overflow-hidden rounded-[18px] border border-line bg-[linear-gradient(180deg,#ffffff,#f4f8fb)] p-8 md:block">
        <div className="relative z-10">
          <div className="eyebrow">{t("public.login.sideEyebrow")}</div>
          <h2 className="mt-2 text-[30px] font-black leading-[1.2] text-ink">
            {t("public.landing.top.h1a")} {rich("public.landing.top.h1b", { mark: (c) => <span className="relative whitespace-nowrap">{c}<svg viewBox="0 0 200 14" preserveAspectRatio="none" className="absolute -bottom-1.5 start-0 h-2.5 w-full" aria-hidden><path d="M3 9c38-6 80-7 120-4 26 2 48 3 74-2" fill="none" stroke="#d4f25a" strokeWidth="7" strokeLinecap="round" /></svg></span> })}
          </h2>
          <p className="mt-4 max-w-[34ch] text-[15px] text-muted">{t("public.login.sideText")}</p>
        </div>
        <img src="/brand/hero-worker.webp" alt="" className="pointer-events-none absolute bottom-0 end-0 h-[46%] w-auto ltr:-scale-x-100" />
        <p className="absolute bottom-5 start-8 z-10 max-w-[24ch] text-[13px] text-faint">{t("public.login.sideFoot")}</p>
      </section>

      <section className="grid content-center gap-6">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="sheet space-y-3 p-6 md:p-8">
            <div className="eyebrow">{t("public.login.welcome")}</div>
            <h1 className="text-[34px] font-bold leading-tight text-ink">{t("public.login.title")}</h1>
            {sp.error && <Notice tone="bad">{err}</Notice>}
            {google ? (
              <>
                {/* One button for everyone; contractor or agency is chosen at first sign-in. A ?intent= from the landing CTAs only preselects that choice. */}
                <GoogleButton intent={intent} primary>{t("public.login.google")}</GoogleButton>
                <div className="flex items-center gap-3 py-1 text-[13px] text-muted"><span className="h-px flex-1 bg-line" />{t("public.login.pw.or")}<span className="h-px flex-1 bg-line" /></div>
                <PasswordForm key={mode} mode={mode} intent={intent} />
                <p className="border-t border-line pt-3 text-[13px] text-muted">{t("public.login.help")}</p>
              </>
            ) : (
              <Notice tone="warn">{t("public.login.noGoogle")}</Notice>
            )}
          </div>
          {devBypass() && (
            <div className="sheet space-y-2 bg-cool p-5 text-[14px]">
              <div className="font-bold text-ink">{t("public.login.dev.title")}</div>
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
    </PublicShell>
  );
}
