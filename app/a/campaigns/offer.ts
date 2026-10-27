import type { I18n } from "@/lib/i18n/core";

// The WhatsApp offer has two parts. The body (who is free and when) is the agency's to edit. The tail (price line
// with the agency's minimum placement length, and the call to action before the link) is always added by the
// server, so an edit can never drop the min_days rule from what contractors read.

type Idle = { trade: string; workerCount: number; from: string; to: string };

/** The editable opening: "Hi {name}, we have 15 formwork carpenters free from 28.10 to 10.11. All permits are valid…" */
export function offerBody({ t, fmt, intl }: Pick<I18n, "t" | "fmt" | "intl">, idle: Idle, avgRating: number) {
  const lower = (s: string) => s.toLocaleLowerCase(intl); // trade names read mid-sentence
  return [
    t("market.campaigns.offer.intro", { n: idle.workerCount, name: t("market.campaigns.nameToken"), trade: lower(fmt.trade(idle.trade)), trades: lower(fmt.trades(idle.trade)), from: fmt.date(idle.from), to: fmt.date(idle.to) }),
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
