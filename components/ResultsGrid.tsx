"use client";
import { Availability } from "./Availability";
import type { WorkerAvailability } from "@/lib/calendar";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { TRADES } from "@/lib/domain";
import { Avatar, Rating } from "./ui";
import { ICheck, IPlus } from "./icons";
import type { BasketItem, CrewHit } from "@/lib/crews";

/** Raw values only (trade key, country code, doc keys); the grid formats them in the viewer's language. */
export type Hit = {
  id: number; name: string; trade: string; years: number; country: string; skills: string[];
  rating: number | null; jobs: number; arrival: number | null; match: number | null; withContractor: number;
  agency: string; agencyScore: number; agencyTier: "good" | "ok" | "warn" | "bad"; daily: number; hourly: number; docs: { key: string; soon?: boolean }[];
  photo: string | null;
  avail?: WorkerAvailability;
};
type Item = { id: number; name: string; trade: string; photo: string | null; country: string; daily: number };

/**
 * Search results plus the contractor's basket. The basket is the `w=` list in the URL: it's kept in sync with
 * history.replaceState (no server round trip), carried by the trade tabs and the search form, and survives reloads.
 * Search is one trade at a time; the basket can hold several trades and agencies, and checkout splits it.
 */
export function ResultsGrid({ hits, crews = [], basket = [], trade, qs, count, days, canBook, empty }: {
  hits: Hit[]; crews?: CrewHit[]; basket?: BasketItem[]; trade: string; qs: string; count: number; days: number; canBook: boolean; empty?: ReactNode;
}) {
  const { t, rich, fmt, intl } = useI18n();
  const sp = useSearchParams();
  const [sel, setSel] = useState<number[]>(() => basket.map((b) => b.id));
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (sel.length) p.set("w", sel.join(",")); else p.delete("w");
      const next = `${window.location.pathname}?${p.toString()}`;
      if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, "", next);
    } catch {}
  }, [sel]);

  // Everything we know a price and face for: the basket from other searches, this search, and crews shown here.
  const known = new Map<number, Item>();
  for (const b of basket) known.set(b.id, b);
  for (const c of crews) for (const m of c.members) known.set(m.id, m);
  for (const h of hits) known.set(h.id, h);
  const chosen = sel.map((id) => known.get(id)).filter((x): x is Item => !!x);
  const perDay = chosen.reduce((a, h) => a + h.daily, 0);
  const byTrade = new Map<string, number>();
  for (const c of chosen) byTrade.set(c.trade, (byTrade.get(c.trade) ?? 0) + 1);
  const summary = new Intl.ListFormat(intl, { type: "conjunction" }).format(
    TRADES.filter((tr) => byTrade.has(tr.key)).map((tr) => t(`contractor.count.${tr.key}` as MessageKey, { n: byTrade.get(tr.key)! }))
  );
  const money = (n: number) => fmt.money(Math.round(n));
  const b = (c: React.ReactNode) => <b className="num text-ink">{c}</b>;
  const pct = (x: number) => `${fmt.num(Math.round(x * 100))}%`;
  const crewOn = (c: CrewHit) => c.members.every((m) => sel.includes(m.id));
  const toggleCrew = (c: CrewHit) => {
    const ids = c.members.map((m) => m.id);
    setSel((s) => (crewOn(c) ? s.filter((x) => !ids.includes(x)) : [...s, ...ids.filter((x) => !s.includes(x))]));
  };
  const tabHref = (k: string) => {
    const p = new URLSearchParams(sp.toString());
    p.set("trade", k);
    if (sel.length) p.set("w", sel.join(",")); else p.delete("w");
    return `/c/search?${p.toString()}`;
  };

  return (
    <>
      {/* One tap to another trade, keeping dates, city and the basket. */}
      <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" aria-label={t("contractor.results.tradesNav")}>
        {TRADES.map((tr) => {
          const n = byTrade.get(tr.key) ?? 0;
          return (
            <Link key={tr.key} href={tabHref(tr.key)} scroll={false} data-trade={tr.key} aria-current={tr.key === trade ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap ${tr.key === trade ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}`}>
              {fmt.trades(tr.key)}
              {n > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-white" title={t("contractor.results.tabSelected", { n })}>{n}</span>}
            </Link>
          );
        })}
      </nav>

      {crews.length > 0 && (
        <section className="sheet" data-testid="crew-results">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-3">
            <h2 className="text-[20px] font-bold text-ink">{t("crews.search.title", { n: crews.length })}</h2>
            <span className="text-[13px] text-muted">{t("crews.search.note")}</span>
          </div>
          <div className="grid lg:grid-cols-2">
            {crews.map((c) => {
              const on = crewOn(c);
              const trades = [...new Set(c.members.map((m) => m.trade))];
              return (
                // Not an <article>: the individual result cards are articles, and tests count them.
                <div key={c.id} data-crew={c.id} className={`relative space-y-3 border-b border-dashed border-line p-4 lg:odd:border-e ${on ? "bg-hazard-soft before:absolute before:inset-y-3 before:start-0 before:w-[3px] before:bg-ink" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display text-[21px] font-bold leading-tight text-ink">{c.name}</div>
                      <div className="text-[13px] text-muted">
                        {t("crews.members", { n: c.members.length })} · {rich("contractor.results.reliability", { b: (x) => <b className="num">{x}</b> }, { agency: c.agency, score: c.agencyScore })}
                      </div>
                      {trades.length > 1 && <div className="text-[12px] text-muted">{trades.map((k) => t(`contractor.count.${k}` as MessageKey, { n: c.members.filter((m) => m.trade === k).length })).join(" · ")}</div>}
                    </div>
                    <div className="shrink-0 text-end">
                      <div className="font-display text-[24px] font-bold leading-none text-ink num">{money(c.daily)}</div>
                      <div className="text-[12px] text-muted">{t("crews.search.perDay")}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.members.map((m) => {
                      const mOn = sel.includes(m.id);
                      return (
                        <button type="button" key={m.id} onClick={() => toggle(m.id)} aria-pressed={mOn} title={mOn ? t("crews.search.removeOne") : t("crews.search.addOne")}
                          className={`flex items-center gap-1.5 rounded-[3px] border py-1 pe-2.5 ps-1 text-start text-[13px] leading-tight transition ${mOn ? "border-ink bg-white" : "border-line bg-paper hover:border-ink/40"}`}>
                          <Avatar w={m} size={28} />
                          <span>
                            <span className="block font-semibold">{m.name}</span>
                            <span className="block text-[11px] text-muted">{fmt.trade(m.trade)}{m.leader ? ` · ${t("crews.leader")}` : ""}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] text-muted">{c.members.length > count ? t("crews.search.bigger", { n: c.members.length, count }) : t("crews.search.docsOk")}</span>
                    <button type="button" onClick={() => toggleCrew(c)} className={on ? "btn-primary btn-sm" : "btn-ghost btn-sm"} aria-pressed={on} data-testid="add-crew">
                      {on ? <><ICheck className="h-4 w-4" />{t("crews.search.selected")}</> : <><IPlus className="h-4 w-4" />{t("crews.search.add")}</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {crews.length > 0 && hits.length > 0 && <h2 className="pt-2 text-[20px] font-bold text-ink">{t("crews.search.individuals")}</h2>}

      {hits.length === 0 ? empty : (
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
                  <Availability a={h.avail} className="mt-1" />
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
                <button type="button" onClick={() => toggle(h.id)} className={`self-end ${on ? "btn-primary btn-sm" : "btn-ghost btn-sm"}`} aria-pressed={on}>
                  {on ? <><ICheck className="h-4 w-4" />{t("contractor.results.selected")}</> : <><IPlus className="h-4 w-4" />{t("contractor.results.add")}</>}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {chosen.length > 0 && <div className="h-36" aria-hidden />}
      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-[60px] z-40 px-3 md:bottom-4">
          <div className="blueprint mx-auto max-w-3xl rounded-[3px] border-b-[3px] border-hazard p-3 ps-4 shadow-2xl" data-testid="basket">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-display text-[17px] font-bold leading-tight">{t("contractor.results.chosen", { list: summary })}</div>
                <div className="text-white/70">
                  {days > 1
                    ? t("contractor.results.barTotal", { price: money(perDay), total: money(perDay * days), days: t("contractor.count.days", { n: days }) })
                    : t("contractor.results.barDay", { price: money(perDay) })}
                </div>
              </div>
              {canBook ? (
                <Link href={`/c/checkout?${qs}&w=${chosen.map((c) => c.id).join(",")}`} className="btn-hazard shrink-0">{t("contractor.results.continue")}</Link>
              ) : (
                <span className="text-xs text-white/70">{t("contractor.results.notVerified")}</span>
              )}
            </div>
            <ul className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
              {chosen.map((c) => (
                <li key={c.id} className="flex shrink-0 items-center gap-1.5 rounded-[3px] border border-white/25 py-0.5 pe-0.5 ps-1 text-[12px]">
                  <Avatar w={c} size={22} />
                  <span className="whitespace-nowrap">{c.name} · <span className="text-white/60">{fmt.trade(c.trade)}</span></span>
                  <button type="button" onClick={() => toggle(c.id)} className="grid h-6 w-6 place-items-center text-white/70 hover:text-hazard" aria-label={t("contractor.results.remove", { name: c.name })} data-remove={c.id}>✕</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
