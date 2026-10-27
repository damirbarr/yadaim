import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContractor } from "@/lib/auth";
import { bookingsWhere, displayName, siteBriefings, type BookingWorker } from "@/lib/queries";
import { bookingPhase, nowParts, todayISO, WORK_TAGS } from "@/lib/domain";
import { BREAK, bookingDays, hoursDigits, isNoFit, roundQuarter, workerHours } from "@/lib/attendance";
import { getI18n } from "@/lib/i18n/server";
import { approveHours, siteCheck } from "@/app/actions/contractor";
import { endDay, markArrival, setTimes } from "@/app/actions/attendance";
import { recordBriefing } from "@/app/actions/briefings";
import { FileField } from "@/components/FileField";
import { TimeField } from "@/components/DateField";
import { Avatar, Notice, PageHead } from "@/components/ui";
import { AutoSaveForm } from "./AutoSaveForm";

// The work day on site: one screen per booking and date (?d=YYYY-MM-DD, default today). Built for one hand on a
// phone: "arrived" / "didn't come" per worker, the identity/skill questions and the safety briefing on a worker's
// first arrival, entry/exit times that save as soon as they're picked, one tap to end the day for everyone, and on
// the booking's last day the hours approval, pre-filled from what was recorded.

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.day.title") };
}

const Hidden = ({ v }: { v: Record<string, string | number> }) => <>{Object.entries(v).map(([k, x]) => <input key={k} type="hidden" name={k} value={x} />)}</>;

async function Ask({ bw, field, q, value }: { bw: number; field: string; q: string; value: string | null }) {
  const { t } = await getI18n();
  const opts = [["yes", t("contractor.site.yes")], ["partial", t("contractor.site.partial")], ["no", t("contractor.site.no")]] as const;
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">{q}</div>
      <div className="grid grid-cols-3 gap-2">
        {opts.map(([v, l]) => (
          <form key={v} action={siteCheck}>
            <Hidden v={{ bw, field, value: v }} />
            <button data-act={`${field}-${v}`} className={`btn w-full border py-3 ${value === v ? (v === "no" ? "border-bad bg-bad text-white" : "border-ink bg-ink text-white") : "border-line bg-white"}`}>{l}</button>
          </form>
        ))}
      </div>
    </div>
  );
}

/** Separate from the identity/skill questions: recording it never changes check-in or billing. */
async function Briefing({ bw, d, valid, error }: { bw: number; d: string; valid: string | null; error: boolean }) {
  const { t, fmt } = await getI18n();
  return (
    <div className="border-t border-dashed border-line pt-3">
      <div className="mb-1.5 text-sm font-medium">{t("safety.site.step")}</div>
      {valid ? (
        <p className="text-sm font-semibold text-ok">✓ {t("safety.site.valid", { date: fmt.fullDate(valid) })}</p>
      ) : (
        <form action={recordBriefing} className="space-y-2">
          <Hidden v={{ bw, d }} />
          <p className="text-xs text-muted">{t("safety.site.needed")}</p>
          {error && <Notice tone="bad">{t("safety.site.uploadError")}</Notice>}
          <div><span className="label">{t("safety.site.photo")}</span><FileField name="file" accept="image/*,.pdf" small /></div>
          <button className="btn w-full border border-ink bg-white py-3 text-ink">{t("safety.site.submit")}</button>
        </form>
      )}
    </div>
  );
}

