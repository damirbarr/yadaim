import { redirect } from "next/navigation";
import { requireContractor } from "@/lib/auth";
import { busyWorkers, displayName, docCheck, docsFor, getAgency, getContractor, getWorker } from "@/lib/queries";
import { parseSearch, toQS } from "@/lib/params";
import { get } from "@/lib/db";
import { endOfBlock } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { CheckoutForm } from "@/components/CheckoutForm";
import { parseBasket } from "@/lib/crews";
import { promoPct } from "@/lib/promotions";
import type { MessageKey } from "@/lib/i18n/core";
import { TRADES } from "@/lib/domain";
import { Notice, PageHead } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.checkout.title") };
}

export default async function Checkout({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { contractorId } = await requireContractor("contractor.book");
  const { t, fmt, intl } = await getI18n();
  const sp = await searchParams;
  const q = parseSearch(sp);
  const ids = parseBasket(sp.w);
  // Back to the search with the basket intact, so the contractor can add or remove workers.
  const back = `/c/search?${toQS({ trade: q.trade, city: q.city, date: q.date, days: q.days, count: q.count, lodging: q.lodging, transport: q.transport, w: ids.join(",") })}`;
  if (!ids.length) redirect(back);
  const c = (await getContractor(contractorId))!;
  const end = endOfBlock(q.date, q.days);
  const busy = (await busyWorkers(q.date, end));
  const docs = (await docsFor(ids));
  const found = (await Promise.all(ids.map(getWorker))).filter((w) => w && w.active && !busy.has(w.id) && docCheck(docs.get(w.id)!, w.trade, end).ok);
  const ws = (await Promise.all(found.map(async (w) => {
    const a = (await getAgency(w!.agency_id))!;
    return {
      id: w!.id, name: displayName(w!), trade: w!.trade, years: w!.years, base: w!.hourly_rate,
      // The same rule createBooking applies when it stores the rates: the whole booking inside the sale window.
      salePct: await promoPct(a.id, w!.trade, q.date, end),
      agencyId: a.id, agency: a.name, lodgingDiscount: a.lodging_discount, transportRate: a.transport_rate, photo: w!.photo, country: w!.country, docsUntil: end,
    };
  })))
    // Grouped the way the order is sent: one request per agency and trade.
    .sort((x, y) => x.agency.localeCompare(y.agency) || x.agencyId - y.agencyId || TRADES.findIndex((k) => k.key === x.trade) - TRADES.findIndex((k) => k.key === y.trade));
  const tradeCount = new Map<string, number>();
  for (const w of ws) tradeCount.set(w.trade, (tradeCount.get(w.trade) ?? 0) + 1);
  const what = tradeCount.size
    ? new Intl.ListFormat(intl, { type: "conjunction" }).format(TRADES.filter((k) => tradeCount.has(k.key)).map((k) => t(`contractor.count.${k.key}` as MessageKey, { n: tradeCount.get(k.key)! })))
    : fmt.trades(q.trade);
  const last = (await get(`SELECT address FROM bookings WHERE contractor_id = ? AND city = ? ORDER BY id DESC LIMIT 1`, contractorId, q.city)) as { address: string } | undefined;
  const dates = q.days > 1
    ? `${t("contractor.dateRange", { from: fmt.prettyDate(q.date), to: fmt.prettyDate(end) })} (${t("contractor.count.workDays", { n: q.days })})`
    : fmt.prettyDate(q.date);
  return (
    <div>
      <PageHead back={back} title={t("contractor.checkout.title")} sub={`${what} · ${fmt.city(q.city)} · ${dates}`} />
      {!c.verified && <div className="mb-4"><Notice tone="warn">{t("contractor.checkout.notVerified")}</Notice></div>}
      {ws.length < ids.length && <div className="mb-4"><Notice tone="warn">{t("contractor.checkout.someGone")}</Notice></div>}
      {ws.length === 0 ? <Notice tone="bad">{t("contractor.checkout.noneLeft")}</Notice> : (
        <CheckoutForm workers={ws} defaultAddress={last?.address ?? ""} q={{ trade: q.trade, city: q.city, date: q.date, days: q.days, lodging: q.lodging, transport: q.transport, hours: q.hours }} />
      )}
    </div>
  );
}
