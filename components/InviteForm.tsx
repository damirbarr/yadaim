"use client";
import { useActionState } from "react";
import { inviteMember } from "@/app/actions/team";
import type { FormState } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function InviteForm({ kind }: { kind: "agency" | "contractor" }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(inviteMember, undefined);
  return (
    <form action={action} className="card grid gap-2 p-4 sm:grid-cols-[1fr_180px_auto]">
      <input type="hidden" name="kind" value={kind} />
      <input name="email" type="email" required dir="ltr" placeholder={t("team.email")} className="input" />
      <select name="org_role" defaultValue="manager" className="input">
        {(["manager", "viewer", "owner"] as const).map((r) => <option key={r} value={r}>{t(`roles.org.${r}`)}</option>)}
      </select>
      <button className="btn-primary" disabled={pending}>{t("team.invite")}</button>
      {(state?.ok || state?.error) && <p className={`text-sm sm:col-span-3 ${state.ok ? "text-ok" : "text-bad"}`}>{state.ok ?? state.error}</p>}
    </form>
  );
}
