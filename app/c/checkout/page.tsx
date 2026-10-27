import { redirect } from "next/navigation";
import { requireContractor } from "@/lib/auth";
import { busyWorkers, displayName, docCheck, docsFor, getAgency, getContractor, getWorker } from "@/lib/queries";
import { parseSearch, toQS } from "@/lib/params";
import { all, get, insert, run, tx } from "@/lib/db";
import { endOfBlock, prettyDate, trade } from "@/lib/domain";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Notice, PageHead } from "@/components/ui";

export const metadata = { title: "סיכום הזמנה" };

export default async function Checkout({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { contractorId } = await requireContractor("contractor.book");
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
      id: w!.id, name: displayName(w!), trade: w!.trade, tradeLabel: trade(w!.trade).label, years: w!.years, base: w!.hourly_rate,
      agencyId: a.id, agency: a.name, lodgingDiscount: a.lodging_discount, transportRate: a.transport_rate, photo: w!.photo, docsUntil: end,
    };
  }));
  const last = (await get(`SELECT address FROM bookings WHERE contractor_id = ? AND city = ? ORDER BY id DESC LIMIT 1`, contractorId, q.city)) as { address: string } | undefined;
  return (
    <div>
      <PageHead back={back} title="ההזמנה שלך" sub={`${trade(q.trade).plural} · ${q.city} · ${prettyDate(q.date)}${q.days > 1 ? ` עד ${prettyDate(end)} (${q.days} ימי עבודה)` : ""}`} />
      {!c.verified && <div className="mb-4"><Notice tone="warn">שליחת הזמנות תיפתח אחרי אימות מספר הרישום ברשם הקבלנים.</Notice></div>}
      {ws.length < ids.length && <div className="mb-4"><Notice tone="warn">חלק מהעובדים שבחרת כבר לא פנויים בתאריכים האלה והוסרו מההזמנה.</Notice></div>}
      {ws.length === 0 ? <Notice tone="bad">אין עובדים פנויים בהזמנה. חזרו לחיפוש.</Notice> : (
        <CheckoutForm workers={ws} defaultAddress={last?.address ?? ""} q={{ trade: q.trade, city: q.city, date: q.date, days: q.days, lodging: q.lodging, transport: q.transport, hours: q.hours, dateLabel: prettyDate(q.date) }} />
      )}
    </div>
  );
}
