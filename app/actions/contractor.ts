"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, get, insert, run, tx } from "@/lib/db";
import { requireContractor } from "@/lib/auth";
import { agencyReliability, busyWorkers, docCheck, docsFor, getAgency, getBooking, getContractor, getWorker } from "@/lib/queries";
import { bookingPhase, ALL_CITIES, endOfBlock, hourlyFor, regionOf, todayISO, TRADES } from "@/lib/domain";
import { audit } from "@/lib/audit";
import { logEvent } from "@/lib/events";
import { getI18n } from "@/lib/i18n/server";
import type { Perm } from "@/lib/rbac";
import type { FormState } from "./auth";

/**
 * Send an order. The basket may mix agencies and trades; a booking has one agency and one trade, so the order is
 * split into one booking per (agency, trade), all created in one transaction: either every request goes out or none.
 */
export async function createBooking(_: FormState, fd: FormData): Promise<FormState> {
  const { contractorId, user } = await requireContractor("contractor.book");
  const { t } = await getI18n();
  const c = (await getContractor(contractorId))!;
  if (!c.verified) return { error: t("contractor.errors.notVerified") };

  const ids = [...new Set(String(fd.get("w") ?? "").split(",").map(Number).filter(Boolean))].slice(0, 40);
  const date = String(fd.get("date"));
  const days = Math.min(22, Math.max(1, Number(fd.get("days")) || 1));
  const city = String(fd.get("city"));
  const address = String(fd.get("address") ?? "").trim();
  const startTime = String(fd.get("start_time") ?? "07:00");
  const hours = Math.min(12, Math.max(4, Number(fd.get("hours")) || 9));
  const lodging = fd.get("lodging") === "agency" ? "agency" : "contractor";
  const transport = fd.get("transport") === "contractor" ? "contractor" : "agency";
  const notes = String(fd.get("notes") ?? "").trim() || null;

  if (!ids.length) return { error: t("contractor.errors.noWorkers") };
  if (!ALL_CITIES.includes(city)) return { error: t("contractor.errors.badDetails") };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayISO()) return { error: t("contractor.errors.badDate") };
  if (address.length < 4) return { error: t("contractor.errors.noAddress") };

  const end = endOfBlock(date, days);
  const ref = (await cookies()).get("yd_ref")?.value;
  let created: number[] = [];
  try {
    created = await tx(async () => {
      const busy = (await busyWorkers(date, end));
      const docs = (await docsFor(ids));
      const groups = new Map<string, { agencyId: number; trade: string; wids: number[] }>();
      for (const id of ids) {
        const w = (await getWorker(id));
        if (!w || !w.active || !TRADES.some((x) => x.key === w.trade)) throw new Error(t("contractor.errors.unavailable"));
        if (busy.has(id)) throw new Error(t("contractor.errors.justBooked"));
        if (!docCheck(docs.get(id)!, w.trade, end).ok) throw new Error(t("contractor.errors.docs"));
        const key = `${w.agency_id}:${w.trade}`;
        const g = groups.get(key) ?? { agencyId: w.agency_id, trade: w.trade, wids: [] };
        g.wids.push(id);
        groups.set(key, g);
      }
      const out: number[] = [];
      const checked = new Set<number>();
      for (const { agencyId, trade: tradeKey, wids } of groups.values()) {
        const a = (await getAgency(agencyId))!;
        if (!checked.has(agencyId)) {
          // Same placement rules as search: the ids come from the URL, so they are re-checked here.
          if (!a.verified || a.suspended || !a.regions.split(",").includes(regionOf(city)) || (await agencyReliability(agencyId)).score < 60)
            throw new Error(t("contractor.errors.unavailable"));
          if (days < a.min_days) throw new Error(t("contractor.errors.minDays", { agency: a.name, n: a.min_days }));
          checked.add(agencyId);
        }
        let campaignId: number | null = null;
        if (ref) {
          const rec = (await get(`SELECT r.id, r.campaign_id FROM campaign_recipients r JOIN campaigns c ON c.id = r.campaign_id WHERE r.ref = ? AND c.agency_id = ?`, ref, agencyId)) as { id: number; campaign_id: number } | undefined;
          if (rec) {
            campaignId = rec.campaign_id;
            (await run(`UPDATE campaign_recipients SET booked_at = COALESCE(booked_at, now_txt()) WHERE id = ?`, rec.id));
          }
        }
        const bid = Number(
          (await insert(
            `INSERT INTO bookings (contractor_id, agency_id, trade, date, end_date, days, start_time, hours, city, address, lodging, transport, notes, campaign_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
          , contractorId, agencyId, tradeKey, date, end, days, startTime, hours, city, address, lodging, transport, notes, campaignId))
        );
        for (const wid of wids) {
          const w = (await getWorker(wid))!;
          (await run(`INSERT INTO booking_workers (booking_id, worker_id, hourly_rate) VALUES (?,?,?)`, bid, wid, hourlyFor(w.hourly_rate, a, { lodging, transport })));
        }
        await logEvent("request", { agency: agencyId, contractor: contractorId, booking: bid }, days > 1 ? "requestDays" : "request", { company: c.company, n: wids.length, trade: tradeKey, date, city, days });
        out.push(bid);
      }
      return out;
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  await audit(user, "booking.create", created.map((id) => `booking:${id}`).join(","), `${ids.length} workers`);
  revalidatePath("/c", "layout");
  redirect(created.length === 1 ? `/c/orders/${created[0]}?sent=1` : `/c/orders?sent=${created.length}`);
}

async function ownBooking(id: number, perm: Perm) {
  const { contractorId } = await requireContractor(perm);
  const b = (await getBooking(id));
  if (!b || b.contractor_id !== contractorId) throw new Error("not found");
  return { b, contractorId };
}

export async function cancelBooking(fd: FormData) {
  const { b, contractorId } = await ownBooking(Number(fd.get("id")), "contractor.book");
  const phase = bookingPhase(b);
  if (!["requested", "approved"].includes(phase)) return;
  (await run(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, b.id));
  await logEvent("cancel", { agency: b.agency_id, contractor: contractorId, booking: b.id }, "cancel", { id: b.id, date: b.date });
  revalidatePath(`/c/orders/${b.id}`);
}

/** Morning check-in at the site: is this the person in the photo, and the trade we ordered? */
export async function siteCheck(fd: FormData) {
  const bwId = Number(fd.get("bw"));
  const field = String(fd.get("field"));
  const value = String(fd.get("value"));
  if (!["identity_ok", "trade_ok", "arrived"].includes(field)) return;
  const row = (await get(`SELECT booking_id FROM booking_workers WHERE id = ?`, bwId)) as { booking_id: number } | undefined;
  if (!row) return;
  const { b, contractorId } = await ownBooking(row.booking_id, "contractor.site");
  if (!["today", "locked", "awaiting_hours"].includes(bookingPhase(b))) return;
  if (field === "arrived") {
    (await run(`UPDATE booking_workers SET arrived = ?, checkin_at = CASE WHEN ? = 1 THEN now_txt() ELSE NULL END WHERE id = ?`, value === "1" ? 1 : 0, value === "1" ? 1 : 0, bwId));
    if (value === "0") await logEvent("noshow", { agency: b.agency_id, contractor: contractorId, booking: b.id }, "noshow", { id: b.id });
  } else {
    if (!["yes", "partial", "no"].includes(value)) return;
    (await run(`UPDATE booking_workers SET ${field} = ?, arrived = 1, checkin_at = COALESCE(checkin_at, now_txt()) WHERE id = ?`, value, bwId));
    if (value === "no") await logEvent("nofit", { agency: b.agency_id, contractor: contractorId, booking: b.id }, field === "identity_ok" ? "nofitIdentity" : "nofitSkill", { id: b.id });
  }
  revalidatePath(`/c/orders/${b.id}/site`);
}

/** End of work: approve hours per worker, rate, close the booking. */
export async function approveHours(fd: FormData) {
  const { b, contractorId } = await ownBooking(Number(fd.get("id")), "contractor.site");
  if (todayISO() < b.end_date || b.status !== "approved") return;
  const rows = (await all(`SELECT * FROM booking_workers WHERE booking_id = ? AND state = 'assigned'`, b.id)) as { id: number; arrived: number | null; identity_ok: string | null; trade_ok: string | null }[];
  await tx(async () => {
    for (const r of rows) {
      const noFit = r.arrived === 0 || r.identity_ok === "no" || r.trade_ok === "no";
      const hours = noFit ? 0 : Math.max(0, Math.min(b.hours * b.days + 20, Number(fd.get(`hours_${r.id}`)) || 0));
      const rating = noFit ? null : Math.min(5, Math.max(1, Number(fd.get(`rating_${r.id}`)) || 5));
      const tags = fd.getAll(`tags_${r.id}`).map(String).join(",") || null;
      (await run(`UPDATE booking_workers SET hours_approved = ?, rating = ?, tags = ?, arrived = COALESCE(arrived, 1), identity_ok = COALESCE(identity_ok, 'yes'), trade_ok = COALESCE(trade_ok, 'yes') WHERE id = ?`, hours, rating, tags, r.id));
    }
    const review = String(fd.get("review") ?? "").trim();
    if (review) (await run(`UPDATE booking_workers SET review = ? WHERE booking_id = ? AND rating IS NOT NULL`, review, b.id));
    (await run(`UPDATE bookings SET status = 'completed', completed_at = now_txt() WHERE id = ?`, b.id));
  });
  await logEvent("hours", { agency: b.agency_id, contractor: contractorId, booking: b.id }, "hours", { id: b.id });
  revalidatePath(`/c/orders/${b.id}`);
  redirect(`/c/orders/${b.id}?done=1`);
}

export async function saveCrew(fd: FormData) {
  const { b, contractorId } = await ownBooking(Number(fd.get("id")), "contractor.crews.edit");
  const ids = ((await all(`SELECT worker_id FROM booking_workers WHERE booking_id = ? AND state = 'assigned'`, b.id)) as { worker_id: number }[]).map((r) => r.worker_id);
  const { t, fmt } = await getI18n();
  // The crew name is the contractor's own label, so the default is written in their language.
  const name = String(fd.get("name") ?? "").trim() || t("contractor.order.crewName", { trades: fmt.trades(b.trade), city: fmt.city(b.city) });
  (await run(`INSERT INTO crews (contractor_id, name, worker_ids) VALUES (?,?,?)`, contractorId, name, ids.join(",")));
  redirect("/c/crews");
}

export async function deleteCrew(fd: FormData) {
  const { contractorId } = await requireContractor("contractor.crews.edit");
  (await run(`DELETE FROM crews WHERE id = ? AND contractor_id = ?`, Number(fd.get("id")), contractorId));
  revalidatePath("/c/crews");
}
