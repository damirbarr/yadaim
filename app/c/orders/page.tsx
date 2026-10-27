import Link from "next/link";
import { requireContractor } from "@/lib/auth";
import { bookingsWhere, bookingTotals } from "@/lib/queries";
import { bookingPhase, LOCK_HOUR, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";
import { Avatar, Empty, Notice, PageHead } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.orders.title") };
}

const tone = (p: string) => (p === "requested" ? "chip-warn" : p === "today" || p === "awaiting_hours" ? "chip-hazard" : p === "completed" ? "chip-muted" : p === "rejected" || p === "cancelled" ? "chip-bad" : "chip-ok");

export default async function Orders({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { contractorId } = await requireContractor();
  const { t, fmt } = await getI18n();
  const { sent } = await searchParams;
  const today = todayISO();
  const active = (await bookingsWhere(`b.contractor_id = ? AND b.status IN ('requested','approved') ORDER BY b.date`, contractorId));
  const past = (await bookingsWhere(`b.contractor_id = ? AND b.status NOT IN ('requested','approved') ORDER BY b.date DESC LIMIT 30`, contractorId));
  const Card = ({ b }: { b: (typeof active)[number] }) => {
    const p = bookingPhase(b);
    const tot = bookingTotals(b, b.workers, b.status === "completed");
    const crew = b.workers.filter((w) => w.state === "assigned");
    return (
      <Link href={`/c/orders/${b.id}`} className="card flex items-center gap-4 p-4 transition hover:border-ink">
        <div className="hidden w-20 shrink-0 text-center sm:block">
          <div className="font-display text-2xl font-bold num">{fmt.date(b.date)}</div>
          <div className="text-xs text-muted">{b.date >= today ? fmt.relDay(b.date, today) : fmt.weekday(b.date)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{t(`contractor.count.${b.trade}` as MessageKey, { n: crew.length })}{b.days > 1 ? ` · ${t("contractor.count.days", { n: b.days })}` : ""}</span>
            <span className={tone(p)}>{fmt.phase(p)}</span>
          </div>
          <div className="truncate text-sm text-muted"><span className="sm:hidden">{fmt.relDay(b.date, today)} · </span>{b.address} · {b.agency_name}</div>
        </div>
        <div className="hidden -space-x-2 md:flex">
          {crew.slice(0, 4).map((w) => <Avatar key={w.bw_id} w={w} size={32} className="ring-2 ring-white" />)}
        </div>
        <div className="text-end text-sm font-semibold num">{fmt.money(tot.gross)}</div>
      </Link>
    );
  };
  return (
    <div className="space-y-6">
      <PageHead title={t("contractor.orders.title")} sub={t("contractor.orders.sub", { time: LOCK_HOUR })} />
      {sent && <Notice tone="ok">{t("contractor.orders.sent", { n: Number(sent) || 1 })}</Notice>}
      <section className="space-y-2">
        <h2 className="eyebrow">{t("contractor.orders.active")}</h2>
        {active.length ? active.map((b) => <Card key={b.id} b={b} />) : <Empty title={t("contractor.orders.emptyTitle")}><Link className="underline" href="/c">{t("contractor.orders.emptyLink")}</Link></Empty>}
      </section>
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="eyebrow">{t("contractor.orders.history")}</h2>
          {past.map((b) => <Card key={b.id} b={b} />)}
        </section>
      )}
    </div>
  );
}
