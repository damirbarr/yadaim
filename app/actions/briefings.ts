"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { get, insert } from "@/lib/db";
import { requireContractor } from "@/lib/auth";
import { getBooking, siteBriefings } from "@/lib/queries";
import { addDays, bookingPhase, todayISO, BRIEFING_VALID_DAYS } from "@/lib/domain";
import { saveUpload } from "@/lib/storage";
import { audit } from "@/lib/audit";

/** On site: the contractor records that a worker signed this site's safety briefing (optionally with a photo of
 *  the form). A separate step from check-in, so it never blocks identity/skill answers or hours approval. */
export async function recordBriefing(fd: FormData) {
  const { user, contractorId } = await requireContractor("contractor.site");
  const bwId = Number(fd.get("bw"));
  const row = await get<{ booking_id: number; worker_id: number; state: string }>(`SELECT booking_id, worker_id, state FROM booking_workers WHERE id = ?`, bwId);
  if (!row) return;
  const b = await getBooking(row.booking_id);
  // Scoped to the caller's own booking, for a worker actually on its crew, while the site screen is open.
  if (!b || b.contractor_id !== contractorId || row.state !== "assigned") throw new Error("not found");
  if (!["today", "locked", "awaiting_hours"].includes(bookingPhase(b))) return;
  // Already covered for this booking: a second tap shouldn't create a duplicate.
  if ((await siteBriefings(contractorId, b.address, [row.worker_id], b.end_date)).size) return revalidatePath(`/c/orders/${b.id}/site`);

  let file: string | null = null;
  try {
    file = await saveUpload(fd.get("file") as File | null, "d");
  } catch {
    // Back to the same work day the briefing was recorded from.
    const d = String(fd.get("d") ?? "");
    redirect(`/c/orders/${b.id}/site?${/^\d{4}-\d{2}-\d{2}$/.test(d) ? `d=${d}&` : ""}briefingError=${bwId}#bw-${bwId}`);
  }
  const signed = todayISO();
  await insert(
    `INSERT INTO site_briefings (worker_id, contractor_id, site, signed_at, expires, booking_id, file) VALUES (?,?,?,?,?,?,?)`,
    row.worker_id, contractorId, b.address, signed, addDays(signed, BRIEFING_VALID_DAYS), b.id, file
  );
  await audit(user, "briefing.sign", `worker:${row.worker_id},booking:${b.id}`);
  revalidatePath(`/c/orders/${b.id}/site`);
  revalidatePath(`/c/orders/${b.id}`);
  revalidatePath(`/a/workers/${row.worker_id}`);
}
