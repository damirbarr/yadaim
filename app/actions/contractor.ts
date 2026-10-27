"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, get, insert, run, tx } from "@/lib/db";
import { requireContractor } from "@/lib/auth";
import { agencyReliability, attendanceFor, busyWorkers, docCheck, docsFor, getAgency, getBooking, getContractor, getWorker } from "@/lib/queries";
import { bookingPhase, ALL_CITIES, endOfBlock, hourlyFor, regionOf, todayISO, TRADES } from "@/lib/domain";
import { salePrice } from "@/lib/domain";
import { promoPct } from "@/lib/promotions";
import { audit } from "@/lib/audit";
import { logEvent } from "@/lib/events";
import { workerHours } from "@/lib/attendance";
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
        // Sale price (lib/promotions.ts) only when every booked day is inside the agency's sale window; looked up
        // here, never taken from the form, so the stored rate is the one the agency agreed to.
        const pct = await promoPct(agencyId, tradeKey, date, end);
        for (const wid of wids) {
          const w = (await getWorker(wid))!;
          (await run(`INSERT INTO booking_workers (booking_id, worker_id, hourly_rate) VALUES (?,?,?)`, bid, wid, salePrice(hourlyFor(w.hourly_rate, a, { lodging, transport }), pct)));
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

/** First arrival at the site: is this the person in the photo, and the trade we ordered? Asked once per booking on
 *  the work-day screen, after the worker is marked as arrived (arrival itself is in app/actions/attendance.ts). */
export async function siteCheck(fd: FormData) {
  const bwId = Number(fd.get("bw"));
  const field = String(fd.get("field"));
  const value = String(fd.get("value"));
  if (!["identity_ok", "trade_ok"].includes(field) || !["yes", "partial", "no"].includes(value)) return;
  const row = (await get(`SELECT booking_id, worker_id, state FROM booking_workers WHERE id = ?`, bwId)) as { booking_id: number; worker_id: number; state: string } | undefined;
  if (!row || row.state !== "assigned") return;
  const { b, contractorId } = await ownBooking(row.booking_id, "contractor.site");
  if (!["today", "locked", "awaiting_hours"].includes(bookingPhase(b))) return;
  (await run(`UPDATE booking_workers SET ${field} = ?, arrived = 1, checkin_at = COALESCE(checkin_at, now_txt()) WHERE id = ?`, value, bwId));
  if (value === "no") {
    await logEvent("nofit", { agency: b.agency_id, contractor: contractorId, booking: b.id }, field === "identity_ok" ? "nofitIdentity" : "nofitSkill", { id: b.id });
    const { user } = await requireContractor("contractor.site");
    await audit(user, "checkin.nofit", `booking:${b.id},worker:${row.worker_id}`, field);
  }
  revalidatePath(`/c/orders/${b.id}/site`);
  revalidatePath(`/c/orders/${b.id}`);
}

/** End of the booking: approve hours per worker (pre-filled from daily attendance), rate, close the booking.
 *  No-fit workers and workers who never arrived are never billed, whatever the form says. */
export async function approveHours(fd: FormData) {
  const { b, contractorId } = await ownBooking(Number(fd.get("id")), "contractor.site");
  const { user } = await requireContractor("contractor.site");
  if (todayISO() < b.end_date || b.status !== "approved") return;
  const rows = (await all(`SELECT * FROM booking_workers WHERE booking_id = ? AND state = 'assigned'`, b.id)) as { id: number; worker_id: number; arrived: number | null; identity_ok: string | null; trade_ok: string | null }[];
  const att = await attendanceFor(rows.map((r) => r.id));
  let total = 0;
  await tx(async () => {
    for (const r of rows) {
      const sum = workerHours(b, { ...r, attendance: att.get(r.id) ?? [] });
      const billed = sum.cap > 0;
      const raw = fd.get(`hours_${r.id}`);
      const asked = raw === null || String(raw).trim() === "" ? sum.hours : Number(raw);
      const hours = billed ? Math.max(0, Math.min(sum.cap, Number.isFinite(asked) ? asked : sum.hours)) : 0;
      total += hours;
      const rating = billed ? Math.min(5, Math.max(1, Number(fd.get(`rating_${r.id}`)) || 5)) : null;
      const tags = billed ? fd.getAll(`tags_${r.id}`).map(String).join(",") || null : null;
      (await run(`UPDATE booking_workers SET hours_approved = ?, rating = ?, tags = ?, arrived = COALESCE(arrived, ?), identity_ok = COALESCE(identity_ok, 'yes'), trade_ok = COALESCE(trade_ok, 'yes') WHERE id = ?`, hours, rating, tags, billed ? 1 : 0, r.id));
    }
    const review = String(fd.get("review") ?? "").trim();
    if (review) (await run(`UPDATE booking_workers SET review = ? WHERE booking_id = ? AND rating IS NOT NULL`, review, b.id));
    (await run(`UPDATE bookings SET status = 'completed', completed_at = now_txt() WHERE id = ?`, b.id));
  });
  await logEvent("hours", { agency: b.agency_id, contractor: contractorId, booking: b.id }, "hours", { id: b.id });
  await audit(user, "hours.approve", `booking:${b.id}`, String(total));
  revalidatePath(`/c/orders/${b.id}`);
  revalidatePath(`/a/requests/${b.id}`);
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
