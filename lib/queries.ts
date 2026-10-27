import "server-only";
import { all, get } from "./db";
import {
  addDays, diffDays, endOfBlock, hourlyFor, isWorkday, regionOf, requiredDocs, todayISO, DOC_TYPES, type PriceOpts,
} from "./domain";

export type Agency = {
  id: number; name: string; slug: string; license_no: string; verified: number; city: string; regions: string;
  phone: string | null; about: string | null; lodging_discount: number; transport_rate: number; suspended: number;
  auto_campaign: number; min_days: number;
};
export type Contractor = { id: number; company: string; registry_no: string; verified: number; contact_name: string; phone: string | null; city: string | null; classification: string | null };
export type Worker = {
  id: number; agency_id: number; first_name: string; last_name: string; trade: string; years: number; country: string;
  lang: string; phone: string | null; passport_no: string | null; hourly_rate: number; active: number; photo: string | null;
  token: string; skills: string | null;
};
export type Doc = { id: number; worker_id: number; type: string; number: string | null; expires: string | null; status: string; file: string | null; verified_at: string | null; renewal_requested_at: string | null };
export type Booking = {
  id: number; contractor_id: number; agency_id: number; trade: string; date: string; end_date: string; days: number; source: string;
  start_time: string; hours: number; city: string; address: string; lodging: "agency" | "contractor"; transport: "agency" | "contractor";
  status: string; notes: string | null; pickup_time: string | null; driver_name: string | null; vehicle_no: string | null;
  campaign_id: number | null; agency_note: string | null; created_at: string; approved_at: string | null; completed_at: string | null;
};
export type BW = {
  id: number; booking_id: number; worker_id: number; hourly_rate: number; state: string; arrived: number | null;
  identity_ok: string | null; trade_ok: string | null; checkin_at: string | null; hours_approved: number | null;
  rating: number | null; tags: string | null; review: string | null;
};

export const displayName = (w: Pick<Worker, "first_name" | "last_name">) => `${w.first_name} ${w.last_name.charAt(0)}.`;
export const maskPassport = (p: string | null) => (p ? `•••${p.slice(-4)}` : "-");
const marks = (n: number) => Array(n).fill("?").join(",");

export const getAgency = (id: number) => get<Agency>(`SELECT * FROM agencies WHERE id = ?`, id);
export const getWorker = (id: number) => get<Worker>(`SELECT * FROM workers WHERE id = ?`, id);
export const getBooking = (id: number) => get<Booking>(`SELECT * FROM bookings WHERE id = ?`, id);
export const getContractor = (id: number) => get<Contractor>(`SELECT * FROM contractors WHERE id = ?`, id);
export const workerDocs = (workerId: number) =>
  all<Doc>(`SELECT * FROM documents WHERE worker_id = ? ORDER BY CASE type WHEN 'visa' THEN 0 WHEN 'passport' THEN 1 WHEN 'insurance' THEN 2 WHEN 'safety' THEN 3 ELSE 4 END, id`, workerId);
export const count = async (sql: string, ...args: unknown[]) => (await get<{ n: number }>(sql, ...args))?.n ?? 0;

// ── Worker reputation ────────────────────────────────────────────────────
export type WorkerStats = { jobs: number; rating: number | null; arrival: number | null; match: number | null; days: number };
export async function workerStats(ids: number[]): Promise<Map<number, WorkerStats>> {
  const out = new Map<number, WorkerStats>();
  if (!ids.length) return out;
  const rows = await all<{ worker_id: number } & WorkerStats>(
    `SELECT bw.worker_id, COUNT(DISTINCT b.id)::int AS jobs, AVG(bw.rating)::float8 AS rating,
            AVG(bw.arrived)::float8 AS arrival,
            AVG(CASE bw.trade_ok WHEN 'yes' THEN 1.0 WHEN 'partial' THEN 0.5 WHEN 'no' THEN 0 END)::float8 AS match,
            COALESCE(SUM(b.days), 0)::int AS days
     FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE b.status = 'completed' AND bw.state = 'assigned' AND bw.worker_id IN (${marks(ids.length)})
     GROUP BY bw.worker_id`,
    ...ids
  );
  for (const id of ids) out.set(id, { jobs: 0, rating: null, arrival: null, match: null, days: 0 });
  for (const r of rows) out.set(r.worker_id, r);
  return out;
}

