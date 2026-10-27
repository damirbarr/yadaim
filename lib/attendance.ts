import { addDays, isWorkday } from "./domain";

// Pure helpers (no database access, so the demo seed can use them too). Queries live in lib/queries.ts
// (attendanceFor) and app/actions/attendance.ts (writes).
//
// Daily attendance on site (table `attendance`, one row per booked worker per work day).
// The contractor marks who arrived, the entry time and the exit time; billing reads the result:
//   - a day marked "did not arrive" is never billed,
//   - a worker marked as not suitable (identity or trade "no") is never billed for the booking,
//   - hours suggested at the end of the booking = recorded hours, plus planned hours for days nobody recorded.
// Bookings without any rows (history from before daily attendance) keep the old rule: planned hours per day.

/** Break rule shown to the contractor: a day longer than 6 hours on site has a 30-minute unpaid break. */
export const BREAK = { afterHours: 6, minutes: 30 };

export type Attendance = {
  id: number; booking_worker_id: number; date: string; arrived: number | null; start_time: string | null; end_time: string | null;
  hours: number | null; note: string | null; recorded_by: number | null; created_at: string; updated_at: string;
};

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => {
  const c = Math.max(0, Math.min(23 * 60 + 45, m));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};
/** Times are kept in 15-minute steps, the same steps as the time picker (07:42 → 07:45). */
export const roundQuarter = (t: string) => toTime(Math.round(toMin(t) / 15) * 15);
export const laterOf = (a: string, b: string) => (a > b ? a : b);

/** Paid hours between entry and exit: the span, minus the break when the span is over 6 hours. Null when not computable. */
export function workedHours(start: string | null, end: string | null): number | null {
  if (!start || !end || !TIME_RE.test(start) || !TIME_RE.test(end)) return null;
  const span = toMin(end) - toMin(start);
  if (span < 0) return null;
  const paid = span > BREAK.afterHours * 60 ? span - BREAK.minutes : span;
  return Math.round((paid / 60) * 4) / 4;
}
/** The exit time that makes a day of `hours` paid hours (used to pre-fill days recorded after the fact). */
export function planEnd(start: string, hours: number) {
  const m = hours * 60;
  return toTime(toMin(start) + m + (m + BREAK.minutes > BREAK.afterHours * 60 ? BREAK.minutes : 0));
}

/** Decimal places to show for an hours value in quarter steps: 8 → 0, 8.5 → 1, 8.25 → 2 (use with fmt.num). */
export const hoursDigits = (n: number) => (Number.isInteger(n) ? 0 : Number.isInteger(n * 2) ? 1 : 2);

/** The booking's work days (Saturday off), in order. Their count equals bookings.days. */
export function bookingDays(b: { date: string; end_date: string }) {
  const out: string[] = [];
  for (let d = b.date; d <= b.end_date; d = addDays(d, 1)) if (isWorkday(d)) out.push(d);
  return out;
}

type Fit = { identity_ok: string | null; trade_ok: string | null };
export const isNoFit = (w: Fit) => w.identity_ok === "no" || w.trade_ok === "no";

export type WorkerHours = {
  hours: number;      // suggested billable hours for the whole booking
  cap: number;        // the most the contractor may approve (0 = never billed)
  worked: number;     // days marked as arrived
  missed: number;     // days marked as "did not arrive"
  unrecorded: number; // booking days without a record (counted at the planned hours)
  recorded: boolean;  // any attendance at all for this worker
};
/** Billable hours for one booked worker, from daily attendance when there is any. */
export function workerHours(b: { hours: number; days: number }, w: Fit & { arrived: number | null; attendance?: Attendance[] }): WorkerHours {
  const rows = w.attendance ?? [];
  const none = { hours: 0, cap: 0, worked: 0, missed: 0, unrecorded: 0, recorded: rows.length > 0 };
  if (isNoFit(w)) return none;
  if (!rows.length) {
    if (w.arrived === 0) return { ...none, missed: b.days };
    return { hours: b.hours * b.days, cap: b.hours * b.days + 20, worked: 0, missed: 0, unrecorded: b.days, recorded: false };
  }
  let hours = 0, worked = 0, missed = 0;
  for (const r of rows) {
    if (r.arrived === 0) missed++;
    else if (r.arrived === 1) { worked++; hours += r.hours ?? b.hours; }
  }
  const unrecorded = Math.max(0, b.days - worked - missed);
  hours += unrecorded * b.hours;
  const billableDays = worked + unrecorded;
  return { hours, cap: billableDays ? Math.max(hours, billableDays * b.hours + 20) : 0, worked, missed, unrecorded, recorded: true };
}
