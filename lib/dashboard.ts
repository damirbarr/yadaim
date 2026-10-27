import "server-only";
import { all } from "./db";
import { addDays, regionOf, todayISO } from "./domain";
import { agencyCalendar } from "./calendar";
import { agencyReliability, type Agency } from "./queries";

// Read-only figures for the agency dashboard ("today"). Built on the calendar and analytics helpers so the
// numbers match what the calendar and search show.

export type WeekDay = { date: string; assigned: number; free: number; total: number };

/**
 * The next Israeli work week (Sunday to Friday after today) with assigned vs free workers per day,
 * using the calendar's rule (assigned = on an approved booking that covers the day). Two queries.
 */
export async function nextWeekAvailability(agencyId: number, today = todayISO()) {
  const dow = new Date(today + "T12:00:00Z").getUTCDay();
  const sunday = addDays(today, 7 - dow);
  const friday = addDays(sunday, 5);
  const { days } = await agencyCalendar(agencyId, sunday, friday);
  const week: WeekDay[] = [...days.entries()].map(([date, d]) => ({ date, ...d }));
  const idle = week.reduce((a, d) => a + d.free, 0);
  const firstFree = week.find((d) => d.free > 0)?.date ?? null;
  return { week, idle, firstFree };
}

export type SearchRank = { rank: number; of: number; trade: string; region: string };

/**
 * Where the agency stands in contractor search for its main trade (most active workers) and main region
 * (its own city's region when it serves it, else the first one listed). Search ranks agencies by reliability,
 * among verified, non-suspended agencies at 60 or more. Null when the agency isn't in that search at all.
 */
export async function searchRank(agency: Agency): Promise<SearchRank | null> {
  const top = await all<{ trade: string; n: number }>(
    `SELECT trade, COUNT(*)::int AS n FROM workers WHERE agency_id = ? AND active = 1 GROUP BY trade ORDER BY n DESC, trade LIMIT 1`,
    agency.id
  );
  if (!top.length || !agency.verified || agency.suspended) return null;
  const trade = top[0].trade;
  const served = agency.regions.split(",").filter(Boolean);
  const own = regionOf(agency.city);
  const region = served.includes(own) ? own : served[0];
  if (!region) return null;
  const rivals = (
    await all<Agency>(
      `SELECT a.* FROM agencies a WHERE a.verified = 1 AND a.suspended = 0
         AND EXISTS (SELECT 1 FROM workers w WHERE w.agency_id = a.id AND w.active = 1 AND w.trade = ?)`,
      trade
    )
  ).filter((a) => a.regions.split(",").includes(region));
  const scores = await Promise.all(rivals.map(async (a) => ({ id: a.id, score: (await agencyReliability(a.id)).score })));
  const eligible = scores.filter((s) => s.score >= 60);
  const mine = eligible.find((s) => s.id === agency.id);
  if (!mine) return null;
  return { rank: 1 + eligible.filter((s) => s.score > mine.score).length, of: eligible.length, trade, region };
}
