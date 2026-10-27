import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { bookingsWhere, bookingTotals } from "@/lib/queries";
import { bookingPhase, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { updateTransport } from "@/app/actions/agency";
import { Avatar, Empty, Notice, PageHead } from "@/components/ui";
import { TimeField } from "@/components/DateField";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("agency.requests.title") };
}

export default async function Requests({ searchParams }: { searchParams: Promise<{ approved?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const manage = can(user, "agency.requests.manage");
  const { approved } = await searchParams;
  const { t, rich, fmt } = await getI18n();
  const crew = (n: number, k: string) => t("agency.crew", { n, trade: fmt.trade(k), trades: fmt.trades(k) });
  const today = todayISO();
  const pending = (await bookingsWhere(`b.agency_id = ? AND b.status = 'requested' AND b.date >= ? ORDER BY b.date`, agencyId, today));
  const upcoming = (await bookingsWhere(`b.agency_id = ? AND b.status = 'approved' AND b.end_date >= ? ORDER BY b.date`, agencyId, today));
  const awaiting = (await bookingsWhere(`b.agency_id = ? AND b.status = 'approved' AND b.end_date < ? ORDER BY b.date`, agencyId, today));
  return (
    <div className="space-y-6">
      <PageHead title={t("agency.requests.title")} sub={t("agency.requests.sub")} />
      {approved && <Notice tone="ok">{t("agency.requests.approved", { id: approved })}</Notice>}

      <section className="space-y-2">
        <h2 className="eyebrow">{t("agency.requests.pending", { n: pending.length })}</h2>
        {pending.length === 0 ? <Empty title={t("agency.requests.emptyTitle")}>{rich("agency.requests.emptyBody", { link: (c) => <Link className="underline" href="/a/campaigns">{c}</Link> })}</Empty> : pending.map((b) => {
          const totals = bookingTotals(b, b.workers);
          return (
            <Link key={b.id} href={`/a/requests/${b.id}`} className="card flex flex-wrap items-center gap-4 p-4 hover:border-ink">
              <span className="chip-hazard">{t("agency.requests.newChip")}</span>
              {/* On a phone the details take the whole first line and price + action wrap below. */}
              <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-0">
                <div className="font-semibold">{b.company} · {b.contact_name}</div>
                <div className="text-sm text-muted">{crew(b.workers.length, b.trade)} · {fmt.prettyDate(b.date)}{b.days > 1 ? ` · ${t("agency.days", { n: b.days })}` : ""} · {b.address} · {t(b.lodging === "agency" ? "agency.lodgingAgency" : "agency.lodgingContractor")}</div>
              </div>
              <div className="flex-1 sm:flex-none sm:text-end"><div className="text-[22px] font-bold text-ink num">{fmt.money(totals.net)}</div><div className="text-xs text-muted">{t("agency.requests.beforeVat")}</div></div>
              <span className="btn-primary">{t("agency.requests.assign")}</span>
            </Link>
          );
        })}
      </section>

      {awaiting.length > 0 && (
        <section className="space-y-2">
          <h2 className="eyebrow">{t("agency.requests.awaitingHours", { n: awaiting.length })}</h2>
          {awaiting.map((b) => (
            <Link key={b.id} href={`/a/requests/${b.id}`} className="card flex items-center gap-3 p-4 text-sm hover:border-ink">
              <span className="chip-warn">{t("agency.requests.hoursChip")}</span><span className="flex-1">{b.company} · <span className="num">{fmt.date(b.date)}</span> · {t("agency.workers", { n: b.workers.filter((w) => w.state === "assigned").length })}</span>
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="eyebrow">{t("agency.requests.approvedTitle")}</h2>
        {upcoming.length === 0 ? <p className="text-sm text-muted">{t("agency.requests.noUpcoming")}</p> : (
          <div className="card divide-y divide-line">
            {upcoming.map((b) => {
              const phase = bookingPhase(b);
              const crew = b.workers.filter((w) => w.state === "assigned");
              return (
                <div key={b.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
                  <Link href={`/a/requests/${b.id}`} className="flex min-w-0 items-center gap-3">
                    <div className="w-14 text-center"><div className="font-display text-xl font-bold num">{fmt.date(b.date)}</div><div className="text-[11px] text-muted">{fmt.relDay(b.date, today)}</div></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><b>{b.company}</b><span className={phase === "today" ? "chip-hazard" : phase === "locked" ? "chip-info" : "chip-ok"}>{fmt.phase(phase)}</span>{b.days > 1 && <span className="chip-muted">{t("agency.days", { n: b.days })}</span>}</div>
                      <div className="truncate text-sm text-muted">{fmt.trades(b.trade)} · {b.address}</div>
                    </div>
                    <div className="hidden -space-x-2 sm:flex">{crew.map((w) => <Avatar key={w.bw_id} w={w} size={30} className="ring-2 ring-white" />)}</div>
                  </Link>
                  {b.transport === "agency" && manage && (
                    <form action={updateTransport} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <TimeField name="pickup_time" defaultValue={b.pickup_time ?? ""} className="w-28 py-1.5" placeholder={t("agency.requests.pickup")} />
                      <input name="driver_name" defaultValue={b.driver_name ?? ""} placeholder={t("agency.requests.driver")} aria-label={t("agency.requests.driver")} className="input w-24 py-1.5" />
                      <input name="vehicle_no" defaultValue={b.vehicle_no ?? ""} placeholder={t("agency.requests.vehicle")} aria-label={t("agency.requests.vehicle")} className="input w-28 py-1.5" dir="ltr" />
                      <button className={b.pickup_time ? "btn-ghost btn-sm" : "btn-hazard btn-sm"}>{b.pickup_time ? t("agency.requests.update") : t("agency.requests.saveTransport")}</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
