import { ALL_CITIES, TRADES, nextWorkday, todayISO, type PriceOpts } from "./domain";
import type { SearchQuery } from "./queries";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseSearch(sp: SP): SearchQuery {
  const t = one(sp.trade);
  const c = one(sp.city);
  const d = one(sp.date);
  const today = todayISO();
  const opts: PriceOpts = {
    lodging: one(sp.lodging) === "agency" ? "agency" : "contractor",
    transport: one(sp.transport) === "contractor" ? "contractor" : "agency",
    hours: Math.min(12, Math.max(4, Number(one(sp.hours)) || 9)),
  };
  return {
    trade: TRADES.some((x) => x.key === t) ? t! : "formwork",
    city: c && ALL_CITIES.includes(c) ? c : "נתניה", // i18n-data
    date: d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today ? d : nextWorkday(today),
    days: Math.min(22, Math.max(1, Number(one(sp.days)) || 1)),
    count: Math.min(20, Math.max(1, Number(one(sp.count)) || 1)),
    ...opts,
  };
}

export function toQS(q: Partial<SearchQuery> & { w?: string }) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, String(v));
  return p.toString();
}