// ── Agency reliability (drives search ranking; low score = out of search) ──
export type Reliability = { score: number; arrival: number; match: number; quality: number; cancels: number; tier: { tone: "good" | "ok" | "warn" | "bad" } }; // shown as t(`domain.reliability.${tone}`)
export async function agencyReliability(agencyId: number): Promise<Reliability> {
  const since = addDays(todayISO(), -90);
  const r = (await get<{ arrival: number | null; match: number | null; rating: number | null }>(
    `SELECT AVG(bw.arrived)::float8 AS arrival,
            AVG(CASE bw.trade_ok WHEN 'yes' THEN 1.0 WHEN 'partial' THEN 0.5 WHEN 'no' THEN 0 END)::float8 AS match,
            AVG(bw.rating)::float8 AS rating
     FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE b.agency_id = ? AND b.status = 'completed' AND bw.state = 'assigned' AND b.date >= ? AND bw.arrived IS NOT NULL`,
    agencyId, since
  ))!;
  const cancels = await count(`SELECT COUNT(*)::int AS n FROM events WHERE agency_id = ? AND kind = 'agency_cancel' AND created_at >= ?`, agencyId, since);
  const arrival = r.arrival ?? 1, match = r.match ?? 1, quality = r.rating ? r.rating / 5 : 0.9;
  const score = Math.max(0, Math.min(100, Math.round(100 * arrival * match * quality) - cancels * 4));
  const tier =
    score >= 90 ? { tone: "good" as const }
    : score >= 75 ? { tone: "ok" as const }
    : score >= 60 ? { tone: "warn" as const }
    : { tone: "bad" as const };
  return { score, arrival, match, quality, cancels, tier };
}

// ── Availability & documents ─────────────────────────────────────────────
/** Worker ids that already have an active assignment overlapping [from, to]. */
export async function busyWorkers(from: string, to: string, excludeBooking = 0): Promise<Set<number>> {
  const rows = await all<{ worker_id: number }>(
    `SELECT DISTINCT bw.worker_id FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE bw.state = 'assigned' AND b.status IN ('requested','approved') AND b.date <= ? AND b.end_date >= ? AND b.id != ?`,
    to, from, excludeBooking
  );
  return new Set(rows.map((r) => r.worker_id));
}

export type DocCheck = { ok: boolean; missing: string[]; expiring: { type: string; expires: string }[] };
export function docCheck(docs: Doc[], tradeKey: string, until: string): DocCheck {
  const missing: string[] = [];
  const expiring: { type: string; expires: string }[] = [];
  for (const t of requiredDocs(tradeKey)) {
    const d = docs.find((x) => x.type === t && x.status === "verified");
    if (!d || (d.expires && d.expires < until)) missing.push(t);
    else if (d.expires && diffDays(until, d.expires) <= 60) expiring.push({ type: t, expires: d.expires });
  }
  return { ok: missing.length === 0, missing, expiring };
}

export async function docsFor(ids: number[]): Promise<Map<number, Doc[]>> {
  const m = new Map<number, Doc[]>();
  if (!ids.length) return m;
  const rows = await all<Doc>(`SELECT * FROM documents WHERE worker_id IN (${marks(ids.length)})`, ...ids);
  for (const id of ids) m.set(id, []);
  for (const d of rows) m.get(d.worker_id)!.push(d);
  return m;
}

// ── Contractor search ────────────────────────────────────────────────────
export type SearchQuery = { trade: string; city: string; date: string; days: number; count: number } & PriceOpts;
export type SearchHit = {
  worker: Worker; agency: Agency; reliability: Reliability; stats: WorkerStats; docs: DocCheck;
  hourly: number; daily: number; withContractor: number; heightsOk: boolean;
};

