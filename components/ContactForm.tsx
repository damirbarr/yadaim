"use client";
import { useActionState } from "react";
import { addContact } from "@/app/actions/agency";
import type { FormState } from "@/app/actions/auth";
import { REGIONS } from "@/lib/domain";
import { useI18n } from "@/lib/i18n/client";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addContact, undefined);
  const { t, fmt } = useI18n();
  return (
    <form action={action} className="card grid gap-2 p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <input name="name" className="input" placeholder={t("market.contractors.form.name")} required />
      <input name="company" className="input" placeholder={t("market.contractors.form.company")} />
      <input name="phone" className="input" placeholder={t("market.contractors.form.phone")} dir="ltr" required />
      {/* Cities are stored in Hebrew; only the label is translated. */}
      <select name="city" className="input" defaultValue=""><option value="">{t("market.contractors.form.city")}</option>{REGIONS.map((r) => <optgroup key={r.key} label={fmt.region(r.key)}>{r.cities.map((c) => <option key={c} value={c}>{fmt.city(c)}</option>)}</optgroup>)}</select>
      <button className="btn-primary" disabled={pending}>{t("market.contractors.form.add")}</button>
      {(state?.ok || state?.error) && <p className={`text-sm sm:col-span-5 ${state.ok ? "text-ok" : "text-bad"}`}>{state.ok ?? state.error}</p>}
    </form>
  );
}
