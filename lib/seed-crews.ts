// Demo crews for agency 1 (crew names are data the agency typed, so they're in Hebrew). i18n-data-file
// Called from lib/seed.ts after workers, documents and bookings exist, with the same query function.
type Q = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

const AGENCY = 1;
const CREWS = [
  { name: "צוות טפסנות צפון", trades: [["formwork", 4]] },
  { name: "צוות שלד משולב", trades: [["formwork", 3], ["rebar", 2]] },
  { name: "צוות ריצוף מרכז", trades: [["tiling", 3]] },
] as const;

export async function seedCrews(q: Q) {
  if ((await q(`SELECT 1 FROM agency_crews WHERE agency_id = $1 LIMIT 1`, [AGENCY])).length) return;
  // Prefer workers with complete documents and no placements in the next two weeks, so the crews actually show
  // up in contractor search on the demo dates. The most senior member leads.
  const pick = async (trade: string, n: number) =>
    (await q(
      `SELECT w.id FROM workers w
       WHERE w.agency_id = $1 AND w.active = 1 AND w.trade = $2 AND w.crew_id IS NULL
       ORDER BY (SELECT COUNT(*) FROM documents d WHERE d.worker_id = w.id AND d.status = 'verified' AND d.type IN ('visa','passport','insurance')) DESC,
                (SELECT COUNT(*) FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
                 WHERE bw.worker_id = w.id AND bw.state = 'assigned' AND b.status IN ('requested','approved')
                   AND b.end_date >= to_char(current_date, 'YYYY-MM-DD') AND b.date <= to_char(current_date + 14, 'YYYY-MM-DD')),
                w.years DESC, w.id
       LIMIT $3`,
      [AGENCY, trade, n]
    )).map((r) => Number(r.id));

  for (const c of CREWS) {
    const ids: number[] = [];
    for (const [trade, n] of c.trades) ids.push(...(await pick(trade, n)));
    if (ids.length < 2) continue;
    const [lead] = await q(`SELECT id FROM workers WHERE id = ANY($1::int[]) ORDER BY years DESC, id LIMIT 1`, [ids]);
    const [{ id }] = await q(`INSERT INTO agency_crews (agency_id, name, leader_worker_id) VALUES ($1, $2, $3) RETURNING id`, [AGENCY, c.name, lead.id]);
    await q(`UPDATE workers SET crew_id = $1 WHERE agency_id = $2 AND id = ANY($3::int[])`, [id, AGENCY, ids]);
  }
}