export async function searchWorkers(q: SearchQuery, contractorId?: number): Promise<SearchHit[]> {
  const end = endOfBlock(q.date, q.days);
  const region = regionOf(q.city);
  const agencies = (await all<Agency>(`SELECT * FROM agencies WHERE verified = 1 AND suspended = 0`)).filter(
    (a) => a.regions.split(",").includes(region) && a.min_days <= q.days
  );
  if (!agencies.length) return [];
  const rel = new Map(await Promise.all(agencies.map(async (a) => [a.id, await agencyReliability(a.id)] as const)));
  const eligible = agencies.filter((a) => rel.get(a.id)!.score >= 60);
  const byId = new Map(eligible.map((a) => [a.id, a]));
  if (!eligible.length) return [];
  const workers = await all<Worker>(`SELECT * FROM workers WHERE active = 1 AND trade = ? AND agency_id IN (${marks(eligible.length)})`, q.trade, ...eligible.map((a) => a.id));
  const busy = await busyWorkers(q.date, end);
  const free = workers.filter((w) => !busy.has(w.id));
  const [docs, stats, history] = await Promise.all([
    docsFor(free.map((w) => w.id)),
    workerStats(free.map((w) => w.id)),
    contractorId ? workedWith(contractorId) : Promise.resolve(new Map<number, number>()),
  ]);

  const hits: SearchHit[] = [];
  for (const w of free) {
    const dc = docCheck(docs.get(w.id)!, w.trade, end);
    if (!dc.ok) continue;
    const agency = byId.get(w.agency_id)!;
    const hourly = hourlyFor(w.hourly_rate, agency, q);
    hits.push({
      worker: w, agency, reliability: rel.get(w.agency_id)!, stats: stats.get(w.id)!, docs: dc,
      hourly, daily: hourly * q.hours, withContractor: history.get(w.id) ?? 0, heightsOk: (docs.get(w.id) ?? []).some((d) => d.type === "heights"),
    });
  }
  // Ranking: agency reliability is the main lever (enforcement without fines), then the worker's own record.
  hits.sort(
    (a, b) =>
      b.withContractor - a.withContractor ||
      b.reliability.score - a.reliability.score ||
      (b.stats.rating ?? 4.5) - (a.stats.rating ?? 4.5) ||
      a.daily - b.daily
  );
  return hits;
}

/** worker_id → number of completed jobs with this contractor */
export async function workedWith(contractorId: number) {
  const rows = await all<{ worker_id: number; n: number }>(
    `SELECT bw.worker_id, COUNT(*)::int AS n FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE b.contractor_id = ? AND b.status = 'completed' AND bw.state = 'assigned' AND bw.arrived = 1 GROUP BY bw.worker_id`,
    contractorId
  );
  return new Map(rows.map((r) => [r.worker_id, r.n]));
}

export function recentJobs(workerId: number, limit = 5) {
  return all<{ date: string; days: number; city: string; trade: string; company: string; rating: number | null; review: string | null; tags: string | null }>(
    `SELECT b.date, b.days, b.city, b.trade, c.company, bw.rating, bw.review, bw.tags
     FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id JOIN contractors c ON c.id = b.contractor_id
     WHERE bw.worker_id = ? AND b.status = 'completed' AND bw.state = 'assigned' ORDER BY b.date DESC LIMIT ?`,
    workerId, limit
  );
}

// ── Booking views ────────────────────────────────────────────────────────
export type BookingWorker = BW & Worker & { bw_id: number; base_rate: number };
export type BookingRow = Booking & { agency_name: string; agency_phone: string | null; company: string; contact_name: string; contractor_phone: string | null; registry_no: string; classification: string | null; workers: BookingWorker[] };
export async function bookingsWhere(where: string, ...args: unknown[]): Promise<BookingRow[]> {
  const rows = await all<BookingRow>(
    `SELECT b.*, a.name AS agency_name, a.phone AS agency_phone, c.company, c.contact_name, c.phone AS contractor_phone, c.registry_no, c.classification
     FROM bookings b JOIN agencies a ON a.id = b.agency_id JOIN contractors c ON c.id = b.contractor_id WHERE ${where}`,
    ...args
  );
  if (!rows.length) return rows;
  const ws = await all<BookingWorker>(
    `SELECT bw.*, bw.id AS bw_id, w.first_name, w.last_name, w.trade, w.years, w.country, w.lang, w.phone, w.passport_no, w.hourly_rate AS base_rate, w.photo, w.token, w.skills, w.agency_id
     FROM booking_workers bw JOIN workers w ON w.id = bw.worker_id WHERE bw.booking_id IN (${marks(rows.length)}) ORDER BY bw.id`,
    ...rows.map((r) => r.id)
  );
  for (const r of rows) r.workers = ws.filter((w) => w.booking_id === r.id);
  return rows;
}

export function bookingTotals(b: Pick<Booking, "hours" | "days">, workers: { hourly_rate: number; state: string; hours_approved: number | null; arrived: number | null; identity_ok: string | null; trade_ok: string | null }[], approved = false) {
  const active = workers.filter((w) => w.state === "assigned");
  const lines = active.map((w) => {
    const noFit = w.arrived === 0 || w.identity_ok === "no" || w.trade_ok === "no";
    const hours = approved ? (w.hours_approved ?? 0) : noFit ? 0 : b.hours * b.days;
    return hours * w.hourly_rate;
  });
  const net = lines.reduce((a, b) => a + b, 0);
  return { net, vat: net * 0.18, gross: net * 1.18 };
}