export default async function WorkDay({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string; briefingError?: string }> }) {
  const { contractorId } = await requireContractor("contractor.site");
  const [b] = await bookingsWhere(`b.id = ? AND b.contractor_id = ?`, Number((await params).id), contractorId);
  if (!b) notFound();
  const { t, fmt } = await getI18n();
  const sp = await searchParams;
  const today = todayISO();
  const days = bookingDays(b);
  const open = days.filter((x) => x <= today);
  const back = `/c/orders/${b.id}`;
  if (b.status !== "approved" || !open.length || !["today", "awaiting_hours", "locked"].includes(bookingPhase(b)))
    return <div className="mx-auto max-w-md"><PageHead back={back} title={t("contractor.day.title")} /><Notice>{t("contractor.day.notOpen")}</Notice></div>;

  // The day on screen: the one asked for, else today (or the last work day so far, e.g. on a Saturday or when only hours are left).
  const d = sp.d && open.includes(sp.d) ? sp.d : open[open.length - 1];
  const crew = b.workers.filter((w) => w.state === "assigned");
  const on = (w: BookingWorker) => w.attendance.find((a) => a.date === d);
  const briefingError = Number(sp.briefingError) || 0;
  // Briefings are per site: valid for this contractor + address through the booking's last day.
  const briefed = await siteBriefings(contractorId, b.address, crew.map((w) => w.worker_id), b.end_date);
  const arrived = crew.filter((w) => on(w)?.arrived === 1).length;
  const missed = crew.filter((w) => on(w)?.arrived === 0).length;
  const stillHere = crew.filter((w) => on(w)?.arrived === 1 && !on(w)?.end_time && !isNoFit(w));
  const everyoneMarked = crew.every((w) => on(w)?.arrived != null);
  const now = roundQuarter(nowParts().time);
  const h = (n: number) => fmt.num(n, hoursDigits(n));
  const showClose = today >= b.end_date && d === days[days.length - 1];
  const sums = new Map(crew.map((w) => [w.bw_id, workerHours(b, w)]));
  const billed = crew.filter((w) => sums.get(w.bw_id)!.cap > 0);
  const unbilled = crew.filter((w) => sums.get(w.bw_id)!.cap === 0);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHead back={back} eyebrow={days.length > 1 ? t("contractor.day.dayOf", { n: days.indexOf(d) + 1, days: days.length }) : undefined}
        title={t("contractor.day.title")} sub={t("contractor.day.sub", { date: fmt.prettyDate(d), address: b.address })} />

      {days.length > 1 && (
        <nav aria-label={t("contractor.day.days")} className="-mx-4 overflow-x-auto px-4 pb-1">
          <ol className="flex gap-1.5">
            {days.map((x) => {
              const complete = crew.every((w) => isNoFit(w) || w.attendance.some((a) => a.date === x && a.arrived != null));
              const cls = `flex min-h-11 min-w-14 flex-col items-center justify-center rounded-[3px] border px-2 text-[13px] font-semibold ${x === d ? "border-ink bg-ink text-white" : x > today ? "border-line bg-paper text-muted" : "border-line bg-white text-ink"}`;
              const inner = <><span className="num">{fmt.date(x)}</span><span className="text-[11px] leading-none">{x <= today ? (complete ? "✓" : "•") : ""}</span></>;
              return <li key={x}>{x <= today ? <Link href={`/c/orders/${b.id}/site?d=${x}`} aria-current={x === d ? "date" : undefined} className={cls}>{inner}</Link> : <span className={cls}>{inner}</span>}</li>;
            })}
          </ol>
        </nav>
      )}

      <div className="sheet flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="font-display text-[18px] font-bold text-ink">{t("contractor.day.arrivedCount", { arrived, total: crew.length })}</span>
        {missed > 0 && <span className="chip-bad">{t("contractor.day.missedCount", { n: missed })}</span>}
      </div>
      {arrived + missed === 0 && <Notice>{t("contractor.day.intro")}</Notice>}

      {crew.map((w) => {
        const a = on(w);
        const noFit = isNoFit(w);
        const bad = noFit || a?.arrived === 0;
        // The two questions belong to the worker's first arrival at this booking; answered "no" stays open to correct it.
        const asking = !w.identity_ok || !w.trade_ok || noFit;
        return (
          <section key={w.bw_id} id={`bw-${w.bw_id}`} data-bw={w.bw_id} className={`sheet space-y-3 p-4 ${bad ? "border-bad" : a?.arrived === 1 ? "border-ok" : ""}`}>
            <div className="flex items-center gap-3">
              <Avatar w={w} size={56} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[20px] font-bold text-ink">{displayName(w)}</div>
                <div className="text-sm text-muted">{t("contractor.site.bookedAs", { trade: fmt.trade(w.trade), years: t("contractor.count.years", { n: w.years }) })}</div>
              </div>
              {noFit ? <span className="chip-bad">{t("contractor.site.notBilled")}</span>
                : a?.arrived === 0 ? <span className="chip-bad">{t("contractor.day.noShow")}</span>
                : a?.arrived === 1 ? <span className="chip-ok">{a.end_time ? t("contractor.day.done") : t("contractor.day.onSite")}</span> : null}
            </div>

            {a?.arrived == null ? (
              <div className="grid grid-cols-2 gap-2">
                <form action={markArrival}><Hidden v={{ bw: w.bw_id, d, v: "1" }} />
                  <button data-act="arrive" className="btn-primary w-full py-4 text-[17px]">{t("contractor.day.arrived")}</button></form>
                <form action={markArrival}><Hidden v={{ bw: w.bw_id, d, v: "0" }} />
                  <button data-act="noshow" className="btn w-full border-[1.5px] border-bad bg-white py-4 text-[17px] text-bad">{t("contractor.day.noShow")}</button></form>
              </div>
            ) : a.arrived === 0 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-bad">{t("contractor.day.noShowNote")}</span>
                <form action={markArrival}><Hidden v={{ bw: w.bw_id, d, v: "clear" }} />
                  <button data-act="undo" className="btn-ghost btn-sm min-h-10">{t("contractor.day.undo")}</button></form>
              </div>
            ) : (
              <>
                {asking ? (
                  <div className="space-y-3 border-t border-dashed border-line pt-3">
                    <div className="text-xs font-semibold text-muted">{t("contractor.day.firstTime")}</div>
                    <Ask bw={w.bw_id} field="identity_ok" q={t("contractor.site.qIdentity")} value={w.identity_ok} />
                    <Ask bw={w.bw_id} field="trade_ok" q={t("contractor.site.qTrade", { trade: fmt.trade(w.trade) })} value={w.trade_ok} />
                  </div>
                ) : (
                  <p className="text-sm text-ok">{t("contractor.day.checked")}</p>
                )}
                {noFit && <p className="text-sm font-semibold text-bad">{t("contractor.day.noFit")}</p>}
                {/* Once signed and the first-arrival check is done, later days skip the briefing block. */}
                {!noFit && (asking || !briefed.has(w.worker_id)) && <Briefing bw={w.bw_id} d={d} valid={briefed.get(w.worker_id)?.expires ?? null} error={briefingError === w.bw_id} />}
                {!noFit && (
                  // Keyed by the saved values so the pickers show what the server stored after every save.
                  <AutoSaveForm key={`${a.start_time}|${a.end_time}`} action={setTimes} className="border-t border-dashed border-line pt-3">
                    <Hidden v={{ bw: w.bw_id, d }} />
                    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                      <label className="block"><span className="label">{t("contractor.day.entry")}</span>
                        <TimeField name="start" defaultValue={a.start_time ?? ""} from={4} to={23} placeholder={t("contractor.day.entry")} className="num" /></label>
                      <label className="block"><span className="label">{t("contractor.day.exit")}</span>
                        <TimeField name="end" defaultValue={a.end_time ?? ""} from={4} to={23} placeholder={t("contractor.day.stillHere")} className="num" /></label>
                      <div className="min-w-14 pb-2.5 text-end font-display text-[20px] font-bold text-ink" data-hours>
                        {a.hours != null ? t("contractor.count.hours", { n: h(a.hours) }) : "…"}
                      </div>
                    </div>
                    {a.end_time && a.hours == null && <p className="mt-2 text-xs font-semibold text-bad">{t("contractor.day.checkTimes")}</p>}
                  </AutoSaveForm>
                )}
                <form action={markArrival}><Hidden v={{ bw: w.bw_id, d, v: "clear" }} />
                  <button data-act="undo" className="min-h-10 w-full text-center text-xs text-muted underline">{t("contractor.day.undoArrived")}</button></form>
              </>
            )}
          </section>
        );
      })}

      {arrived > 0 && <p className="px-1 text-xs text-muted">{t("contractor.day.rule", { after: BREAK.afterHours, minutes: BREAK.minutes })}</p>}

      {d === today && stillHere.length > 0 && (
        <form action={endDay} className="space-y-1.5">
          <Hidden v={{ id: b.id, d }} />
          <button data-act="end-day" className="btn-hazard w-full py-4 text-[17px]">{t("contractor.day.endAll", { time: now })}</button>
          <p className="text-center text-xs text-muted">{t("contractor.day.endAllNote")}</p>
        </form>
      )}
      {everyoneMarked && arrived > 0 && stillHere.length === 0 && <Notice tone="ok">{t("contractor.day.allDone")}</Notice>}

      {showClose ? (
        // Keyed by the suggested hours so the form refreshes after attendance changes (inputs are uncontrolled).
        <form key={[...sums.values()].map((s) => s.hours).join(",")} action={approveHours} className="card space-y-4 p-4" data-approve>
          <input type="hidden" name="id" value={b.id} />
          <h2 className="text-[22px] font-bold text-ink">{b.days > 1 ? t("contractor.site.endJob") : t("contractor.site.endDay")}</h2>
          {billed.some((w) => sums.get(w.bw_id)!.recorded) && <p className="text-xs text-muted">{t("contractor.day.approveNote")}</p>}
          {billed.map((w) => {
            const s = sums.get(w.bw_id)!;
            const basis = [
              s.worked ? t("contractor.count.workDays", { n: s.worked }) : null,
              s.missed ? t("contractor.day.basisMissed", { n: s.missed }) : null,
              s.unrecorded ? t("contractor.day.basisPlanned", { n: s.unrecorded, h: b.hours }) : null,
            ].filter(Boolean).join(" · ");
            return (
              <div key={w.bw_id} className="space-y-2 border-t border-line pt-3">
                <div className="flex items-center gap-2">
                  <Avatar w={w} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{displayName(w)}</div>
                    <div className="text-xs text-muted">{basis}</div>
                  </div>
                  <label className="flex items-center gap-1 text-sm">
                    <input type="number" inputMode="decimal" name={`hours_${w.bw_id}`} defaultValue={s.hours} min={0} max={s.cap} step={0.25} className="input w-20 py-1.5 text-center" aria-label={displayName(w)} /> {t("contractor.site.hoursUnit")}
                  </label>
                </div>
                <div className="flex gap-1" role="radiogroup" aria-label={t("contractor.site.rating")}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="chip-muted cursor-pointer px-3 py-1.5 text-sm has-[:checked]:bg-hazard has-[:checked]:text-ink">
                      <input type="radio" name={`rating_${w.bw_id}`} value={n} defaultChecked={n === 5} className="sr-only" />
                      <span className="num">{n}</span>★
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WORK_TAGS.map((tag) => (
                    <label key={tag} className="chip-muted cursor-pointer px-2.5 py-1 has-[:checked]:bg-ink has-[:checked]:text-white">
                      <input type="checkbox" name={`tags_${w.bw_id}`} value={tag} className="sr-only" />{fmt.tag(tag)}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {unbilled.length > 0 && <p className="border-t border-line pt-3 text-sm text-bad">{t("contractor.day.notBilled", { names: unbilled.map(displayName).join(", ") })}</p>}
          <textarea name="review" className="input" rows={2} placeholder={t("contractor.site.reviewPlaceholder")} />
          <button className="btn-ok w-full py-3 text-base">{t("contractor.site.submit")}</button>
          <p className="text-center text-xs text-muted">{t("contractor.site.submitNote")}</p>
        </form>
      ) : today < b.end_date ? (
        <p className="text-center text-xs text-muted">{t("contractor.site.closedNote")}</p>
      ) : (
        <Link href={`/c/orders/${b.id}/site?d=${days[days.length - 1]}`} className="btn-ok w-full py-3 text-base">{t("contractor.order.approveHours")}</Link>
      )}
    </div>
  );
}
