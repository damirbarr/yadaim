"use client";
import { useActionState, useState } from "react";
import { saveAgencyCrew } from "@/app/actions/crews";
import type { FormState } from "@/app/actions/auth";
import { TRADES } from "@/lib/domain";
import { useI18n } from "@/lib/i18n/client";
import { Avatar } from "@/components/ui";

export type CrewCand = { id: number; name: string; trade: string; years: number; photo: string | null; country: string };

export function CrewForm({ crew, cands }: { crew?: { id: number; name: string; leader: number | null; members: number[] }; cands: CrewCand[] }) {
  const { t, fmt } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(saveAgencyCrew, undefined);
  const [sel, setSel] = useState<number[]>(crew?.members ?? []);
  const [leader, setLeader] = useState<number | "">(crew?.leader ?? "");
  const [trade, setTrade] = useState<string>("");
  const toggle = (id: number) => {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    if (leader === id) setLeader("");
  };
  const trades = TRADES.filter((tr) => cands.some((c) => c.trade === tr.key));
  // Chosen workers stay visible under any trade filter, so it's always clear who is in the crew.
  const shown = cands.filter((c) => !trade || c.trade === trade || sel.includes(c.id));
  const chosen = cands.filter((c) => sel.includes(c.id));
  return (
    <form action={action} className="space-y-5">
      {crew && <input type="hidden" name="id" value={crew.id} />}
      {sel.map((id) => <input key={id} type="hidden" name="w" value={id} />)}
      <section className="sheet grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="crew-name">{t("crews.form.name")}</label>
          <input id="crew-name" name="name" className="input" defaultValue={crew?.name ?? ""} placeholder={t("crews.form.namePlaceholder")} maxLength={60} required />
        </div>
        <div>
          <label className="label" htmlFor="crew-leader">{t("crews.form.leader")}</label>
          <select id="crew-leader" name="leader" className="input" value={leader} onChange={(e) => setLeader(e.target.value ? Number(e.target.value) : "")}>
            <option value="">{t("crews.form.noLeader")}</option>
            {chosen.map((c) => <option key={c.id} value={c.id}>{c.name} · {fmt.trade(c.trade)}</option>)}
          </select>
          {!chosen.length && <p className="mt-1 text-xs text-muted">{t("crews.form.leaderHint")}</p>}
        </div>
      </section>

      <section className="sheet">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="text-[20px] font-bold text-ink">{t("crews.form.members")}</h2>
          <span className={`text-sm ${sel.length >= 2 ? "text-muted" : "text-warn"}`} data-testid="crew-count">{t("crews.form.chosen", { n: sel.length })}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 px-5 pt-3">
          <button type="button" onClick={() => setTrade("")} className={!trade ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{t("crews.form.allTrades")}</button>
          {trades.map((tr) => <button type="button" key={tr.key} onClick={() => setTrade(tr.key)} className={trade === tr.key ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{fmt.trades(tr.key)}</button>)}
        </div>
        {cands.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">{t("crews.form.noCands")}</p>
        ) : (
          <div className="divide-y divide-dashed divide-line px-2 py-2">
            {shown.map((c) => {
              const on = sel.includes(c.id);
              return (
                <button type="button" key={c.id} onClick={() => toggle(c.id)} aria-pressed={on} data-worker={c.id}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-start transition ${on ? "bg-hazard-soft" : "hover:bg-paper"}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[3px] border-2 text-[11px] font-bold ${on ? "border-ink bg-ink text-white" : "border-line"}`}>{on ? "✓" : ""}</span>
                  <Avatar w={c} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.name}{leader === c.id && <span className="chip-hazard ms-2">{t("crews.leader")}</span>}</span>
                    <span className="block text-xs text-muted">{fmt.trade(c.trade)} · {t("agency.years", { n: c.years })}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="border-t border-line px-5 py-3 text-xs text-muted">{t("crews.form.membersHint")}</p>
      </section>

      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn-primary px-6" disabled={pending}>{pending ? t("crews.form.saving") : crew ? t("common.save") : t("crews.form.create")}</button>
    </form>
  );
}
