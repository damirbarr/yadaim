"use client";
import { useActionState, useState } from "react";
import { completeOnboarding, type FormState } from "@/app/actions/auth";
import { CLASSIFICATIONS, REGIONS } from "@/lib/domain";
import { useI18n } from "@/lib/i18n/client";

export function OnboardingForm({ initialKind, name }: { initialKind: "contractor" | "agency"; name: string }) {
  const { t, fmt } = useI18n();
  const [kind, setKind] = useState(initialKind);
  const [state, action, pending] = useActionState<FormState, FormData>(completeOnboarding, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="seg">
        <label><input type="radio" name="kind" value="contractor" checked={kind === "contractor"} onChange={() => setKind("contractor")} />{t("public.onboarding.kindContractor")}</label>
        <label><input type="radio" name="kind" value="agency" checked={kind === "agency"} onChange={() => setKind("agency")} />{t("public.onboarding.kindAgency")}</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">{kind === "agency" ? t("public.onboarding.agencyName") : t("public.onboarding.company")}</label><input className="input" name="company" required /></div>
        <div><label className="label">{kind === "agency" ? t("public.onboarding.licenseNo") : t("public.onboarding.registryNo")}</label><input className="input" name="number" required dir="ltr" /></div>
        {kind === "contractor" && (
          <div>
            <label className="label">{t("public.onboarding.classification")}</label>
            {/* Registry classifications are official codes, shown as issued. */}
            <select className="input" name="classification" defaultValue=""><option value="">{t("public.onboarding.unknown")}</option>{CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
        )}
        <div><label className="label">{t("public.onboarding.fullName")}</label><input className="input" name="name" required defaultValue={name} /></div>
        <div><label className="label">{t("public.onboarding.phone")}</label><input className="input" name="phone" required dir="ltr" inputMode="tel" /></div>
        <div>
          <label className="label">{t("public.onboarding.city")}</label>
          <select className="input" name="city" required defaultValue="">
            <option value="" disabled>{t("public.onboarding.choose")}</option>
            {REGIONS.map((r) => <optgroup key={r.key} label={fmt.region(r.key)}>{r.cities.map((c) => <option key={c} value={c}>{fmt.city(c)}</option>)}</optgroup>)}
          </select>
        </div>
      </div>
      {kind === "agency" && (
        <fieldset>
          <legend className="label">{t("public.onboarding.regions")}</legend>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <label key={r.key} className="chip-muted cursor-pointer px-3 py-1.5 text-xs has-[:checked]:bg-ink has-[:checked]:text-white">
                <input type="checkbox" name="regions" value={r.key} className="sr-only" />{fmt.region(r.key)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <p className="text-xs text-muted">{kind === "agency" ? t("public.onboarding.agencyNote") : t("public.onboarding.contractorNote")}</p>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? t("public.onboarding.saving") : t("public.onboarding.next")}</button>
    </form>
  );
}
