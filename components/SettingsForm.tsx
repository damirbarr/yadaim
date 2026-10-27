"use client";
import { useActionState } from "react";
import { saveSettings } from "@/app/actions/agency";
import type { FormState } from "@/app/actions/auth";
import { MIN_DAYS_OPTIONS, REGIONS } from "@/lib/domain";
import { useI18n } from "@/lib/i18n/client";

type A = { name: string; phone: string | null; about: string | null; regions: string; min_days: number; lodging_discount: number; transport_rate: number; auto_campaign: number };

export function SettingsForm({ a }: { a: A }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, undefined);
  const { t, fmt } = useI18n();
  return (
    <form action={action} className="space-y-5">
      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="text-[20px] font-bold text-ink sm:col-span-2">{t("market.settings.profile")}</h2>
        <div><label className="label">{t("market.settings.name")}</label><input name="name" className="input" defaultValue={a.name} required /></div>
        <div><label className="label">{t("market.settings.phone")}</label><input name="phone" className="input" dir="ltr" defaultValue={a.phone ?? ""} /></div>
        <div className="sm:col-span-2"><label className="label">{t("market.settings.about")}</label><textarea name="about" rows={2} className="input" defaultValue={a.about ?? ""} /></div>
        <fieldset className="sm:col-span-2">
          <legend className="label">{t("market.settings.regions")}</legend>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <label key={r.key} className="chip-muted cursor-pointer px-3 py-1.5 has-[:checked]:bg-ink has-[:checked]:text-white">
                <input type="checkbox" name="regions" value={r.key} defaultChecked={a.regions.split(",").includes(r.key)} className="sr-only" />{fmt.region(r.key)}
              </label>
            ))}
          </div>
        </fieldset>
      </section>
      <section className="card grid gap-3 p-5 sm:grid-cols-3">
        <h2 className="text-[20px] font-bold text-ink sm:col-span-3">{t("market.settings.pricing")}</h2>
        <div>
          <label className="label">{t("market.settings.minDays")}</label>
          <select name="min_days" className="input" defaultValue={a.min_days}>{MIN_DAYS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{fmt.minDays(o.v)}</option>)}</select>
          <p className="mt-1 text-xs text-muted">{t("market.settings.minDaysHint")}</p>
        </div>
        <div><label className="label">{t("market.settings.lodging")}</label><input name="lodging_discount" type="number" step="0.5" min="0" className="input" defaultValue={a.lodging_discount} /></div>
        <div><label className="label">{t("market.settings.transport")}</label><input name="transport_rate" type="number" step="0.5" min="0" className="input" defaultValue={a.transport_rate} /></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="auto_campaign" defaultChecked={!!a.auto_campaign} className="h-4 w-4 accent-ink" />{t("market.settings.autoCampaign")}</label>
      </section>
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="text-[20px] font-bold text-ink">{t("market.settings.connections")}</h2>
        <div className="flex items-center justify-between gap-3 rounded-[3px] border border-line p-3"><span>{t("market.settings.waBusiness")}</span><span className="chip-muted shrink-0">{t("market.settings.soon")}</span></div>
        <div className="flex items-center justify-between gap-3 rounded-[3px] border border-line p-3"><span>{t("market.settings.debit")}</span><span className="chip-muted shrink-0">{t("market.settings.soon")}</span></div>
      </section>
      <div className="flex items-center gap-3">
        <button className="btn-primary px-6" disabled={pending}>{t("common.save")}</button>
        {state?.ok && <span className="text-sm text-ok">{state.ok}</span>}
        {state?.error && <span className="text-sm text-bad">{state.error}</span>}
      </div>
    </form>
  );
}
