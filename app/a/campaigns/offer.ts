import type { I18n } from "@/lib/i18n/core";
import { DEFAULT_OPTS, salePrice } from "@/lib/domain";

// The WhatsApp offer has two parts. The body (who is free and when) is the agency's to edit. The tail (price line
// with the agency's minimum placement length, and the call to action before the link) is always added by the
// server, so an edit can never drop the min_days rule from what contractors read.

type Idle = { trade: string; workerCount: number; from: string; to: string };

/** The editable opening: "Hi {name}, we have 15 formwork carpenters free from 28.10 to 10.11. All permits are valid…" */
export function offerBody({ t, fmt, intl }: Pick<I18n, "t" | "fmt" | "intl">, idle: Idle, avgRating: number) {
  const lower = (s: string) => s.toLocaleLowerCase(intl); // trade names read mid-sentence
  return [
    t(idle.from === idle.to ? "market.campaigns.offer.introDay" : "market.campaigns.offer.intro", { n: idle.workerCount, name: t("market.campaigns.nameToken"), trade: lower(fmt.trade(idle.trade)), trades: lower(fmt.trades(idle.trade)), from: fmt.date(idle.from), to: fmt.date(idle.to) }),
    avgRating ? t("market.campaigns.offer.docsRated", { avg: fmt.num(avgRating, 1) }) : t("market.campaigns.offer.docs"),
  ].join(" ");
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
