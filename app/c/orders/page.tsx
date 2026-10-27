import Link from "next/link";
import { requireContractor } from "@/lib/auth";
import { bookingsWhere, bookingTotals } from "@/lib/queries";
import { bookingPhase, ddmm, ils, PHASE_LABEL, prettyDate, relDay, todayISO, trade } from "@/lib/domain";
import { Avatar, Empty, Notice, PageHead } from "@/components/ui";

export const metadata = { title: "ההזמנות שלי" };

const tone = (p: string) => (p === "requested" ? "chip-warn" : p === "today" || p === "awaiting_hours" ? "chip-hazard" : p === "completed" ? "chip-muted" : p === "rejected" || p === "cancelled" ? "chip-bad" : "chip-ok");

export default async function Orders({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { contractorId } = await requireContractor();
  const { sent } = await searchParams;
  const today = todayISO();
  const active = (await bookingsWhere(`b.contractor_id = ? AND b.status IN ('requested','approved') ORDER BY b.date`, contractorId));
  const past = (await bookingsWhere(`b.contractor_id = ? AND b.status NOT IN ('requested','approved') ORDER BY b.date DESC LIMIT 30`, contractorId));
  const Card = ({ b }: { b: (typeof active)[number] }) => {
    const p = bookingPhase(b);
    const t = bookingTotals(b, b.workers, b.status === "completed");
    return (
      <Link href={`/c/orders/${b.id}`} className="card flex items-center gap-4 p-4 transition hover:border-ink">
        <div className="hidden w-16 shrink-0 text-center sm:block">
          <div className="font-display text-2xl font-bold num">{ddmm(b.date)}</div>
          <div className="text-xs text-muted">{b.date >= today ? relDay(b.date) : prettyDate(b.date).split(" ").slice(0, 2).join(" ")}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{b.workers.filter((w) => w.state === "assigned").length} {trade(b.trade).plural}{b.days > 1 ? ` · ${b.days} ימים` : ""}</span>
            <span className={tone(p)}>{PHASE_LABEL[p]}</span>
          </div>
          <div className="truncate text-sm text-muted"><span className="sm:hidden">{relDay(b.date)} · </span>{b.address} · {b.agency_name}</div>
        </div>
        <div className="hidden -space-x-2 space-x-reverse md:flex">
          {b.workers.filter((w) => w.state === "assigned").slice(0, 4).map((w) => <Avatar key={w.bw_id} w={w} size={32} className="ring-2 ring-white" />)}
        </div>
        <div className="text-left text-sm font-semibold num">{ils(t.gross)}</div>
      </Link>
    );
  };
  return (
    <div className="space-y-6">
      <PageHead title="ההזמנות שלי" sub="כל הזמנה נשלחת לתאגיד לאישור. ב-18:00 ערב לפני הצוות ננעל." />
      {sent && <Notice tone="ok">ההזמנה נשלחה ל-{sent} תאגידים. נעדכן ברגע שיאשרו.</Notice>}
      <section className="space-y-2">
        <h2 className="eyebrow">פעילות</h2>
        {active.length ? active.map((b) => <Card key={b.id} b={b} />) : <Empty title="אין הזמנות פעילות"><Link className="underline" href="/c">להזמנה חדשה</Link></Empty>}
      </section>
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="eyebrow">היסטוריה</h2>
          {past.map((b) => <Card key={b.id} b={b} />)}
        </section>
      )}
    </div>
  );
}
