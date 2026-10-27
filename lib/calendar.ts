import { all } from "./db";
import { addDays, isWorkday, todayISO } from "./domain";
import { bookingsWhere } from "./queries";

// Month calendars for both sides. A month is "YYYY-MM"; the grid runs Sunday to Saturday (the Israeli week),
// so it starts on the Sunday on or before the 1st and ends on the Saturday on or after the last day.

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const parseMonth = (v: string | undefined, fallback = todayISO().slice(0, 7)) => (v && MONTH.test(v) ? v : fallback);
export const isISODate = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

export function shiftMonth(month: string, n: number) {
  const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, "0")}`;
}

const weekday = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDay();

export function monthGrid(month: string) {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const start = addDays(first, -weekday(first));
  const end = addDays(last, 6 - weekday(last));
  const weeks: string[][] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  return { first, last, start, end, weeks };
}

// ── Agency: assigned vs available per work day ──────────────────────────
export type CalWorker = { id: number; first_name: string; last_name: string; trade: string; photo: string | null; country: string };
export type CalAssignment = { worker_id: number; booking_id: number; date: string; end_date: string; trade: string; city: string; address: string; status: string; company: string };
export type AgencyDay = { assigned: number; free: number; total: number };

/**
 * "Assigned" = an active worker on an approved (or since completed) booking that covers the day.
 * Two queries for the whole range; the per-day counts are computed here, work days only.
 */
export async function agencyCalendar(agencyId: number, from: string, to: string, trade?: string) {
  const tf = trade ? " AND w.trade = ?" : "";
  const tp = trade ? [trade] : [];
  const workers = await all<CalWorker>(
    `SELECT w.id, w.first_name, w.last_name, w.trade, w.photo, w.country FROM workers w WHERE w.agency_id = ? AND w.active = 1${tf} ORDER BY w.first_name, w.last_name`,
    agencyId, ...tp
  );
  const assignments = await all<CalAssignment>(
    `SELECT bw.worker_id, b.id AS booking_id, b.date, b.end_date, b.trade, b.city, b.address, b.status, c.company
     FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id JOIN workers w ON w.id = bw.worker_id JOIN contractors c ON c.id = b.contractor_id
     WHERE b.agency_id = ? AND w.agency_id = ? AND w.active = 1 AND bw.state = 'assigned' AND b.status IN ('approved','completed')
       AND b.date <= ? AND b.end_date >= ?${tf}
     ORDER BY b.date, b.id`,
    agencyId, agencyId, to, from, ...tp
  );
  const days = new Map<string, AgencyDay>();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (!isWorkday(d)) continue;
    const busy = new Set(assignments.filter((a) => a.date <= d && a.end_date >= d).map((a) => a.worker_id));
    days.set(d, { assigned: busy.size, free: workers.length - busy.size, total: workers.length });
  }
  return { workers, assignments, days };
}

/** Who works where on one day, and who is free (grouped by trade), from the data agencyCalendar already loaded. */
export function agencyDayDetail(day: string, workers: CalWorker[], assignments: CalAssignment[]) {
  const byId = new Map(workers.map((w) => [w.id, w]));
  const today = assignments.filter((a) => a.date <= day && a.end_date >= day);
  const bookings = new Map<number, { booking: CalAssignment; workers: CalWorker[] }>();
  for (const a of today) {
    const w = byId.get(a.worker_id);
    if (!w) continue;
    const g = bookings.get(a.booking_id) ?? { booking: a, workers: [] };
    g.workers.push(w);
    bookings.set(a.booking_id, g);
  }
  const busy = new Set(today.map((a) => a.worker_id));
  const free = new Map<string, CalWorker[]>();
  for (const w of workers) if (!busy.has(w.id)) free.set(w.trade, [...(free.get(w.trade) ?? []), w]);
  return { bookings: [...bookings.values()], free };
}

// ── Contractor: bookings that touch the month ───────────────────────────
/** Live and finished bookings in the range. Rejected and cancelled requests stay in the list view only. */
export const contractorCalendar = (contractorId: number, from: string, to: string) =>
  bookingsWhere(`b.contractor_id = ? AND b.status IN ('requested','approved','completed') AND b.date <= ? AND b.end_date >= ? ORDER BY b.date, b.id`, contractorId, to, from);

// ── Worker availability in the near future ──────────────────────────────
export type WorkerAvailability = { free: number; total: number; pct: number; days: { date: string; busy: boolean }[] };

/** The next `workdays` work days (Sun–Thu) from `from`, inclusive when `from` is a work day. */
export function workdaysFrom(from: string, workdays = 10) {
  const out: string[] = [];
  for (let d = from; out.length < workdays; d = addDays(d, 1)) if (isWorkday(d)) out.push(d);
  return out;
}

/**
 * Free work days per worker over the next `workdays` work days, one query for all of them.
 * Busy = assigned to an approved booking that covers the day (the same rule as the agency calendar).
 * pct is the share of those days the worker is free, 0 to 100.
 */
export async function workerAvailability(workerIds: number[], from = todayISO(), workdays = 10): Promise<Map<number, WorkerAvailability>> {
  const out = new Map<number, WorkerAvailability>();
  const ids = [...new Set(workerIds)];
  if (!ids.length) return out;
  const dates = workdaysFrom(from, workdays);
  const rows = await all<{ worker_id: number; date: string; end_date: string }>(
    `SELECT bw.worker_id, b.date, b.end_date FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE bw.worker_id IN (${ids.map(() => "?").join(",")}) AND bw.state = 'assigned' AND b.status IN ('approved','completed')
       AND b.date <= ? AND b.end_date >= ?`,
    ...ids, dates[dates.length - 1], dates[0]
  );
  for (const id of ids) {
    const mine = rows.filter((r) => r.worker_id === id);
    const days = dates.map((date) => ({ date, busy: mine.some((r) => r.date <= date && r.end_date >= date) }));
    const free = days.filter((d) => !d.busy).length;
    out.set(id, { free, total: days.length, pct: Math.round((free / days.length) * 100), days });
  }
  return out;
}
