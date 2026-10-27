import { redirect } from "next/navigation";
import { requireContractor } from "@/lib/auth";
import { busyWorkers, displayName, docCheck, docsFor, getAgency, getContractor, getWorker } from "@/lib/queries";
import { parseSearch, toQS } from "@/lib/params";
import { get } from "@/lib/db";
import { endOfBlock } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Notice, PageHead } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.checkout.title") };
}

export default async function Checkout({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { contractorId } = await requireContractor("contractor.book");
  const { t, fmt } = await getI18n();
  const sp = await searchParams;
  const q = parseSearch(sp);
  const ids = String(sp.w ?? "").split(",").map(Number).filter(Boolean).slice(0, 20);
  const back = `/c/search?${toQS({ trade: q.trade, city: q.city, date: q.date, days: q.days, count: q.count, lodging: q.lodging, transport: q.transport })}`;
  if (!ids.length) redirect(back);
  const c = (await getContractor(contractorId))!;
  const end = endOfBlock(q.date, q.days);
  const busy = (await busyWorkers(q.date, end));
  const docs = (await docsFor(ids));
  const found = (await Promise.all(ids.map(getWorker))).filter((w) => w && w.active && !busy.has(w.id) && docCheck(docs.get(w.id)!, w.trade, end).ok);
  const ws = await Promise.all(found.map(async (w) => {
    const a = (await getAgency(w!.agency_id))!;
    return {
      id: w!.id, name: displayName(w!), trade: w!.trade, years: w!.years, base: w!.hourly_rate,
      agencyId: a.id, agency: a.name, lodgingDiscount: a.lodging_discount, transportRate: a.transport_rate, photo: w!.photo, country: w!.country, docsUntil: end,
    };
  }));
  const last = (await get(`SELECT address FROM bookings WHERE contractor_id = ? AND city = ? ORDER BY id DESC LIMIT 1`, contractorId, q.city)) as { address: string } | undefined;
  const dates = q.days > 1
    ? `${t("contractor.dateRange", { from: fmt.prettyDate(q.date), to: fmt.prettyDate(end) })} (${t("contractor.count.workDays", { n: q.days })})`
    : fmt.prettyDate(q.date);
  return (
    <div>
      <PageHead back={back} title={t("contractor.checkout.title")} sub={`${fmt.trades(q.trade)} · ${fmt.city(q.city)} · ${dates}`} />
      {!c.verified && <div className="mb-4"><Notice tone="warn">{t("contractor.checkout.notVerified")}</Notice></div>}
      {ws.length < ids.length && <div className="mb-4"><Notice tone="warn">{t("contractor.checkout.someGone")}</Notice></div>}
      {ws.length === 0 ? <Notice tone="bad">{t("contractor.checkout.noneLeft")}</Notice> : (
        <CheckoutForm workers={ws} defaultAddress={last?.address ?? ""} q={{ trade: q.trade, city: q.city, date: q.date, days: q.days, lodging: q.lodging, transport: q.transport, hours: q.hours }} />
      )}
    </div>
  );
}
