import "server-only";
import { all, get } from "./db";
import { addDays, hourlyFor, isWorkday, todayISO, DEFAULT_OPTS, TRADES, type AgencyRates } from "./domain";
import { docCheck, docsFor, idleForecast, type Worker } from "./queries";

// Sale prices (מחירי מבצע). An agency offers pct off its workers in one trade for a date window, announced in a
// campaign. Pricing rule, in one place: a booking gets the sale only when EVERY booked day is inside the window
// (date_from <= booking.date and booking.end_date <= date_to). A partial overlap pays the regular price.
// Search, checkout and createBooking all go through promoPcts, so what the contractor sees is what gets stored.

export type Promotion = { id: number; agency_id: number; trade: string; date_from: string; date_to: string; pct: number; campaign_id: number | null; created_at: string; ended_at: string | null };

/** agency_id → sale pct for a booking of `trade` from `from` to `to` (the deepest one, if a few overlap). */
export async function promoPcts(agencyIds: number[], trade: string, from: string, to: string): Promise<Map<number, number>> {
  const m = new Map<number, number>();
  const ids = [...new Set(agencyIds)];
  if (!ids.length) return m;
  const rows = await all<{ agency_id: number; pct: number }>(
    `SELECT agency_id, MAX(pct) AS pct FROM promotions
     WHERE agency_id IN (${ids.map(() => "?").join(",")}) AND trade = ? AND ended_at IS NULL AND date_from <= ? AND date_to >= ?
     GROUP BY agency_id`,
    ...ids, trade, from, to
  );
  for (const r of rows) m.set(r.agency_id, Number(r.pct));
  return m;
}

export const promoPct = async (agencyId: number, trade: string, from: string, to: string) =>
  (await promoPcts([agencyId], trade, from, to)).get(agencyId) ?? 0;

export const campaignPromotion = (campaignId: number, agencyId: number) =>
  get<Promotion>(`SELECT * FROM promotions WHERE campaign_id = ? AND agency_id = ? ORDER BY id DESC LIMIT 1`, campaignId, agencyId);

/** The regular all-in hourly price range of these workers, as contractors see it by default in search. */
export function regularRange(a: AgencyRates, workers: Pick<Worker, "hourly_rate">[]) {
  const hs = workers.map((w) => hourlyFor(w.hourly_rate, a, DEFAULT_OPTS));
  return { low: Math.min(...hs), high: Math.max(...hs) };
}

export type RunOption = { to: string; workDays: number; workers: Worker[] };

/**
 * The workers of `trade` who are free on `from`, and how long they stay free: one option per following work day,
 * holding the workers still free (and with valid documents) on every day up to it. Stops when nobody is left.
 * Busy = on a requested, approved or completed booking, the same rule as the idle forecast on the campaigns page.
 */
export async function freeRun(agencyId: number, trade: string, from: string, horizon = 10): Promise<RunOption[]> {
  if (!isWorkday(from)) return [];
  const days: string[] = [];
  for (let d = from; days.length < horizon; d = addDays(d, 1)) if (isWorkday(d)) days.push(d);
  const workers = await all<Worker>(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND trade = ? ORDER BY first_name, last_name`, agencyId, trade);
  if (!workers.length) return [];
  const docs = await docsFor(workers.map((w) => w.id));
  const rows = await all<{ worker_id: number; date: string; end_date: string }>(
    `SELECT bw.worker_id, b.date, b.end_date FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE b.agency_id = ? AND bw.state = 'assigned' AND b.status IN ('requested','approved','completed') AND b.date <= ? AND b.end_date >= ?`,
    agencyId, days[days.length - 1], from
  );
  const busy = (id: number, d: string) => rows.some((r) => r.worker_id === id && r.date <= d && r.end_date >= d);
  const out: RunOption[] = [];
  let pool = workers;
  for (const [i, d] of days.entries()) {
    pool = pool.filter((w) => !busy(w.id, d) && docCheck(docs.get(w.id)!, w.trade, d).ok);
    if (!pool.length) break;
    out.push({ to: d, workDays: i + 1, workers: pool });
  }
  return out;
}

// ── What an offer is about: one trade, a date window, the workers in it ──
export type OfferWindow = { trade: string; from: string; to: string; workDays: number; idleDays: number; workers: Worker[] };

/**
 * An offer that starts on a day picked in the calendar: one window per possible last day, each at least the
 * agency's minimum placement long (a shorter window could never be booked, so it isn't offered).
 */
export async function datedWindows(agencyId: number, trade: string, from: string, minDays: number): Promise<OfferWindow[]> {
  if (!TRADES.some((x) => x.key === trade) || !/^\d{4}-\d{2}-\d{2}$/.test(from) || from < todayISO()) return [];
  const run = await freeRun(agencyId, trade, from, Math.max(10, minDays));
  return run.filter((o) => o.workDays >= minDays).map((o) => ({ trade, from, to: o.to, workDays: o.workDays, idleDays: o.workDays * o.workers.length, workers: o.workers }));
}

/** The regular offer per trade: idle days over the next two weeks (idleForecast), with the workers behind them. */
export async function idleWindows(agencyId: number): Promise<OfferWindow[]> {
  const idle = await idleForecast(agencyId, 10);
  const ids = idle.flatMap((i) => i.workerIds);
  const ws = ids.length ? await all<Worker>(`SELECT * FROM workers WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids) : [];
  const byId = new Map(ws.map((w) => [w.id, w]));
  return idle.map((i) => ({ trade: i.trade, from: i.from, to: i.to, workDays: 0, idleDays: i.idleDays, workers: i.workerIds.map((id) => byId.get(id)!).filter(Boolean) }));
}
