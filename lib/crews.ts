import "server-only";
import { all, get } from "./db";
import { agencyReliability, busyWorkers, docCheck, docsFor, displayName, type Agency, type SearchQuery, type Worker } from "./queries";
import { endOfBlock, hourlyFor, regionOf, TRADES } from "./domain";

// Agency crews: workers an agency places together. A worker belongs to at most one crew (workers.crew_id).
// Trades may mix inside a crew; its "main trade" is computed from the members, never stored.

export type Crew = { id: number; agency_id: number; name: string; leader_worker_id: number | null; created_at: string };
export type CrewWorker = Worker & { crew_id: number | null };
export type CrewWithMembers = Crew & { members: CrewWorker[]; mainTrade: string | null };

const marks = (n: number) => Array(n).fill("?").join(",");
const tradeOrder = (k: string) => { const i = TRADES.findIndex((t) => t.key === k); return i < 0 ? 99 : i; };

/** The most common trade among the members; ties go to the trade listed first in TRADES. */
export function mainTrade(members: { trade: string }[]): string | null {
  const n = new Map<string, number>();
  for (const m of members) n.set(m.trade, (n.get(m.trade) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || tradeOrder(a[0]) - tradeOrder(b[0]))[0]?.[0] ?? null;
}

/** Leader first, then by trade and seniority, so avatars read the same everywhere. */
function orderMembers(c: Crew, ms: CrewWorker[]) {
  return ms.sort((a, b) => Number(b.id === c.leader_worker_id) - Number(a.id === c.leader_worker_id) || tradeOrder(a.trade) - tradeOrder(b.trade) || b.years - a.years);
}

/** Every crew of the agency with its active members. Inactive workers stay linked but aren't placed, so they're left out. */
export async function agencyCrews(agencyId: number): Promise<CrewWithMembers[]> {
  const crews = await all<Crew>(`SELECT * FROM agency_crews WHERE agency_id = ? ORDER BY name, id`, agencyId);
  if (!crews.length) return [];
  const ws = await all<CrewWorker>(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND crew_id IS NOT NULL`, agencyId);
  return crews.map((c) => {
    const members = orderMembers(c, ws.filter((w) => w.crew_id === c.id));
    return { ...c, members, mainTrade: mainTrade(members) };
  });
}

export async function getCrew(agencyId: number, id: number): Promise<CrewWithMembers | undefined> {
  const c = await get<Crew>(`SELECT * FROM agency_crews WHERE id = ? AND agency_id = ?`, id, agencyId);
  if (!c) return undefined;
  const members = orderMembers(c, await all<CrewWorker>(`SELECT * FROM workers WHERE crew_id = ? AND agency_id = ? AND active = 1`, id, agencyId));
  return { ...c, members, mainTrade: mainTrade(members) };
}

/** crew id → name for the agency (for chips on worker lists). */
export async function crewNames(agencyId: number) {
  const rows = await all<{ id: number; name: string }>(`SELECT id, name FROM agency_crews WHERE agency_id = ?`, agencyId);
  return new Map(rows.map((r) => [r.id, r.name]));
}

// ── Contractor search ────────────────────────────────────────────────────
export type CrewHitMember = { id: number; name: string; trade: string; years: number; photo: string | null; country: string; daily: number; leader: boolean };
export type CrewHit = { id: number; name: string; agency: string; agencyScore: number; mainTrade: string; members: CrewHitMember[]; daily: number };

/**
 * Crews a contractor can book as a whole for the query: same agency rules as individual search (verified, not
 * suspended, serves the region, min_days, reliability ≥ 60), main trade = the searched trade, and EVERY member free
 * and holding every document their own trade requires, valid through the last day. One missing member hides the crew:
 * a partial crew isn't a crew.
 */
export async function searchCrews(q: SearchQuery): Promise<CrewHit[]> {
  const end = endOfBlock(q.date, q.days);
  const region = regionOf(q.city);
  const agencies = (await all<Agency>(`SELECT * FROM agencies WHERE verified = 1 AND suspended = 0`)).filter(
    (a) => a.regions.split(",").includes(region) && a.min_days <= q.days
  );
  if (!agencies.length) return [];
  const crews = await all<Crew>(`SELECT * FROM agency_crews WHERE agency_id IN (${marks(agencies.length)})`, ...agencies.map((a) => a.id));
  if (!crews.length) return [];
  const ws = await all<CrewWorker>(`SELECT * FROM workers WHERE active = 1 AND crew_id IN (${marks(crews.length)})`, ...crews.map((c) => c.id));
  const byCrew = new Map(crews.map((c) => [c.id, orderMembers(c, ws.filter((w) => w.crew_id === c.id && w.agency_id === c.agency_id))]));
  const candidates = crews.filter((c) => byCrew.get(c.id)!.length >= 2 && mainTrade(byCrew.get(c.id)!) === q.trade);
  if (!candidates.length) return [];

  const used = agencies.filter((a) => candidates.some((c) => c.agency_id === a.id));
  const rel = new Map(await Promise.all(used.map(async (a) => [a.id, (await agencyReliability(a.id)).score] as const)));
  const busy = await busyWorkers(q.date, end);
  const docs = await docsFor(candidates.flatMap((c) => byCrew.get(c.id)!.map((w) => w.id)));

  const hits: CrewHit[] = [];
  for (const c of candidates) {
    const agency = used.find((a) => a.id === c.agency_id)!;
    const score = rel.get(agency.id)!;
    if (score < 60) continue;
    const ms = byCrew.get(c.id)!;
    if (ms.some((w) => busy.has(w.id) || !docCheck(docs.get(w.id)!, w.trade, end).ok)) continue;
    const members = ms.map((w) => ({
      id: w.id, name: displayName(w), trade: w.trade, years: w.years, photo: w.photo, country: w.country,
      daily: hourlyFor(w.hourly_rate, agency, q) * q.hours, leader: w.id === c.leader_worker_id,
    }));
    hits.push({ id: c.id, name: c.name, agency: agency.name, agencyScore: score, mainTrade: q.trade, members, daily: members.reduce((s, m) => s + m.daily, 0) });
  }
  // Closest to the requested head count first, then the more reliable agency.
  hits.sort((a, b) => Math.abs(a.members.length - q.count) - Math.abs(b.members.length - q.count) || b.agencyScore - a.agencyScore);
  return hits;
}

// ── Contractor basket ────────────────────────────────────────────────────
// The contractor's selection lives in the search URL (`w=` worker ids), so it survives switching trade and reloads.
// Workers picked under another trade aren't in the current results, so the page loads them here to show and price them.
export type BasketItem = { id: number; name: string; trade: string; photo: string | null; country: string; daily: number; agency: string };
export function parseBasket(v: string | string[] | undefined): number[] {
  const s = Array.isArray(v) ? v[0] : v;
  return [...new Set(String(s ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 40);
}
export async function basketItems(ids: number[], q: Pick<SearchQuery, "lodging" | "transport" | "hours">): Promise<BasketItem[]> {
  if (!ids.length) return [];
  const rows = await all<Worker & { agency_name: string; lodging_discount: number; transport_rate: number }>(
    `SELECT w.*, a.name AS agency_name, a.lodging_discount, a.transport_rate FROM workers w JOIN agencies a ON a.id = w.agency_id
     WHERE w.active = 1 AND w.id IN (${marks(ids.length)})`,
    ...ids
  );
  rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); // keep the order they were picked in
  return rows.map((w) => ({
    id: w.id, name: displayName(w), trade: w.trade, photo: w.photo, country: w.country, agency: w.agency_name,
    daily: hourlyFor(w.hourly_rate, w, q) * q.hours,
  }));
}
