"use client";
import { useActionState } from "react";
import { saveSettings } from "@/app/actions/agency";
import type { FormState } from "@/app/actions/auth";
import { MIN_DAYS_OPTIONS, REGIONS } from "@/lib/domain";

type A = { name: string; phone: string | null; about: string | null; regions: string; min_days: number; lodging_discount: number; transport_rate: number; auto_campaign: number };

export function SettingsForm({ a }: { a: A }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, undefined);
  return (
    <form action={action} className="space-y-5">
      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="text-[20px] font-bold text-ink sm:col-span-2">פרופיל התאגיד</h2>
        <div><label className="label">שם</label><input name="name" className="input" defaultValue={a.name} required /></div>
        <div><label className="label">טלפון</label><input name="phone" className="input" dir="ltr" defaultValue={a.phone ?? ""} /></div>
        <div className="sm:col-span-2"><label className="label">על התאגיד (מוצג לקבלנים)</label><textarea name="about" rows={2} className="input" defaultValue={a.about ?? ""} /></div>
        <fieldset className="sm:col-span-2">
          <legend className="label">אזורי הצבה</legend>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <label key={r.key} className="chip-muted cursor-pointer px-3 py-1.5 has-[:checked]:bg-ink has-[:checked]:text-white">
                <input type="checkbox" name="regions" value={r.key} defaultChecked={a.regions.split(",").includes(r.key)} className="sr-only" />{r.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>
      <section className="card grid gap-3 p-5 sm:grid-cols-3">
        <h2 className="text-[20px] font-bold text-ink sm:col-span-3">תמחור והצבה</h2>
        <div>
          <label className="label">משך הצבה מינימלי</label>
          <select name="min_days" className="input" defaultValue={a.min_days}>{MIN_DAYS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
          <p className="mt-1 text-xs text-muted">עד לקבלת חוות דעת משפטית על הצבה יומית אפשר לקבוע מינימום שבועי.</p>
        </div>
        <div><label className="label">הנחה ללינה אצל הקבלן (₪ לשעה)</label><input name="lodging_discount" type="number" step="0.5" min="0" className="input" defaultValue={a.lodging_discount} /></div>
        <div><label className="label">תוספת הסעה (₪ לשעה)</label><input name="transport_rate" type="number" step="0.5" min="0" className="input" defaultValue={a.transport_rate} /></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="auto_campaign" defaultChecked={!!a.auto_campaign} className="h-4 w-4 accent-ink" />להכין הצעה אוטומטית כשיש ימים פנויים (נשלחת רק אחרי אישור שלכם)</label>
      </section>
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="text-[20px] font-bold text-ink">חיבורים</h2>
        <div className="flex items-center justify-between rounded-[3px] border border-line p-3"><span>וואטסאפ עסקי — שליחה אוטומטית של הצעות ובקשות חידוש</span><span className="chip-muted">בקרוב</span></div>
        <div className="flex items-center justify-between rounded-[3px] border border-line p-3"><span>הוראת קבע לתשלום המנוי</span><span className="chip-muted">בקרוב</span></div>
      </section>
      <div className="flex items-center gap-3">
        <button className="btn-primary px-6" disabled={pending}>שמירה</button>
        {state?.ok && <span className="text-sm text-ok">{state.ok}</span>}
        {state?.error && <span className="text-sm text-bad">{state.error}</span>}
      </div>
    </form>
  );
}
