"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Avatar, Rating } from "./ui";
import { ICheck, IPlus } from "./icons";

/** Raw values only (trade key, country code, doc keys); the grid formats them in the viewer's language. */
export type Hit = {
  id: number; name: string; trade: string; years: number; country: string; skills: string[];
  rating: number | null; jobs: number; arrival: number | null; match: number | null; withContractor: number;
  agency: string; agencyScore: number; agencyTier: "good" | "ok" | "warn" | "bad"; daily: number; hourly: number; docs: { key: string; soon?: boolean }[];
  photo: string | null;
};

export function ResultsGrid({ hits, qs, count, days, canBook }: { hits: Hit[]; qs: string; count: number; days: number; canBook: boolean }) {
  const { t, rich, fmt } = useI18n();
  const [sel, setSel] = useState<number[]>([]);
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chosen = hits.filter((h) => sel.includes(h.id));
  const perDay = chosen.reduce((a, h) => a + h.daily, 0);
  const money = (n: number) => fmt.money(Math.round(n));
  const b = (c: React.ReactNode) => <b className="num text-ink">{c}</b>;
  const pct = (x: number) => `${fmt.num(Math.round(x * 100))}%`;
  return (
    <>
      <div className="grid gap-x-8 border-t border-ink/15 lg:grid-cols-2">
        {hits.map((h) => {
          const on = sel.includes(h.id);
          return (
            <article key={h.id} className={`relative grid grid-cols-[56px_1fr_auto] items-center gap-x-4 gap-y-1 border-b border-dashed border-line px-2 py-4 transition ${on ? "bg-hazard-soft before:absolute before:inset-y-3 before:start-0 before:w-[3px] before:bg-ink" : ""}`}>
              <Link href={`/c/worker/${h.id}?${qs}`} className="row-span-2 self-start"><Avatar w={{ id: h.id, trade: h.trade, photo: h.photo, country: h.country }} size={56} /></Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2">
                  <Link href={`/c/worker/${h.id}?${qs}`} className="font-display text-[20px] font-bold text-ink hover:underline">{h.name}</Link>
                  {h.withContractor > 0 && <span className="chip-hazard">{t("contractor.results.workedWithYou", { n: h.withContractor })}</span>}
                </div>
                <div className="text-[14px] text-muted">{fmt.trade(h.trade)} · {t("contractor.count.yearsExp", { n: h.years })} · {fmt.country(h.country)}</div>
              </div>
              <div className="text-end">
                <div className="font-display text-[24px] font-bold leading-none text-ink num">{money(h.daily)}</div>
                <div className="text-[12px] text-muted">{t("contractor.results.perDay")}</div>
              </div>
              <div className="col-start-2 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
                  <Rating value={h.rating} count={h.jobs} />
                  {h.arrival != null && <span>{rich("contractor.results.arrival", { b }, { pct: pct(h.arrival) })}</span>}
                  {h.match != null && <span>{rich("contractor.results.match", { b }, { pct: pct(h.match) })}</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 text-[13px] font-bold">
                  {h.docs.map((d) => <span key={d.key} className={d.soon ? "text-warn" : "text-ok"}>✓ {fmt.docShort(d.key)}</span>)}
                </div>
                <div className="text-[12px] text-muted" title={t(`domain.reliability.${h.agencyTier}`)}>{rich("contractor.results.reliability", { b: (c) => <b className="num">{c}</b> }, { agency: h.agency, score: h.agencyScore })}</div>
              </div>
              <button onClick={() => toggle(h.id)} className={`self-end ${on ? "btn-primary btn-sm" : "btn-ghost btn-sm"}`} aria-pressed={on}>
                {on ? <><ICheck className="h-4 w-4" />{t("contractor.results.selected")}</> : <><IPlus className="h-4 w-4" />{t("contractor.results.add")}</>}
              </button>
            </article>
          );
        })}
      </div>

      {sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-[60px] z-40 px-3 md:bottom-4">
          <div className="blueprint mx-auto flex max-w-3xl items-center gap-3 rounded-[3px] border-b-[3px] border-hazard p-3 ps-5 shadow-2xl">
            <div className="flex -space-x-2">
              {chosen.slice(0, 4).map((h) => <Avatar key={h.id} w={{ id: h.id, trade: h.trade, photo: h.photo, country: h.country }} size={32} className="ring-2 ring-ink" />)}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-display text-[17px] font-bold">{t("contractor.results.chosen", { sel: sel.length, count })}</div>
              <div className="text-white/70">
                {days > 1
                  ? t("contractor.results.barTotal", { price: money(perDay), total: money(perDay * days), days: t("contractor.count.days", { n: days }) })
                  : t("contractor.results.barDay", { price: money(perDay) })}
              </div>
            </div>
            {canBook ? (
              <Link href={`/c/checkout?${qs}&w=${sel.join(",")}`} className="btn-hazard">{t("contractor.results.continue")}</Link>
            ) : (
              <span className="text-xs text-white/70">{t("contractor.results.notVerified")}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
