import { endOfBlock, nextWorkday, todayISO } from "./domain";

// Demo sale price (lib/promotions.ts): agency 1 offers 15% off formwork for the next five work days, so the default
// contractor search (formwork, Netanya, next work day) shows the struck-through price and the sale chip.
// Called from lib/seed.ts after agencies exist, with the same query function. Not tied to a campaign.
type Q = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

const AGENCY = 1;

export async function seedPromotions(q: Q) {
  if ((await q(`SELECT 1 FROM promotions WHERE agency_id = $1 LIMIT 1`, [AGENCY])).length) return;
  const from = nextWorkday(todayISO());
  await q(`INSERT INTO promotions (agency_id, trade, date_from, date_to, pct, created_at) VALUES ($1, $2, $3, $4, $5, now_txt())`, [AGENCY, "formwork", from, endOfBlock(from, 5), 15]);
}
