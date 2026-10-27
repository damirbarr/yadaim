import Link from "next/link";
import { requireContractor } from "@/lib/auth";
import { bookingsWhere, bookingTotals } from "@/lib/queries";
import { bookingPhase, isWorkday, LOCK_HOUR, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";
import { Avatar, Empty, Notice, PageHead } from "@/components/ui";
import { MonthCalendar } from "@/components/Calendar";
import { contractorCalendar, monthGrid, parseMonth } from "@/lib/calendar";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.orders.title") };
}

// Calendar entries: a coloured start edge per phase, the same colour family as the list chips.
const bar = (p: string) => (p === "requested" ? "border-warn bg-warn-soft" : p === "today" || p === "awaiting_hours" ? "border-ink bg-hazard" : p === "completed" ? "border-line bg-paper-2 text-muted" : "border-ok bg-ok-soft");
const tone = (p: string) => (p === "requested" ? "chip-warn" : p === "today" || p === "awaiting_hours" ? "chip-hazard" : p === "completed" ? "chip-muted" : p === "rejected" || p === "cancelled" ? "chip-bad" : "chip-ok");

export default async function Orders({ searchParams }: { searchParams: Promise<{ sent?: string; view?: string; m?: string }> }) {
  const { contractorId } = await requireContractor();
  const { t, fmt } = await getI18n();
  const { sent, view, m } = await searchParams;
  const today = todayISO();
  const head = (
    <PageHead title={t("contractor.orders.title")} sub={t("contractor.orders.sub", { time: LOCK_HOUR })}>
      <nav className="flex rounded-[3px] border border-line bg-paper p-1 text-[14px]" aria-label={t("calendar.view.label")}>
        {(["calendar", "list"] as const).map((v) => {
          const on = (view === "list" ? "list" : "calendar") === v;
          return <Link key={v} href={v === "list" ? "/c/orders?view=list" : "/c/orders"} aria-current={on ? "page" : undefined} className={`rounded-[2px] px-4 py-1.5 font-semibold ${on ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{t(`calendar.view.${v}`)}</Link>;
        })}
      </nav>
    </PageHead>
  );
  const notice = sent && <Notice tone="ok">{t("contractor.orders.sent", { n: Number(sent) || 1 })}</Notice>;

  if (view !== "list") {
    // Calendar (the default): every booking on each of its work days, linked to the booking page.
    const month = parseMonth(m);
    const grid = monthGrid(month);
    const bookings = await contractorCalendar(contractorId, grid.first, grid.last);
    const shown = bookings.map((b) => ({ b, p: bookingPhase(b), n: b.workers.filter((w) => w.state === "assigned").length }));
    return (
      <div className="space-y-6">
        {head}
        {notice}
        <MonthCalendar
          month={month}
          today={today}
          href={(q) => (q.m ? `/c/orders?m=${q.m}` : "/c/orders")}
          empty={<Empty title={t("calendar.contractor.empty")}><Link className="underline" href="/c">{t("calendar.contractor.emptyLink")}</Link></Empty>}
          legend={
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
              {["requested", "approved", "today", "completed"].map((p) => <span key={p} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 border-s-[3px] ${bar(p)}`} />{fmt.phase(p)}</span>)}
            </div>
          }
          day={(iso) => {
            if (!isWorkday(iso)) return null;
            const here = shown.filter(({ b }) => b.date <= iso && b.end_date >= iso);
            if (!here.length) return null;
            return (
              <ul className="space-y-1">
                {here.map(({ b, p, n }) => (
                  <li key={b.id}>
                    <Link href={`/c/orders/${b.id}`} className={`block rounded-[2px] border-s-[3px] px-2 py-1.5 text-[13px] leading-tight transition hover:brightness-95 md:px-1.5 md:py-1 md:text-[12px] ${bar(p)}`}>
                      <span className="block truncate font-bold text-ink">{t(`contractor.count.${b.trade}` as MessageKey, { n })}</span>
                      <span className="block truncate">{fmt.phase(p)}</span>
                      <span className="block truncate text-[12px] opacity-75 md:hidden">{b.address} · {b.agency_name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            );
          }}
        />
      </div>
    );
  }
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
      {head}
      {notice}
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
