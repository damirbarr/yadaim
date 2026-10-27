"use client";
import { useActionState } from "react";
import { inviteMember } from "@/app/actions/team";
import type { FormState } from "@/app/actions/auth";

export function InviteForm({ kind }: { kind: "agency" | "contractor" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(inviteMember, undefined);
  return (
    <form action={action} className="card grid gap-2 p-4 sm:grid-cols-[1fr_180px_auto]">
      <input type="hidden" name="kind" value={kind} />
      <input name="email" type="email" required dir="ltr" placeholder="כתובת אימייל" className="input" />
      <select name="org_role" defaultValue="manager" className="input">
        <option value="manager">מנהל</option>
        <option value="viewer">צפייה בלבד</option>
        <option value="owner">בעלים</option>
      </select>
      <button className="btn-primary" disabled={pending}>הזמנה לצוות</button>
      {(state?.ok || state?.error) && <p className={`text-sm sm:col-span-3 ${state.ok ? "text-ok" : "text-bad"}`}>{state.ok ?? state.error}</p>}
    </form>
  );
}
