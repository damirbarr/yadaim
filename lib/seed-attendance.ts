// Demo daily attendance. Run after seed() (and seedBriefings()) have written bookings. i18n-data-file
//  1. A multi-day booking for the demo contractor that is in progress today: three work days back, two ahead
//     (one worker missed one day, one day ended early), with today not recorded yet, so the work-day screen opens
//     on a fresh morning with the earlier days filled in. Today's single-day crew is left untouched for the same reason.
//  2. Every completed booking gets the attendance that matches its approved hours (07:00 to 16:30 = 9 paid hours
//     after the break), and a "did not arrive" day for workers who never came.
import { addDays, endOfBlock, hourlyFor, isWorkday, requiredDocs, todayISO } from "./domain";
import { bookingDays, planEnd, workedHours } from "./attendance";

type Query = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
type Row = [bwId: number, date: string, arrived: number, start: string | null, end: string | null];

const SITE = { city: "נתניה", address: "רח' שמואל הנציב 7, נתניה" };

async function insertRows(q: Query, rows: Row[]) {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const ph = chunk.map((_, j) => `(${[1, 2, 3, 4, 5, 6].map((k) => `$${j * 6 + k}`).join(",")})`).join(",");
    await q(
      `INSERT INTO attendance (booking_worker_id, date, arrived, start_time, end_time, hours) VALUES ${ph} ON CONFLICT DO NOTHING`,
      chunk.flatMap(([bw, d, arrived, s, e]) => [bw, d, arrived, s, e, arrived === 1 ? workedHours(s, e) : null])
    );
  }
}

export async function seedAttendance(q: Query) {
  if ((await q(`SELECT 1 FROM attendance LIMIT 1`, [])).length) return 0;
  const today = todayISO();
  const rows: Row[] = [];

  // 1. A booking in progress: demo contractor, demo agency, workers free over the whole block with valid documents.
  let booking = 0;
  if (isWorkday(today)) {
    let start = today;
    for (let n = 0; n < 3; ) { start = addDays(start, -1); if (isWorkday(start)) n++; }
    const end = endOfBlock(start, 6);
    const [contractor] = await q(`SELECT MIN(id) AS id FROM contractors`, []);
    const [agency] = await q(`SELECT id, lodging_discount, transport_rate FROM agencies ORDER BY id LIMIT 1`, []);
    for (const trade of ["masonry", "plaster", "tiling", "formwork"]) {
      const docs = requiredDocs(trade);
      // Free from today to the end of the block; their past days are taken over from the busy history below.
      const free = (await q(
        `SELECT w.id, w.hourly_rate FROM workers w
         WHERE w.agency_id = $1 AND w.active = 1 AND w.trade = $2
           AND NOT EXISTS (SELECT 1 FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
                           WHERE bw.worker_id = w.id AND bw.state = 'assigned' AND b.status IN ('requested','approved')
                             AND b.date <= $4 AND b.end_date >= $3)
           AND (SELECT COUNT(DISTINCT d.type) FROM documents d WHERE d.worker_id = w.id AND d.status = 'verified'
                AND d.expires >= $4 AND d.type = ANY($5::text[])) = $6
         ORDER BY w.years DESC, w.id LIMIT 3`,
        [agency.id, trade, today, end, docs, docs.length]
      )) as { id: number; hourly_rate: number }[];
      if (free.length < 2) continue;
      // The history seed keeps the agency busy, so these workers had single-day jobs on the block's past days:
      // they spent those days on this booking instead (empty bookings left behind are removed).
      await q(
        `DELETE FROM booking_workers bw USING bookings b WHERE b.id = bw.booking_id AND b.status = 'completed'
           AND bw.worker_id = ANY($1::int[]) AND b.date <= $3 AND b.end_date >= $2`,
        [free.map((w) => w.id), start, addDays(today, -1)]
      );
      await q(`DELETE FROM bookings b WHERE b.status = 'completed' AND b.date >= $1 AND NOT EXISTS (SELECT 1 FROM booking_workers bw WHERE bw.booking_id = b.id)`, [start]);
      const [b] = await q(
        `INSERT INTO bookings (contractor_id, agency_id, trade, date, end_date, days, start_time, hours, city, address, lodging, transport, status, pickup_time, driver_name, vehicle_no, created_at, approved_at)
         VALUES ($1,$2,$3,$4,$5,6,'07:00',9,$6,$7,'agency','agency','approved','06:15','ויקטור','58-310-27',$8,$9) RETURNING id`,
        [contractor.id, agency.id, trade, start, end, SITE.city, SITE.address, addDays(start, -4) + " 10:20:00", addDays(start, -4) + " 10:45:00"]
      );
      booking = Number(b.id);
      const rates = { lodging_discount: Number(agency.lodging_discount), transport_rate: Number(agency.transport_rate) };
      const past = bookingDays({ date: start, end_date: end }).filter((d) => d < today);
      for (const [i, w] of free.entries()) {
        const [bw] = await q(
          `INSERT INTO booking_workers (booking_id, worker_id, hourly_rate, arrived, identity_ok, trade_ok, checkin_at) VALUES ($1,$2,$3,1,'yes','yes',$4) RETURNING id`,
          [booking, w.id, hourlyFor(Number(w.hourly_rate), rates, { lodging: "agency", transport: "agency" }), past[0] + " 07:05:00"]
        );
        // Everyone signed this site's safety briefing on the first day.
        await q(`INSERT INTO site_briefings (worker_id, contractor_id, site, signed_at, expires, booking_id) VALUES ($1,$2,$3,$4,$5,$6)`,
          [w.id, contractor.id, SITE.address, past[0], addDays(past[0], 365), booking]);
        past.forEach((d, k) => {
          if (i === 1 && k === 1) rows.push([Number(bw.id), d, 0, null, null]); // missed one day
          else rows.push([Number(bw.id), d, 1, "07:00", i === 0 && k === past.length - 1 ? "15:30" : "16:30"]); // one short day
        });
      }
      await q(`INSERT INTO events (agency_id, contractor_id, booking_id, kind, msg, params, created_at) VALUES ($1,$2,$3,'noshow','noshow',$4,$5)`,
        [agency.id, contractor.id, booking, JSON.stringify({ id: booking, date: past[1] }), past[1] + " 07:40:00"]);
      break;
    }
  }

  // 2. History: one row per completed booking day, consistent with hours_approved.
  const done = (await q(
    `SELECT bw.id, bw.arrived, bw.hours_approved, b.date, b.end_date, b.start_time, b.hours
     FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE b.status = 'completed' AND bw.state = 'assigned' ORDER BY bw.id`,
    []
  )) as { id: number; arrived: number | null; hours_approved: number | null; date: string; end_date: string; start_time: string; hours: number }[];
  for (const r of done) {
    const days = bookingDays(r);
    const perDay = days.length ? (Number(r.hours_approved) || 0) / days.length : 0;
    for (const d of days) {
      if (r.arrived === 0) rows.push([r.id, d, 0, null, null]);
      else rows.push([r.id, d, 1, r.start_time, perDay > 0 ? planEnd(r.start_time, perDay) : null]);
    }
  }

  await insertRows(q, rows);
  return booking;
}
