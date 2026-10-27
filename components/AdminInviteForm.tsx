"use client";
import { useActionState, useState } from "react";
import { adminInvite } from "@/app/actions/admin";
import type { FormState } from "@/app/actions/auth";

export function AdminInviteForm({ agencies, contractors }: { agencies: { id: number; name: string }[]; contractors: { id: number; company: string }[] }) {
  const [role, setRole] = useState("agency");
  const [state, action, pending] = useActionState<FormState, FormData>(adminInvite, undefined);
  return (
    <form action={action} className="card grid gap-2 p-4 md:grid-cols-[1.4fr_1fr_1.4fr_1fr_auto]">
      <input name="email" type="email" required dir="ltr" placeholder="כתובת אימייל" className="input" />
      <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className="input">
        <option value="agency">תאגיד</option><option value="contractor">קבלן</option><option value="admin">אדמין</option>
      </select>
      <select name="org" className="input" disabled={role === "admin"} defaultValue="">
        <option value="">{role === "admin" ? "—" : "ארגון…"}</option>
        {role === "agency" && agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        {role === "contractor" && contractors.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
      </select>
      <select name="org_role" className="input" defaultValue="owner"><option value="owner">בעלים</option><option value="manager">מנהל</option><option value="viewer">צפייה</option></select>
      <button className="btn-primary" disabled={pending}>הוספה</button>
      {(state?.ok || state?.error) && <p className={`text-sm md:col-span-5 ${state.ok ? "text-ok" : "text-bad"}`}>{state.ok ?? state.error}</p>}
    </form>
  );
}
