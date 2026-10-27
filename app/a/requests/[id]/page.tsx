import { notFound } from "next/navigation";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all } from "@/lib/db";
import { bookingsWhere, bookingTotals, busyWorkers, displayName, docCheck, docsFor, workedWith, workerStats, type Worker } from "@/lib/queries";
import { bookingPhase, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { agencyCrews } from "@/lib/crews";
import { waLink } from "@/lib/wa";
import { agencyCancel, rejectRequest, swapWorker } from "@/app/actions/agency";
import { AssignForm, type Cand, type CrewOption } from "@/components/AssignForm";
import { Avatar, Notice, PageHead, Rating } from "@/components/ui";
import { IWhatsapp } from "@/components/icons";
import { AttendanceTable } from "@/app/c/orders/[id]/AttendanceTable";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, agencyId } = await requireAgency();
  const manage = can(user, "agency.requests.manage");
  const { t, rich, fmt, intl } = await getI18n();
  const [b] = (await bookingsWhere(`b.id = ? AND b.agency_id = ?`, Number((await params).id), agencyId));
  if (!b) notFound();
  const phase = bookingPhase(b);
  const crew = b.workers.filter((w) => w.state === "assigned");
  const requestedIds = b.workers.map((w) => w.worker_id);
  // Crews with at least one member in the requested trade can be assigned whole, so their other-trade members join the pool.
  const crewList = (await agencyCrews(agencyId)).filter((c) => c.members.some((m) => m.trade === b.trade));
  const crewOf = new Map(crewList.flatMap((c) => c.members.map((m) => [m.id, c.name] as const)));
  const pool = [
    ...((await all(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND trade = ?`, agencyId, b.trade)) as Worker[]),
    ...crewList.flatMap((c) => c.members.filter((m) => m.trade !== b.trade)),
  ];
  const busy = (await busyWorkers(b.date, b.end_date, b.id));
  const docs = (await docsFor(pool.map((w) => w.id)));
  const stats = (await workerStats(pool.map((w) => w.id)));
  const hist = (await workedWith(b.contractor_id));
  const cands: Cand[] = pool
    .map((w) => {
      const dc = docCheck(docs.get(w.id)!, b.trade, b.end_date);
      return {
        id: w.id, name: displayName(w), trade: w.trade, years: w.years, photo: w.photo, country: w.country, requested: requestedIds.includes(w.id), crew: crewOf.get(w.id),
        withContractor: hist.get(w.id) ?? 0, rating: stats.get(w.id)!.rating, busy: busy.has(w.id), docsOk: dc.ok,
        docsNote: dc.ok
          ? (dc.expiring.length ? t("agency.request.docsValidUntil", { doc: fmt.docShort(dc.expiring[0].type), date: fmt.date(dc.expiring[0].expires) }) : t("agency.request.docsAllValid"))
          : t("agency.request.docsMissing", { docs: new Intl.ListFormat(intl, { type: "unit", style: "short" }).format(dc.missing.map((m) => fmt.docShort(m))) }),
      };
    })
    .sort((x, y) => Number(y.requested) - Number(x.requested) || Number(x.busy) - Number(y.busy) || y.withContractor - x.withContractor || (y.rating ?? 0) - (x.rating ?? 0));
  const totals = bookingTotals(b, b.status === "requested" ? b.workers : crew, b.status === "completed");
  const crewOptions: CrewOption[] = crewList
    .map((c) => ({ id: c.id, name: c.name, size: c.members.length, ready: cands.filter((x) => c.members.some((m) => m.id === x.id) && x.docsOk && !x.busy).map((x) => x.id) }))
    .filter((c) => c.ready.length > 0)
    .sort((x, y) => y.ready.length - x.ready.length);
  const free = cands.filter((c) => !c.busy && c.docsOk && !crew.some((w) => w.worker_id === c.id));

  return (
    <div className="space-y-5">
      <PageHead back="/a/requests" title={t(b.status === "requested" ? "agency.request.titleRequest" : "agency.request.titleBooking", { id: b.id, company: b.company })}
        sub={t("agency.request.sub", {
          crew: t("agency.crew", { n: b.workers.length, trade: fmt.trade(b.trade), trades: fmt.trades(b.trade) }),
          dates: b.days > 1 ? t("agency.request.range", { from: fmt.prettyDate(b.date), to: fmt.prettyDate(b.end_date), days: t("agency.days", { n: b.days }) }) : fmt.prettyDate(b.date),
          time: b.start_time, hours: t("agency.hours", { n: b.hours }),
        })}>
        <span className={b.status === "requested" ? "chip-hazard" : "chip-ok"}>{fmt.phase(phase)}</span>
      </PageHead>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {b.status === "requested" && !manage ? (
            <section className="card p-5 text-sm text-muted">{t("agency.request.viewOnly")}</section>
          ) : b.status === "requested" ? (
            <>
              <h2 className="text-[20px] font-bold text-ink">{t("agency.request.proposal")}</h2>
              <AssignForm id={b.id} cands={cands} crews={crewOptions} trade={b.trade} need={b.workers.length} transport={b.transport === "agency"} defaults={{ pickup: "06:15" }} />
              <form action={rejectRequest} className="card flex flex-wrap items-end gap-2 p-4">
                <input type="hidden" name="id" value={b.id} />
                <div className="flex-1"><label className="label" htmlFor="reject-reason">{t("agency.request.rejectLabel")}</label><input id="reject-reason" name="reason" className="input" placeholder={t("agency.request.rejectPlaceholder")} /></div>
                <button className="btn-ghost text-bad">{t("agency.request.reject")}</button>
              </form>
            </>
          ) : (
            <section className="card">
              <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{t("agency.request.crew")}</h2>
              <ul>
                {crew.map((w) => {
                  const noFit = w.arrived === 0 || w.identity_ok === "no" || w.trade_ok === "no";
                  return (
                    <li key={w.bw_id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                      <Avatar w={w} size={44} />
                      <div className="flex-1">
                        <div className="font-semibold">{displayName(w)}</div>
                        <div className="text-xs text-muted">{w.phone ?? ""}</div>
                      </div>
                      {b.status === "completed" ? (w.hours_approved ? <span className="text-xs"><Rating value={w.rating} /> · <span className="num">{t("agency.request.hoursShort", { n: w.hours_approved })}</span></span> : <span className="chip-bad">{t("agency.request.notBilled")}</span>)
                        : noFit ? <span className="chip-bad">{w.arrived === 0 ? t("agency.request.noShow") : t("agency.request.markedNoFit")}</span>
                        : w.checkin_at ? <span className="chip-ok">{t("agency.request.onSite")}</span> : <span className="chip-muted">{t("agency.request.notCheckedIn")}</span>}
                      {manage && b.status === "approved" && (!w.checkin_at || noFit) ? (
                        <form action={swapWorker} className="flex w-full gap-2 sm:w-auto">
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="out" value={w.worker_id} />
                          <select name="in" className="input py-1.5 text-xs" defaultValue="" aria-label={t("agency.request.swapWith")}>
                            <option value="" disabled>{t("agency.request.swapWith")}</option>
                            {free.map((c) => <option key={c.id} value={c.id}>{t("agency.request.swapOption", { name: c.name, years: t("agency.years", { n: c.years }) })}</option>)}
                          </select>
                          <button className="btn-ghost btn-sm">{t("agency.request.swap")}</button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {/* Daily attendance as the contractor records it on site, read-only, from the first work day on. */}
          {((b.status === "approved" && b.date <= todayISO()) || crew.some((w) => w.attendance.length > 0)) && <AttendanceTable b={b} note={t("agency.request.attendanceNote")} />}
          {manage && b.status === "approved" && ["approved", "locked"].includes(phase) && (
            <form action={agencyCancel} className="text-center">
              <input type="hidden" name="id" value={b.id} />
              <button className="text-xs text-muted underline hover:text-bad">{t("agency.request.cancel")}</button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card space-y-2 p-5 text-sm">
            <h3 className="text-[18px] font-bold text-ink">{t("agency.request.contractor")}</h3>
            <div>{b.company} · {b.contact_name}</div>
            <div className="flex flex-wrap gap-1">
              <span className="chip-ok">{rich("agency.request.registered", { n: (c) => <span className="num">{c}</span> }, { no: b.registry_no })}</span>
              {b.classification && <span className="chip-muted">{t("agency.request.classification", { c: b.classification })}</span>}
            </div>
            <div className="text-muted">{b.address}</div>
            <div className="text-muted">{t(b.lodging === "agency" ? "agency.lodgingAgency" : "agency.lodgingContractor")} · {t(b.transport === "agency" ? "agency.transportAgency" : "agency.transportContractor")}</div>
            {b.notes && <p className="rounded-[3px] bg-paper p-3">{b.notes}</p>}
            {b.campaign_id && <span className="chip-info">{t("agency.request.fromOffer")}</span>}
            <a href={waLink(b.contractor_phone, t("agency.request.waText", { name: b.contact_name, date: fmt.date(b.date) }))} target="_blank" className="btn-ghost btn-sm w-full"><IWhatsapp className="h-4 w-4" />{t("agency.request.whatsapp")}</a>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted">{b.status === "completed" ? t("agency.request.toCollect") : t("agency.request.value")}</div>
            <div className="font-display text-2xl font-bold num">{fmt.money(totals.net)}</div>
            <div className="text-xs text-muted">{t("agency.request.vatNote")}</div>
          </div>
          <Notice>{t("agency.request.legal")}</Notice>
        </aside>
      </div>
    </div>
  );
}
