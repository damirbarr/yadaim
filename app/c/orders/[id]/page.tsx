import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContractor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { bookingsWhere, bookingTotals, displayName, siteBriefings } from "@/lib/queries";
import { addDays, bookingPhase, LOCK_HOUR, todayISO } from "@/lib/domain";
import { toQS } from "@/lib/params";
import { waLink } from "@/lib/wa";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";
import { cancelBooking, saveCrew } from "@/app/actions/contractor";
import { Avatar, Notice, PageHead, Rating } from "@/components/ui";
import { bookingDays, isNoFit } from "@/lib/attendance";
import { AttendanceTable } from "./AttendanceTable";
import { IBed, IClock, IPin, ITruck, IWhatsapp } from "@/components/icons";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getI18n();
  return { title: t("contractor.order.title", { id: (await params).id }) };
}

export default async function Order({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string; done?: string }> }) {
  const { user, contractorId } = await requireContractor();
  const [b] = (await bookingsWhere(`b.id = ? AND b.contractor_id = ?`, Number((await params).id), contractorId));
  if (!b) notFound();
  const { t, rich, fmt } = await getI18n();
  const sp = await searchParams;
  const phase = bookingPhase(b);
  const crew = b.workers.filter((w) => w.state === "assigned");
  const completed = b.status === "completed";
  const totals = bookingTotals(b, crew, completed);
  const today = todayISO();
  const order = ["requested", "approved", "locked", "today", "completed"];
  const at = completed ? 4 : phase === "awaiting_hours" ? 3.5 : order.indexOf(phase);
  const steps = [
    { k: t("contractor.order.stepSent"), sub: fmt.date(b.created_at.slice(0, 10)) },
    { k: t("contractor.order.stepApproved"), sub: b.approved_at ? fmt.date(b.approved_at.slice(0, 10)) : "" },
    { k: t("contractor.order.stepLocked"), sub: `${fmt.date(addDays(b.date, -1))} ${LOCK_HOUR}` },
    { k: t("contractor.order.stepOnSite"), sub: b.start_time },
    { k: t("contractor.order.stepHours"), sub: b.completed_at ? fmt.date(b.completed_at.slice(0, 10)) : "" },
  ];
  const dates = b.days > 1 ? t("contractor.dateRange", { from: fmt.prettyDate(b.date), to: fmt.prettyDate(b.end_date) }) : fmt.prettyDate(b.date);
  const alt = `/c/search?${toQS({ trade: b.trade, city: b.city, date: b.date >= today ? b.date : "", days: b.days, count: crew.length })}`;
  // Safety briefings are signed per site; show who still needs one before work starts (not on closed bookings).
  const showBriefing = !completed && !["rejected", "cancelled"].includes(b.status);
  const briefed = showBriefing ? await siteBriefings(contractorId, b.address, crew.map((w) => w.worker_id), b.end_date) : null;
  // The work-day entry: start the day, carry on with it, or (last day / after it) end it and approve the hours.
  const days = bookingDays(b);
  const workDay = days.includes(today);
  const started = crew.some((w) => w.attendance.some((a) => a.date === today));
  const dayLabel = phase === "awaiting_hours" ? t("contractor.order.approveHours")
    : !workDay ? t("contractor.day.open")
    : today === b.end_date && started ? t("contractor.day.finish")
    : started ? t("contractor.day.continue") : t("contractor.day.start");
  const hasAttendance = crew.some((w) => w.attendance.length > 0);
  const altLink = { link: (c: React.ReactNode) => <Link className="underline" href={alt}>{c}</Link> };
  return (
    <div className="space-y-5">
      <PageHead back="/c/orders" title={t("contractor.order.title", { id: b.id })} sub={`${t(`contractor.count.${b.trade}` as MessageKey, { n: crew.length })} · ${dates} · ${b.agency_name}`}>
        <a href={waLink(b.agency_phone, t("contractor.order.whatsappText", { id: b.id, date: fmt.date(b.date) }))} target="_blank" className="btn-ghost"><IWhatsapp className="h-4 w-4" />{t("contractor.order.whatsapp")}</a>
      </PageHead>
      {sp.sent && <Notice tone="ok">{t("contractor.order.sentNotice", { agency: b.agency_name })}</Notice>}
      {sp.done && <Notice tone="ok">{t("contractor.order.doneNotice")}</Notice>}
      {b.status === "rejected" && <Notice tone="bad">{b.agency_note ? rich("contractor.order.rejectedNote", altLink, { note: b.agency_note }) : rich("contractor.order.rejected", altLink)}</Notice>}

      {!["rejected", "cancelled"].includes(b.status) && (
        <ol className="card grid grid-cols-5 p-4 text-center text-xs">
          {steps.map((s, i) => (
            <li key={i} className="relative">
              <div className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${i < at ? "bg-ink text-white" : i === Math.floor(at) || i === at ? "bg-hazard text-ink ring-4 ring-hazard/30" : "bg-paper text-muted"}`}>{i + 1}</div>
              <div className={`mt-1 font-semibold ${i <= at ? "" : "text-muted"}`}>{s.k}</div>
              <div className="num text-muted">{s.sub}</div>
            </li>
          ))}
        </ol>
      )}

      {(phase === "today" || phase === "awaiting_hours") && can(user, "contractor.site") && (
        <Link href={`/c/orders/${b.id}/site`} className="btn-hazard w-full py-4 text-[17px]" data-act="work-day">{dayLabel}</Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
        <section className="card">
          <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{phase === "requested" ? t("contractor.order.requestedCrew") : completed ? t("contractor.order.worked") : t("contractor.order.crew")}</h2>
          <ul>
            {crew.map((w) => (
              <li key={w.bw_id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                <Avatar w={w} size={48} />
                <div className="flex-1">
                  <div className="font-semibold">{displayName(w)}</div>
                  <div className="text-xs text-muted">{fmt.trade(w.trade)} · {t("contractor.count.years", { n: w.years })}</div>
                  {briefed && (briefed.has(w.worker_id)
                    ? <div className="text-xs text-ok">✓ {t("safety.order.valid", { date: fmt.fullDate(briefed.get(w.worker_id)!.expires) })}</div>
                    : <div className="text-xs font-semibold text-warn">{t("safety.order.needed")}</div>)}
                </div>
                {completed ? (
                  w.hours_approved ? <div className="text-end text-xs"><Rating value={w.rating} /><div className="num text-muted">{t("contractor.count.hours", { n: w.hours_approved })}</div></div>
                    : isNoFit(w) ? <span className="chip-bad">{t("contractor.order.noFitNotBilled")}</span>
                    : w.arrived === 0 ? <span className="chip-bad">{t("contractor.order.noShowNotBilled")}</span>
                    : <span className="num text-xs text-muted">{t("contractor.count.hours", { n: 0 })}</span>
                ) : isNoFit(w) ? (
                  <span className="chip-bad">{t("contractor.order.noFit")}</span>
                ) : w.attendance.some((a) => a.date === today) ? (
                  // On a work day the chip says where the worker is today, not on the first day of the booking.
                  w.attendance.find((a) => a.date === today)!.arrived === 0 ? <span className="chip-bad">{t("contractor.order.noShowToday")}</span> : <span className="chip-ok">{t("contractor.order.onSite")}</span>
                ) : hasAttendance && workDay ? (
                  <span className="chip-muted">{t("contractor.day.table.notRecorded")}</span>
                ) : w.checkin_at && !hasAttendance ? (
                  <span className="chip-ok">{t("contractor.order.onSite")}</span>
                ) : (
                  <span className={phase === "requested" ? "chip-warn" : "chip-ok"}>{phase === "requested" ? t("contractor.order.waiting") : phase === "locked" || phase === "today" ? t("contractor.order.locked") : t("contractor.order.approved")}</span>
                )}
              </li>
            ))}
          </ul>
          {briefed && crew.some((w) => !briefed.has(w.worker_id)) && <p className="border-t border-dashed border-line px-5 py-3 text-xs text-muted">{t("safety.order.note")}</p>}
          {b.agency_note && b.status !== "rejected" && <p className="border-t border-line px-5 py-3 text-sm text-muted">{t("contractor.order.agencyNote", { note: b.agency_note })}</p>}
        </section>
        {(hasAttendance || (b.days > 1 && ["today", "awaiting_hours"].includes(phase))) && <AttendanceTable b={b} />}
        </div>

        <aside className="space-y-4">
          <div className="card space-y-3 p-5 text-sm">
            <div className="flex gap-2"><IPin className="h-4 w-4 shrink-0 text-muted" /><span>{b.address}</span></div>
            <div className="flex gap-2"><IClock className="h-4 w-4 shrink-0 text-muted" /><span>{t("contractor.order.start", { time: b.start_time, hours: b.hours })}</span></div>
            <div className="flex gap-2"><ITruck className="h-4 w-4 shrink-0 text-muted" /><span>{b.transport === "agency"
              ? (b.pickup_time && ["locked", "today"].includes(phase)
                ? t("contractor.order.transportDriver", { driver: b.driver_name ?? "", vehicle: b.vehicle_no ?? "", time: b.pickup_time })
                : ["requested", "approved"].includes(phase) ? t("contractor.order.transportPending", { time: LOCK_HOUR }) : t("contractor.order.transportAgency"))
              : t("contractor.order.transportOurs")}</span></div>
            <div className="flex gap-2"><IBed className="h-4 w-4 shrink-0 text-muted" /><span>{b.lodging === "agency" ? t("contractor.order.lodgingAgency") : t("contractor.order.lodgingOurs")}</span></div>
            {b.notes && <p className="rounded-[3px] bg-paper p-3 text-muted">{b.notes}</p>}
          </div>
          <div className="card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted">{completed ? t("contractor.order.toPay") : t("contractor.order.estimate")}</span>
              <span className="font-display text-2xl font-bold num">{fmt.money(totals.gross, 2)}</span>
            </div>
            <div className="text-xs text-muted">{t("contractor.order.inclVat", { net: fmt.money(totals.net) })}</div>
          </div>
          {["requested", "approved"].includes(phase) && can(user, "contractor.book") && (
            <form action={cancelBooking}>
              <input type="hidden" name="id" value={b.id} />
              <button className="btn-ghost w-full text-bad">{t("contractor.order.cancel")}</button>
              <p className="mt-1 text-center text-xs text-muted">{t("contractor.order.cancelNote", { time: LOCK_HOUR })}</p>
            </form>
          )}
          {completed && crew.some((w) => w.hours_approved) && can(user, "contractor.crews.edit") && (
            <form action={saveCrew} className="card space-y-2 p-4">
              <input type="hidden" name="id" value={b.id} />
              <label className="label">{t("contractor.order.saveCrew")}</label>
              <div className="flex gap-2">
                <input className="input" name="name" placeholder={t("contractor.order.crewName", { trades: fmt.trades(b.trade), city: fmt.city(b.city) })} />
                <button className="btn-primary">{t("common.save")}</button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