// ── Agency analytics ─────────────────────────────────────────────────────
function workdaysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (isWorkday(d)) out.push(d);
  return out;
}

/** Booked worker-days per work day for an agency within [from, to]. */
async function bookedByDay(agencyId: number, from: string, to: string) {
  const rows = await all<{ date: string; end_date: string; worker_id: number }>(
    `SELECT b.date, b.end_date, bw.worker_id FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id
     WHERE b.agency_id = ? AND bw.state = 'assigned' AND b.status IN ('requested','approved','completed') AND b.date <= ? AND b.end_date >= ?`,
    agencyId, to, from
  );
  const m = new Map<string, Set<number>>();
  for (const r of rows) for (const d of workdaysBetween(r.date > from ? r.date : from, r.end_date < to ? r.end_date : to)) {
    if (!m.has(d)) m.set(d, new Set());
    m.get(d)!.add(r.worker_id);
  }
  return m;
}

export async function weeklyUtilization(agencyId: number, weeks = 4) {
  const today = todayISO();
  const n = await count(`SELECT COUNT(*)::int AS n FROM workers WHERE agency_id = ? AND active = 1`, agencyId);
  const booked = await bookedByDay(agencyId, addDays(today, -weeks * 7), addDays(today, -1));
  const out: { label: string; pct: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const to = addDays(today, -1 - i * 7), from = addDays(to, -6);
    const days = workdaysBetween(from, to);
    const used = days.reduce((a, d) => a + (booked.get(d)?.size ?? 0), 0);
    out.push({ label: from.slice(8, 10) + "." + from.slice(5, 7), pct: n && days.length ? Math.round((100 * used) / (n * days.length)) : 0 });
  }
  return out;
}

/** Idle worker-days in the coming `horizon` work days, per trade, counting only workers whose documents stay valid. */
export async function idleForecast(agencyId: number, horizon = 10) {
  const today = todayISO();
  const days: string[] = [];
  for (let d = addDays(today, 1); days.length < horizon; d = addDays(d, 1)) if (isWorkday(d)) days.push(d);
  const workers = await all<Worker>(`SELECT * FROM workers WHERE agency_id = ? AND active = 1`, agencyId);
  const docs = await docsFor(workers.map((w) => w.id));
  const booked = await bookedByDay(agencyId, days[0], days[days.length - 1]);
  const byTrade = new Map<string, { trade: string; idleDays: number; workers: Set<number>; from: string; to: string }>();
  for (const w of workers) {
    for (const d of days) {
      if (booked.get(d)?.has(w.id)) continue;
      if (!docCheck(docs.get(w.id)!, w.trade, d).ok) continue;
      const e = byTrade.get(w.trade) ?? { trade: w.trade, idleDays: 0, workers: new Set<number>(), from: d, to: d };
      e.idleDays++;
      e.workers.add(w.id);
      if (d < e.from) e.from = d;
      if (d > e.to) e.to = d;
      byTrade.set(w.trade, e);
    }
  }
  return [...byTrade.values()].sort((a, b) => b.idleDays - a.idleDays).map((e) => ({ ...e, workerCount: e.workers.size, workerIds: [...e.workers] }));
}

export async function complianceItems(agencyId: number, withinDays = 60) {
  const today = todayISO();
  const rows = await all<Doc & Pick<Worker, "first_name" | "last_name" | "trade" | "phone" | "lang" | "token" | "photo" | "country">>(
    `SELECT d.*, w.first_name, w.last_name, w.trade, w.phone, w.lang, w.token, w.photo, w.country
     FROM documents d JOIN workers w ON w.id = d.worker_id
     WHERE w.agency_id = ? AND w.active = 1 AND (d.status = 'pending' OR (d.status = 'verified' AND d.expires IS NOT NULL AND d.expires <= ?))
     ORDER BY (d.status = 'pending') DESC, d.expires`,
    agencyId, addDays(today, withinDays)
  );
  // Workers in height trades missing a work-at-heights certificate entirely
  const missing = await all<Worker>(
    `SELECT w.* FROM workers w WHERE w.agency_id = ? AND w.active = 1 AND w.trade IN ('formwork','rebar','plaster','masonry')
     AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.worker_id = w.id AND d.type = 'heights' AND d.status = 'verified')`,
    agencyId
  );
  return { rows, missing };
}

export const DOC_ORDER = DOC_TYPES.map((d) => d.key);
