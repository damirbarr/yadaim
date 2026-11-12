import type { I18n } from "@/lib/i18n/core";
import { DEFAULT_OPTS, salePrice } from "@/lib/domain";

// The WhatsApp offer has two parts. The body (who is free and when) is the agency's to edit. The tail (price line
// with the agency's minimum placement length, and the call to action before the link) is always added by the
// server, so an edit can never drop the min_days rule from what contractors read.

type Idle = { trade: string; workerCount: number; from: string; to: string };

/** An offer about specific people: one crew, or workers the agency picked. */
export type GroupOffer = { kind: "crew" | "workers"; crew?: string; people: { name: string; trade: string }[]; from: string; to: string };

/**
 * The first run of consecutive work days on which everyone is free: starts at the first day all of them are free
 * and stops at the first day one of them isn't. `days` is the work-day horizon, `free` each person's free days.
 * Shared by the offer builder (live, in the browser) and createCampaign (which recomputes it, never trusting the form).
 */
export function commonRun(days: string[], free: string[][]): { from: string; to: string; workDays: number } | null {
  if (!free.length) return null;
  const sets = free.map((f) => new Set(f));
  const all = (d: string) => sets.every((s) => s.has(d));
  const start = days.findIndex(all);
  if (start < 0) return null;
  let end = start;
  while (end + 1 < days.length && all(days[end + 1])) end++;
  return { from: days[start], to: days[end], workDays: end - start + 1 };
}

/** The editable opening: "Hi {name}, we have 15 formwork carpenters free from 28.10 to 10.11. All permits are valid…" */
export function offerBody({ t, fmt, intl }: Pick<I18n, "t" | "fmt" | "intl">, idle: Idle, avgRating: number) {
  const lower = (s: string) => s.toLocaleLowerCase(intl); // trade names read mid-sentence
  return [
    t(idle.from === idle.to ? "market.campaigns.offer.introDay" : "market.campaigns.offer.intro", { n: idle.workerCount, name: t("market.campaigns.nameToken"), trade: lower(fmt.trade(idle.trade)), trades: lower(fmt.trades(idle.trade)), from: fmt.date(idle.from), to: fmt.date(idle.to) }),
    avgRating ? t("market.campaigns.offer.docsRated", { avg: fmt.num(avgRating, 1) }) : t("market.campaigns.offer.docs"),
  ].join(" ");
}

/** The editable opening for a crew or picked workers: who they are and when they are free together. */
export function offerGroupBody({ t, fmt, intl }: Pick<I18n, "t" | "fmt" | "intl">, g: GroupOffer, avgRating: number) {
  const lower = (s: string) => s.toLocaleLowerCase(intl);
  const name = t("market.campaigns.nameToken");
  const one = g.from === g.to;
  const vars = { name, n: g.people.length, from: fmt.date(g.from), to: fmt.date(g.to) };
  let intro: string;
  if (g.kind === "crew") {
    // "3 formwork carpenters, 1 steel fixer": the trades in the crew, most common first
    const counts = new Map<string, number>();
    for (const p of g.people) counts.set(p.trade, (counts.get(p.trade) ?? 0) + 1);
    const mix = [...counts].sort((a, b) => b[1] - a[1]).map(([tr, n]) => (n === 1 ? t("market.campaigns.offer.mixOne", { trade: lower(fmt.trade(tr)) }) : t("market.campaigns.offer.mixMany", { n, trades: lower(fmt.trades(tr)) }))).join(", ");
    intro = t(one ? "market.campaigns.offer.crewDay" : "market.campaigns.offer.crew", { ...vars, crew: g.crew ?? "", mix });
  } else {
    const shown = g.people.slice(0, 6).map((p) => t("market.campaigns.offer.person", { name: p.name, trade: lower(fmt.trade(p.trade)) }));
    if (g.people.length > 6) shown.push(t("market.campaigns.offer.andMore", { n: g.people.length - 6 }));
    intro = t(one ? "market.campaigns.offer.workersDay" : "market.campaigns.offer.workers", { ...vars, list: shown.join(", ") });
  }
  return [intro, avgRating ? t("market.campaigns.offer.docsRated", { avg: fmt.num(avgRating, 1) }) : t("market.campaigns.offer.docs")].join(" ");
}

/** The fixed closing: price terms (with the minimum placement length) and the line that leads into the link. */
export function offerTail({ t, fmt, intl }: Pick<I18n, "t" | "fmt" | "intl">, minDays: number) {
  const lower = (s: string) => s.toLocaleLowerCase(intl);
  return [
    minDays > 1 ? t("market.campaigns.offer.priceMin", { min: lower(fmt.minDays(minDays)) }) : t("market.campaigns.offer.priceOneDay"),
    t("market.campaigns.offer.cta"),
  ].join(" ");
}

/** What the sale step needs: the discount, its dates and the regular all-in hourly price range of the workers offered. */
export type Sale = { pct: number; from: string; to: string; low: number; high: number };

/** Regular and sale price for one worker-day at the search defaults (9 hours, transport by the agency, lodging by the contractor). */
export function saleDay(s: Pick<Sale, "pct" | "low">) {
  const h = DEFAULT_OPTS.hours;
  return { was: Math.round(s.low * h), now: Math.round(salePrice(s.low, s.pct) * h) };
}

/**
 * The sale line, added by the server between the body and the tail so it always states the real price and dates.
 * Workers on different rates get "pct off, from ₪X" instead of one price that would be wrong for some of them.
 */
export function offerSale({ t, fmt }: Pick<I18n, "t" | "fmt">, s: Sale) {
  const { was, now } = saleDay(s);
  const vars = { pct: s.pct, from: fmt.date(s.from), to: fmt.date(s.to), was: fmt.money(was), now: fmt.money(now) };
  const one = s.from === s.to;
  if (s.low === s.high) return one ? t("market.campaigns.offer.saleDay", vars) : t("market.campaigns.offer.saleDays", vars);
  return one ? t("market.campaigns.offer.saleDayFrom", vars) : t("market.campaigns.offer.saleDaysFrom", vars);
}
