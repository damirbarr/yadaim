import { displayName, type BookingRow } from "@/lib/queries";
import { todayISO } from "@/lib/domain";
import { bookingDays, hoursDigits, isNoFit, workerHours } from "@/lib/attendance";
import { getI18n } from "@/lib/i18n/server";

/** Read-only daily attendance of a booking: one block per work day so far (latest first), one line per worker,
 *  and each worker's total. Shown to the contractor on the booking page and to the agency on the request page. */
export async function AttendanceTable({ b, note }: { b: BookingRow; note?: string }) {
  const { t, fmt } = await getI18n();
  const today = todayISO();
  const crew = b.workers.filter((w) => w.state === "assigned");
  const days = bookingDays(b).filter((d) => d <= today || crew.some((w) => w.attendance.some((a) => a.date === d))).reverse();
  const recorded = crew.some((w) => w.attendance.length > 0);
  const h = (n: number) => fmt.num(n, hoursDigits(n));
  return (
    <section className="card" data-attendance>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-5 py-3">
        <h2 className="text-[20px] font-bold text-ink">{t("contractor.day.table.title")}</h2>
        <span className="text-xs text-muted">{t("contractor.day.table.note")}</span>
      </div>
      {note && <p className="border-b border-dashed border-line px-5 py-2.5 text-xs text-muted">{note}</p>}
      {!recorded ? (
        <p className="paper-grid px-5 py-5 text-sm text-muted">{t("contractor.day.table.empty")}</p>
      ) : (
        <>
          {days.map((d) => (
            <div key={d} className="border-b border-dashed border-line px-5 py-3">
              <div className="mb-1.5 text-sm font-bold text-ink">{fmt.prettyDate(d)}</div>
              <ul className="space-y-1">
                {crew.map((w) => {
                  const a = w.attendance.find((x) => x.date === d);
                  return (
                    <li key={w.bw_id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 text-sm">
                      <span className="truncate">{displayName(w)}</span>
                      <span dir="ltr" className="num text-muted">{a?.arrived === 1 && a.start_time ? `${a.start_time}–${a.end_time ?? "…"}` : ""}</span>
                      <span className="min-w-12 whitespace-nowrap text-end">
                        {!a || a.arrived == null ? <span className="text-xs text-muted">{t("contractor.day.table.notRecorded")}</span>
                          : a.arrived === 0 ? <span className="text-xs font-semibold text-bad">{t("contractor.day.table.noShow")}</span>
                          : isNoFit(w) ? <span className="text-xs font-semibold text-bad">{t("contractor.day.table.noFit")}</span>
                          : a.hours != null ? <span className="num font-semibold">{t("contractor.count.hours", { n: h(a.hours) })}</span>
                          : <span className="text-xs text-ok">{t("contractor.day.table.onSite")}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="bg-paper px-5 py-3">
            <div className="mb-1.5 text-xs font-semibold text-muted">{t("contractor.day.table.total")}</div>
            <ul className="space-y-1">
              {crew.map((w) => {
                const worked = w.attendance.filter((a) => a.arrived === 1);
                const sum = worked.reduce((n, a) => n + (a.hours ?? 0), 0);
                return (
                  <li key={w.bw_id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{displayName(w)}</span>
                    {isNoFit(w) ? <span className="text-xs font-semibold text-bad">{t("contractor.day.table.noFit")}</span>
                      : workerHours(b, w).cap === 0 ? <span className="text-xs font-semibold text-bad">{t("contractor.day.table.noShow")}</span>
                      : <span className="num font-semibold">{t("contractor.day.table.totalLine", { hours: h(sum), days: t("contractor.count.workDays", { n: worked.length }) })}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
