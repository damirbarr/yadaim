"use client";
import { useActionState, useState } from "react";
import { approveRequest } from "@/app/actions/agency";
import type { FormState } from "@/app/actions/auth";
import { Avatar } from "./ui";
import { TimeField } from "./DateField";

export type Cand = { id: number; name: string; trade: string; years: number; photo: string | null; requested: boolean; withContractor: number; rating: number | null; docsNote: string; docsOk: boolean; busy: boolean };

export function AssignForm({ id, cands, need, transport, defaults }: { id: number; cands: Cand[]; need: number; transport: boolean; defaults: { pickup: string } }) {
  const [sel, setSel] = useState<number[]>(cands.filter((c) => c.requested && c.docsOk && !c.busy).map((c) => c.id));
  const [state, action, pending] = useActionState<FormState, FormData>(approveRequest, undefined);
  const toggle = (c: Cand) => setSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]));
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      {sel.map((s) => <input key={s} type="hidden" name="w" value={s} />)}
      <div className="card divide-y divide-line">
        {cands.map((c) => {
          const on = sel.includes(c.id);
          const disabled = c.busy || !c.docsOk;
          return (
            <button type="button" key={c.id} disabled={disabled} onClick={() => toggle(c)} className={`flex w-full items-center gap-3 p-3 text-start transition ${on ? "bg-hazard-soft" : "hover:bg-paper"} disabled:opacity-50`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[3px] border-2 text-[11px] font-bold ${on ? "border-ink bg-ink text-white" : "border-line"}`}>{on ? "✓" : ""}</span>
              <Avatar w={{ id: c.id, trade: c.trade, photo: c.photo }} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.name} <span className="text-sm font-normal text-muted">· {c.years} שנים{c.rating ? ` · ★ ${c.rating.toFixed(1)}` : ""}</span></div>
                <div className={`text-xs ${c.docsOk ? "text-ok" : "text-bad"}`}>{c.docsNote}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {c.requested && <span className="chip-info">בחירת הקבלן</span>}
                {c.withContractor > 0 && <span className="chip-hazard">עבד אצלו {c.withContractor}×</span>}
                {c.busy && <span className="chip-bad">משובץ במקום אחר</span>}
              </div>
            </button>
          );
        })}
      </div>
      {transport && (
        <div className="card grid gap-3 p-4 sm:grid-cols-3">
          <div><label className="label">שעת איסוף</label><TimeField name="pickup_time" defaultValue={defaults.pickup} placeholder="בחירה" /></div>
          <div><label className="label">נהג</label><input name="driver_name" className="input" placeholder="אפשר גם עד 18:00 ערב לפני" /></div>
          <div><label className="label">מס׳ רכב</label><input name="vehicle_no" className="input" dir="ltr" /></div>
        </div>
      )}
      <div>
        <label className="label">הערה לקבלן (לא חובה)</label>
        <input name="agency_note" className="input" placeholder="למשל: החלפנו את ואנג בליו — אותו ותק, עבד אצלך בעבר" />
      </div>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-hazard px-6 py-3 text-base" disabled={pending || !sel.length}>אישור ושליחה לקבלן</button>
        <span className={`text-sm ${sel.length === need ? "text-muted" : "text-warn"}`}>{sel.length} מתוך {need} שובצו{sel.length !== need ? " · הקבלן יראה שהכמות שונה" : ""}</span>
      </div>
    </form>
  );
}
