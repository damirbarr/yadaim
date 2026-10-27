// Demo site safety briefings. Run after seed() has written bookings: a worker signs the briefing the first
// time they show up at a contractor's site, and it then covers that site for a year.
import { addDays, todayISO, BRIEFING_VALID_DAYS } from "./domain";

type Query = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
type Row = { worker_id: number; contractor_id: number; site: string; signed_at: string; booking_id: number | null };

const key = (r: Pick<Row, "worker_id" | "contractor_id" | "site">) => `${r.worker_id}|${r.contractor_id}|${r.site.trim().replace(/\s+/g, " ").toLowerCase()}`;

export async function seedBriefings(q: Query) {
  const today = todayISO();
  const out = new Map<string, Row>();

  // 1. Every worker who actually started work at a site (arrived and not sent home) signed there on their first day.
  const worked = await q(
    `SELECT bw.worker_id, b.contractor_id, b.address AS site, b.date AS signed_at, b.id AS booking_id
     FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE b.status = 'completed' AND bw.state = 'assigned' AND bw.arrived = 1
       AND COALESCE(bw.identity_ok, '') <> 'no' AND COALESCE(bw.trade_ok, '') <> 'no'
     ORDER BY b.date, b.id, bw.id`,
    []
  );
  for (const r of worked as unknown as Row[]) if (!out.has(key(r))) out.set(key(r), r);

  // 2. History from before the demo's booking window, so the demo contractor's crews show every state:
  //    the first worker on each upcoming crew was briefed at that site months ago, the second one's briefing
  //    has lapsed (signed over a year ago), and the rest still need one on arrival.
  const upcoming = (await q(
    `SELECT b.id, b.contractor_id, b.address, bw.worker_id FROM bookings b JOIN booking_workers bw ON bw.booking_id = b.id
     WHERE b.contractor_id = (SELECT MIN(id) FROM contractors) AND b.status = 'approved' AND b.end_date >= $1 AND bw.state = 'assigned'
     ORDER BY b.date, b.id, bw.id`,
    [today]
  )) as { id: number; contractor_id: number; address: string; worker_id: number }[];
  const seen = new Map<number, number>();
  for (const u of upcoming) {
    const i = seen.get(u.id) ?? 0;
    seen.set(u.id, i + 1);
    if (i > 1) continue;
    const r: Row = { worker_id: u.worker_id, contractor_id: u.contractor_id, site: u.address, signed_at: addDays(today, i === 0 ? -210 : -400), booking_id: null };
    if (!out.has(key(r))) out.set(key(r), r);
  }

  const rows = [...out.values()];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const ph = chunk.map((_, j) => `(${[1, 2, 3, 4, 5, 6].map((k) => `$${j * 6 + k}`).join(",")})`).join(",");
    await q(
      `INSERT INTO site_briefings (worker_id, contractor_id, site, signed_at, expires, booking_id) VALUES ${ph}`,
      chunk.flatMap((r) => [r.worker_id, r.contractor_id, r.site, r.signed_at, addDays(r.signed_at, BRIEFING_VALID_DAYS), r.booking_id])
    );
  }
  return rows.length;
}
