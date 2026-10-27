"use client";
import { useActionState } from "react";
import { saveWorker } from "@/app/actions/agency";
import type { FormState } from "@/app/actions/auth";
import { COUNTRIES, DOC_TYPES, TRADES } from "@/lib/domain";
import { FileField } from "./FileField";
import { DateField } from "./DateField";

type W = { id?: number; first_name?: string; last_name?: string; trade?: string; years?: number; country?: string; phone?: string | null; passport_no?: string | null; hourly_rate?: number; skills?: string | null };
type D = Record<string, { expires: string | null; number: string | null; file: string | null } | undefined>;

export function WorkerForm({ w = {}, docs = {}, readOnly = false }: { w?: W; docs?: D; readOnly?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveWorker, undefined);
  return (
    <form action={action} className="space-y-5" encType="multipart/form-data">
      <fieldset disabled={readOnly} className="space-y-5">
      {w.id && <input type="hidden" name="id" value={w.id} />}
      <section className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-[20px] font-bold text-ink sm:col-span-2 lg:col-span-3">פרטי העובד</h2>
        <div><label className="label">שם פרטי</label><input name="first_name" className="input" defaultValue={w.first_name} required /></div>
        <div><label className="label">שם משפחה</label><input name="last_name" className="input" defaultValue={w.last_name} required /></div>
        <div><label className="label">תמונה (הקבלן רואה אותה)</label><FileField name="photo" accept="image/*" capture="environment" /></div>
        <div><label className="label">מקצוע</label><select name="trade" className="input" defaultValue={w.trade ?? "formwork"}>{TRADES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
        <div><label className="label">שנות ניסיון</label><input name="years" type="number" min={0} max={50} className="input" defaultValue={w.years ?? 5} /></div>
        <div><label className="label">תעריף שעתי לקבלן (₪, כולל לינה אצלכם)</label><input name="hourly_rate" type="number" min={40} max={200} step={0.5} className="input" defaultValue={w.hourly_rate ?? 75} /></div>
        <div><label className="label">ארץ מוצא</label><select name="country" className="input" defaultValue={w.country ?? "IN"}>{Object.entries(COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label className="label">טלפון (וואטסאפ)</label><input name="phone" className="input" dir="ltr" defaultValue={w.phone ?? ""} /></div>
        <div><label className="label">מספר דרכון</label><input name="passport_no" className="input" dir="ltr" defaultValue={w.passport_no ?? ""} /></div>
        <div className="sm:col-span-2"><label className="label">מיומנויות (מופרד בפסיקים)</label><input name="skills" className="input" defaultValue={w.skills ?? ""} placeholder="טפסנות קירות, תקרות, עמודים" /></div>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-[20px] font-bold text-ink">אישורים ומסמכים</h2>
        <p className="mb-4 text-xs text-muted">תאריך תוקף + צילום. התראה אוטומטית 60 יום לפני פקיעה.</p>
        <div className="space-y-3">
          {DOC_TYPES.map((d) => (
            <div key={d.key} className="grid items-end gap-2 border-b border-line pb-3 last:border-0 sm:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
              <div className="text-sm font-medium">{d.label}{docs[d.key]?.file && <a href={`/api/files/${docs[d.key]!.file}`} target="_blank" className="ms-2 text-xs text-info underline">קובץ קיים</a>}</div>
              <div><label className="label">מספר</label><input name={`doc_${d.key}_number`} className="input py-2" dir="ltr" defaultValue={docs[d.key]?.number ?? ""} /></div>
              <div><label className="label">בתוקף עד</label><DateField name={`doc_${d.key}_expires`} className="py-2" defaultValue={docs[d.key]?.expires ?? ""} /></div>
              <div><label className="label">צילום או קובץ סרוק</label><FileField name={`doc_${d.key}_file`} accept="image/*,.pdf" small /></div>
            </div>
          ))}
        </div>
      </section>
      </fieldset>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {readOnly ? <p className="text-sm text-muted">צפייה בלבד — אין לך הרשאה לערוך עובדים.</p> : <button className="btn-primary px-6" disabled={pending}>{pending ? "שומר…" : "שמירה"}</button>}
    </form>
  );
}
