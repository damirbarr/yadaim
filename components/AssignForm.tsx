"use client";
import { useActionState, useState } from "react";
import { approveRequest } from "@/app/actions/agency";
import type { FormState } from "@/app/actions/auth";
import { Avatar } from "./ui";
import { TimeField } from "./DateField";
import { useI18n } from "@/lib/i18n/client";

export type Cand = { id: number; name: string; trade: string; years: number; photo: string | null; country: string; requested: boolean; withContractor: number; rating: number | null; docsNote: string; docsOk: boolean; busy: boolean; crew?: string };
/** A crew the agency can assign in one click; `ready` = members who are free and hold valid documents for this booking. */
export type CrewOption = { id: number; name: string; size: number; ready: number[] };

export function AssignForm({ id, cands, crews = [], trade, need, transport, defaults }: { id: number; cands: Cand[]; crews?: CrewOption[]; trade?: string; need: number; transport: boolean; defaults: { pickup: string } }) {
  const { t, fmt } = useI18n();
  const [sel, setSel] = useState<number[]>(cands.filter((c) => c.requested && c.docsOk && !c.busy).map((c) => c.id));
  const [state, action, pending] = useActionState<FormState, FormData>(approveRequest, undefined);
  const toggle = (c: Cand) => setSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]));
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      {sel.map((s) => <input key={s} type="hidden" name="w" value={s} />)}
      {crews.length > 0 && (
        <div className="sheet p-4" data-testid="assign-crews">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[17px] font-bold text-ink">{t("crews.assign.title")}</h3>
            <span className="text-[12px] text-muted">{t("crews.assign.note")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {crews.map((c) => {
              const on = c.ready.length === sel.length && c.ready.every((x) => sel.includes(x));
              return (
                <button type="button" key={c.id} onClick={() => setSel(c.ready)} aria-pressed={on} data-crew={c.id} className={on ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
                  {c.name} <span className="font-normal opacity-80">· {c.ready.length === c.size ? t("crews.members", { n: c.size }) : t("crews.assign.ready", { ready: c.ready.length, n: c.size })}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="card divide-y divide-line">
        {cands.map((c) => {
          const on = sel.includes(c.id);
          const disabled = c.busy || !c.docsOk;
          return (
            <button type="button" key={c.id} disabled={disabled} onClick={() => toggle(c)} className={`flex w-full items-center gap-3 p-3 text-start transition ${on ? "bg-hazard-soft" : "hover:bg-paper"} disabled:opacity-50`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[3px] border-2 text-[11px] font-bold ${on ? "border-ink bg-ink text-white" : "border-line"}`}>{on ? "✓" : ""}</span>
              <Avatar w={{ id: c.id, trade: c.trade, photo: c.photo, country: c.country }} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.name} <span className="text-sm font-normal text-muted">{trade && c.trade !== trade ? `· ${fmt.trade(c.trade)} ` : ""}· {t("agency.years", { n: c.years })}{c.rating ? ` · ${t("agency.assign.rating", { r: fmt.num(c.rating, 1) })}` : ""}</span></div>
                <div className={`text-xs ${c.docsOk ? "text-ok" : "text-bad"}`}>{c.docsNote}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {c.crew && <span className="chip-muted">{c.crew}</span>}
                {c.requested && <span className="chip-info">{t("agency.assign.contractorPick")}</span>}
                {c.withContractor > 0 && <span className="chip-hazard">{t("agency.assign.workedWith", { n: c.withContractor })}</span>}
                {c.busy && <span className="chip-bad">{t("agency.assign.busy")}</span>}
              </div>
            </button>
          );
        })}
      </div>
      {transport && (
        <div className="card grid gap-3 p-4 sm:grid-cols-3">
          <div><label className="label">{t("agency.assign.pickup")}</label><TimeField name="pickup_time" defaultValue={defaults.pickup} placeholder={t("agency.assign.pickupPlaceholder")} /></div>
          <div><label className="label" htmlFor="assign-driver">{t("agency.assign.driver")}</label><input id="assign-driver" name="driver_name" className="input" placeholder={t("agency.assign.driverPlaceholder")} /></div>
          <div><label className="label" htmlFor="assign-vehicle">{t("agency.assign.vehicle")}</label><input id="assign-vehicle" name="vehicle_no" className="input" dir="ltr" /></div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="assign-note">{t("agency.assign.note")}</label>
        <input id="assign-note" name="agency_note" className="input" placeholder={t("agency.assign.notePlaceholder")} />
      </div>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-hazard px-6 py-3 text-base" disabled={pending || !sel.length}>{t("agency.assign.submit")}</button>
        <span className={`text-sm ${sel.length === need ? "text-muted" : "text-warn"}`}>{t("agency.assign.count", { sel: sel.length, need })}{sel.length !== need ? ` · ${t("agency.assign.countDiff")}` : ""}</span>
      </div>
    </form>
  );
}
