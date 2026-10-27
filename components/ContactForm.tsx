"use client";
import { useActionState } from "react";
import { addContact } from "@/app/actions/agency";
import type { FormState } from "@/app/actions/auth";
import { REGIONS } from "@/lib/domain";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addContact, undefined);
  return (
    <form action={action} className="card grid gap-2 p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <input name="name" className="input" placeholder="שם" required />
      <input name="company" className="input" placeholder="חברה" />
      <input name="phone" className="input" placeholder="טלפון" dir="ltr" required />
      <select name="city" className="input" defaultValue=""><option value="">עיר</option>{REGIONS.map((r) => <optgroup key={r.key} label={r.label}>{r.cities.map((c) => <option key={c}>{c}</option>)}</optgroup>)}</select>
      <button className="btn-primary" disabled={pending}>הוספה</button>
      {(state?.ok || state?.error) && <p className={`text-sm sm:col-span-5 ${state.ok ? "text-ok" : "text-bad"}`}>{state.ok ?? state.error}</p>}
    </form>
  );
}
