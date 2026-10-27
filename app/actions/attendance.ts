"use server";
import { revalidatePath } from "next/cache";
import { all, get, run, tx } from "@/lib/db";
import { requireContractor } from "@/lib/auth";
import { getBooking, type Booking } from "@/lib/queries";
import { nowParts, todayISO } from "@/lib/domain";
import { audit } from "@/lib/audit";
import { logEvent } from "@/lib/events";
import { bookingDays, isNoFit, laterOf, planEnd, roundQuarter, TIME_RE, workedHours, type Attendance } from "@/lib/attendance";

// The contractor's work-day screen (/c/orders/[id]/site?d=YYYY-MM-DD): who arrived, entry and exit times.
// Every action is scoped to the caller's own booking and to a booked worker still on the crew, and only for a work
// day of the booking that has already started (today, or an earlier day being filled in after the fact).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Keeps the booking-level summary on booking_workers (arrived / checkin_at), which the agency's screens, swaps and
 *  reliability scores read: arrived = 1 once the worker came on any day, 0 when every recorded day is a no-show. */
async function syncCheckin(bwId: number) {
  await run(
    `UPDATE booking_workers SET
       arrived = CASE WHEN EXISTS (SELECT 1 FROM attendance WHERE booking_worker_id = ? AND arrived = 1) THEN 1
                      WHEN EXISTS (SELECT 1 FROM attendance WHERE booking_worker_id = ? AND arrived = 0) THEN 0 ELSE NULL END,
       checkin_at = CASE WHEN EXISTS (SELECT 1 FROM attendance WHERE booking_worker_id = ? AND arrived = 1) THEN COALESCE(checkin_at, now_txt()) ELSE NULL END
     WHERE id = ?`,
    bwId, bwId, bwId, bwId
  );
}

async function saveDay(bwId: number, date: string, v: { arrived: number | null; start: string | null; end: string | null }, userId: number) {
  await run(
    `INSERT INTO attendance (booking_worker_id, date, arrived, start_time, end_time, hours, recorded_by) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT (booking_worker_id, date) DO UPDATE SET arrived = excluded.arrived, start_time = excluded.start_time, end_time = excluded.end_time,
       hours = excluded.hours, recorded_by = excluded.recorded_by, updated_at = now_txt()`,
    bwId, date, v.arrived, v.start, v.end, v.arrived === 1 ? workedHours(v.start, v.end) : null, userId
  );
}

async function ownDay(bookingId: number, date: string) {
  const { user, contractorId } = await requireContractor("contractor.site");
  const b = await getBooking(bookingId);
  if (!b || b.contractor_id !== contractorId) throw new Error("not found");
  const open = b.status === "approved" && DATE_RE.test(date) && date <= todayISO() && bookingDays(b).includes(date);
  return { user, contractorId, b, open };
}

async function ownWorkerDay(fd: FormData) {
  const bwId = Number(fd.get("bw"));
  const date = String(fd.get("d") ?? "");
  const row = await get<{ booking_id: number; worker_id: number; state: string; identity_ok: string | null; trade_ok: string | null }>(
    `SELECT booking_id, worker_id, state, identity_ok, trade_ok FROM booking_workers WHERE id = ?`, bwId
  );
  if (!row) throw new Error("not found");
  const own = await ownDay(row.booking_id, date);
  if (row.state !== "assigned") throw new Error("not found");
  const day = await get<Attendance>(`SELECT * FROM attendance WHERE booking_worker_id = ? AND date = ?`, bwId, date);
  return { ...own, bwId, date, row, day };
}

const refresh = (b: Booking) => {
  revalidatePath(`/c/orders/${b.id}/site`);
  revalidatePath(`/c/orders/${b.id}`);
  revalidatePath(`/a/requests/${b.id}`);
  revalidatePath("/c");
};

/** Default times when a worker is marked as arrived: today it's "now" (not before the booked start time);
 *  for an earlier day filled in later, the booked start and a full planned day. */
function arrivalTimes(b: Booking, date: string, day?: Attendance) {
  if (day?.start_time) return { start: day.start_time, end: day.end_time };
  if (date < todayISO()) return { start: b.start_time, end: planEnd(b.start_time, b.hours) };
  return { start: laterOf(roundQuarter(nowParts().time), b.start_time), end: null };
}

/** "Arrived" / "did not arrive" / undo, for one worker on one day. */
export async function markArrival(fd: FormData) {
  const { user, contractorId, b, open, bwId, date, row, day } = await ownWorkerDay(fd);
  if (!open) return;
  const v = String(fd.get("v"));
  if (v === "1") {
    const { start, end } = arrivalTimes(b, date, day);
    await saveDay(bwId, date, { arrived: 1, start, end }, user.id);
  } else if (v === "0") {
    await saveDay(bwId, date, { arrived: 0, start: null, end: null }, user.id);
    // The agency hears about it at once so it can send someone else (same event as before daily attendance).
    if (day?.arrived !== 0) await logEvent("noshow", { agency: b.agency_id, contractor: contractorId, booking: b.id }, "noshow", { id: b.id, date });
  } else if (v === "clear") {
    await run(`DELETE FROM attendance WHERE booking_worker_id = ? AND date = ?`, bwId, date);
  } else return;
  await syncCheckin(bwId);
  await audit(user, v === "1" ? "attendance.arrive" : v === "0" ? "attendance.noshow" : "attendance.clear", `booking:${b.id},worker:${row.worker_id}`, date);
  refresh(b);
}

/** Entry / exit time picked for one worker. Saved as soon as a time is chosen. */
export async function setTimes(fd: FormData) {
  const { user, b, open, bwId, date, row, day } = await ownWorkerDay(fd);
  if (!open || day?.arrived !== 1 || isNoFit(row)) return;
  const pick = (k: string, cur: string | null) => {
    if (!fd.has(k)) return cur;
    const s = String(fd.get(k));
    return TIME_RE.test(s) ? s : null;
  };
  const start = pick("start", day.start_time) ?? day.start_time;
  const end = pick("end", day.end_time);
  await saveDay(bwId, date, { arrived: 1, start, end }, user.id);
  await audit(user, "attendance.hours", `booking:${b.id},worker:${row.worker_id}`, `${date} ${start ?? ""}-${end ?? ""}`);
  refresh(b);
}

/** End of the work day: one tap sets the exit time for everyone who is still on site. */
export async function endDay(fd: FormData) {
  const date = String(fd.get("d") ?? "");
  const { user, b, open } = await ownDay(Number(fd.get("id")), date);
  if (!open) return;
  const rows = await all<Attendance & { identity_ok: string | null; trade_ok: string | null }>(
    `SELECT a.*, bw.identity_ok, bw.trade_ok FROM attendance a JOIN booking_workers bw ON bw.id = a.booking_worker_id
     WHERE bw.booking_id = ? AND bw.state = 'assigned' AND a.date = ? AND a.arrived = 1 AND a.end_time IS NULL`,
    b.id, date
  );
  const now = roundQuarter(nowParts().time);
  await tx(async () => {
    for (const r of rows) {
      if (isNoFit(r)) continue;
      const start = r.start_time ?? b.start_time;
      const end = date < todayISO() ? planEnd(start, b.hours) : laterOf(now, start);
      await saveDay(r.booking_worker_id, date, { arrived: 1, start, end }, user.id);
    }
  });
  await audit(user, "attendance.endday", `booking:${b.id}`, `${date} ${now}`);
  refresh(b);
}
