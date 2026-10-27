"use client";
import { useActionState } from "react";
import { saveWorker } from "@/app/actions/agency";
import type { FormState } from "@/app/actions/auth";
import { COUNTRIES, DOC_TYPES, TRADES } from "@/lib/domain";
import { useI18n } from "@/lib/i18n/client";
import { FileField } from "./FileField";
import { DateField } from "./DateField";

type W = { id?: number; first_name?: string; last_name?: string; trade?: string; years?: number; country?: string; phone?: string | null; passport_no?: string | null; hourly_rate?: number; skills?: string | null };
type D = Record<string, { expires: string | null; number: string | null; file: string | null } | undefined>;

export function WorkerForm({ w = {}, docs = {}, readOnly = false }: { w?: W; docs?: D; readOnly?: boolean }) {
  const { t, fmt } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(saveWorker, undefined);
  return (
    <form action={action} className="space-y-5">
      <fieldset disabled={readOnly} className="space-y-5">
      {w.id && <input type="hidden" name="id" value={w.id} />}
      <section className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-[20px] font-bold text-ink sm:col-span-2 lg:col-span-3">{t("agency.form.details")}</h2>
        <div><label className="label" htmlFor="wf-first">{t("agency.form.firstName")}</label><input id="wf-first" name="first_name" className="input" defaultValue={w.first_name} required /></div>
        <div><label className="label" htmlFor="wf-last">{t("agency.form.lastName")}</label><input id="wf-last" name="last_name" className="input" defaultValue={w.last_name} required /></div>
        <div><label className="label">{t("agency.form.photo")}</label><FileField name="photo" accept="image/*" capture="environment" /></div>
        <div><label className="label" htmlFor="wf-trade">{t("agency.form.trade")}</label><select id="wf-trade" name="trade" className="input" defaultValue={w.trade ?? "formwork"}>{TRADES.map((x) => <option key={x.key} value={x.key}>{fmt.trade(x.key)}</option>)}</select></div>
        <div><label className="label" htmlFor="wf-years">{t("agency.form.years")}</label><input id="wf-years" name="years" type="number" min={0} max={50} className="input" defaultValue={w.years ?? 5} /></div>
        <div><label className="label" htmlFor="wf-rate">{t("agency.form.rate")}</label><input id="wf-rate" name="hourly_rate" type="number" min={40} max={200} step={0.5} className="input" defaultValue={w.hourly_rate ?? 75} /></div>
        <div><label className="label" htmlFor="wf-country">{t("agency.form.country")}</label><select id="wf-country" name="country" className="input" defaultValue={w.country ?? "IN"}>{Object.keys(COUNTRIES).map((k) => <option key={k} value={k}>{fmt.country(k)}</option>)}</select></div>
        <div><label className="label" htmlFor="wf-phone">{t("agency.form.phone")}</label><input id="wf-phone" name="phone" className="input" dir="ltr" defaultValue={w.phone ?? ""} /></div>
        <div><label className="label" htmlFor="wf-passport">{t("agency.form.passport")}</label><input id="wf-passport" name="passport_no" className="input" dir="ltr" defaultValue={w.passport_no ?? ""} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="wf-skills">{t("agency.form.skills")}</label><input id="wf-skills" name="skills" className="input" defaultValue={w.skills ?? ""} placeholder={t("agency.form.skillsPlaceholder")} /></div>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-[20px] font-bold text-ink">{t("agency.form.docsTitle")}</h2>
        <p className="mb-4 text-xs text-muted">{t("agency.form.docsHint")}</p>
        <div className="space-y-3">
          {DOC_TYPES.map((d) => (
            <div key={d.key} className="grid items-end gap-2 border-b border-line pb-3 last:border-0 sm:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
              <div className="text-sm font-medium">{fmt.doc(d.key)}{docs[d.key]?.file && <a href={`/api/files/${docs[d.key]!.file}`} target="_blank" className="ms-2 text-xs text-info underline">{t("agency.form.existingFile")}</a>}</div>
              <div><label className="label">{t("agency.form.number")}</label><input name={`doc_${d.key}_number`} className="input py-2" dir="ltr" defaultValue={docs[d.key]?.number ?? ""} /></div>
              <div><label className="label">{t("agency.form.expires")}</label><DateField name={`doc_${d.key}_expires`} className="py-2" defaultValue={docs[d.key]?.expires ?? ""} /></div>
              <div><label className="label">{t("agency.form.scan")}</label><FileField name={`doc_${d.key}_file`} accept="image/*,.pdf" small /></div>
            </div>
          ))}
        </div>
      </section>
      </fieldset>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {readOnly ? <p className="text-sm text-muted">{t("agency.form.readOnly")}</p> : <button className="btn-primary px-6" disabled={pending}>{pending ? t("agency.form.saving") : t("common.save")}</button>}
    </form>
  );
}
