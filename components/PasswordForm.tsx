"use client";
import Link from "next/link";
import { useActionState } from "react";
import { passwordSignIn, passwordSignUp, requestPasswordReset, setNewPassword, type FormState } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { Notice } from "@/components/ui";

export type PasswordMode = "signin" | "signup" | "forgot" | "reset";
const ACTIONS = { signin: passwordSignIn, signup: passwordSignUp, forgot: requestPasswordReset, reset: setNewPassword };

/** Email + password: sign in, create an account, ask for a reset link, or choose a new password. Modes switch by ?mode=. */
export function PasswordForm({ mode, intent }: { mode: PasswordMode; intent?: string }) {
  const { t, rich } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(ACTIONS[mode], undefined);
  const q = intent ? `&intent=${intent}` : "";
  const link = (m: string) => (c: React.ReactNode) => <Link href={`/login?mode=${m}${q}`} className="font-bold text-ink underline">{c}</Link>;
  if (state?.ok) return <Notice tone="ok">{state.ok}</Notice>;
  return (
    <form action={action} className="space-y-3" data-testid={`pw-${mode}`}>
      {intent && <input type="hidden" name="intent" value={intent} />}
      {mode === "signup" && <div><label className="label" htmlFor="pw-name">{t("public.login.pw.name")}</label><input id="pw-name" className="input" name="name" autoComplete="name" required /></div>}
      {mode !== "reset" && <div><label className="label" htmlFor="pw-email">{t("public.login.pw.email")}</label><input id="pw-email" className="input" name="email" type="email" autoComplete="email" dir="ltr" required /></div>}
      {mode !== "forgot" && (
        <div>
          <label className="label" htmlFor="pw-password">{mode === "reset" ? t("public.login.pw.newPassword") : t("public.login.pw.password")}</label>
          <input id="pw-password" className="input" name="password" type="password" dir="ltr" required minLength={mode === "signin" ? undefined : 8} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          {mode !== "signin" && <p className="mt-1 text-[12px] text-muted">{t("public.login.pw.rule")}</p>}
        </div>
      )}
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      <button disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? t("public.login.pw.working") : t(`public.login.pw.submit.${mode}`)}
      </button>
      <div className="space-y-1 text-[14px] text-muted">
        {mode === "signin" && <><p>{rich("public.login.pw.toSignUp", { link: link("signup") })}</p><p>{rich("public.login.pw.toForgot", { link: link("forgot") })}</p></>}
        {(mode === "signup" || mode === "forgot") && <p>{rich("public.login.pw.toSignIn", { link: link("signin") })}</p>}
      </div>
    </form>
  );
}
