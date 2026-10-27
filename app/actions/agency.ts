"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, get, insert, run, tx } from "@/lib/db";
import { requireAgency } from "@/lib/auth";
import { randomToken } from "@/lib/tokens";
import { saveUpload } from "@/lib/storage";
import { audit } from "@/lib/audit";
import type { Perm } from "@/lib/rbac";
import { busyWorkers, docCheck, docsFor, getAgency, getBooking, getWorker } from "@/lib/queries";
import { ALL_CITIES, COUNTRIES, DOC_TYPES, MIN_DAYS_OPTIONS, REGIONS, TRADES, bookingPhase, ddmm, hourlyFor, regionOf } from "@/lib/domain";
import { CONTACT_FIELDS, WORKER_FIELDS, normalizeDate, normalizePhone, readImport, type ImportState } from "@/lib/importer";
import type { FormState } from "./auth";

async function event(agencyId: number, kind: string, text: string, bookingId?: number, contractorId?: number) {
  (await run(`INSERT INTO events (agency_id, contractor_id, booking_id, kind, text) VALUES (?,?,?,?,?)`, agencyId, contractorId ?? null, bookingId ?? null, kind, text));
}

async function ownBooking(id: number, perm: Perm = "agency.requests.manage") {
  const { agencyId, user } = await requireAgency(perm);
  const b = (await getBooking(id));
  if (!b || b.agency_id !== agencyId) throw new Error("not found");
  return { b, agencyId, user };
}

async function ownWorker(id: number) {
  const { agencyId } = await requireAgency("agency.workers.edit");
  const w = (await getWorker(id));
  if (!w || w.agency_id !== agencyId) throw new Error("not found");
  return { w, agencyId };
}

// ── Requests & assignment ──────────────────────────────────────────────
export async function approveRequest(_: FormState, fd: FormData): Promise<FormState> {
  const { b, agencyId, user } = await ownBooking(Number(fd.get("id")));
  if (b.status !== "requested") return { error: "הבקשה כבר טופלה" };
  const a = (await getAgency(agencyId))!;
  const chosen = fd.getAll("w").map(Number).filter(Boolean);
  if (!chosen.length) return { error: "צריך לשבץ לפחות עובד אחד" };
  const busy = (await busyWorkers(b.date, b.end_date, b.id));
  const docs = (await docsFor(chosen));
  for (const id of chosen) {
    const w = (await getWorker(id));
    if (!w || w.agency_id !== agencyId || !w.active) return { error: "עובד לא תקין" };
    if (busy.has(id)) return { error: `${w.first_name} כבר משובץ בתאריכים האלה` };
    if (!docCheck(docs.get(id)!, b.trade, b.end_date).ok) return { error: `ל${w.first_name} חסר אישור בתוקף לכל התקופה` };
  }
  const pickup = String(fd.get("pickup_time") ?? "") || null;
  const driver = String(fd.get("driver_name") ?? "").trim() || null;
  const vehicle = String(fd.get("vehicle_no") ?? "").trim() || null;
  const note = String(fd.get("agency_note") ?? "").trim() || null;
  await tx(async () => {
    const existing = (await all(`SELECT id, worker_id FROM booking_workers WHERE booking_id = ?`, b.id)) as { id: number; worker_id: number }[];
    for (const e of existing) if (!chosen.includes(e.worker_id)) (await run(`UPDATE booking_workers SET state = 'removed' WHERE id = ?`, e.id));
    for (const id of chosen) {
      const e = existing.find((x) => x.worker_id === id);
      if (e) (await run(`UPDATE booking_workers SET state = 'assigned' WHERE id = ?`, e.id));
      else (await run(`INSERT INTO booking_workers (booking_id, worker_id, hourly_rate) VALUES (?,?,?)`, b.id, id, hourlyFor((await getWorker(id))!.hourly_rate, a, b)));
    }
    (await run(`UPDATE bookings SET status = 'approved', approved_at = now_txt(), pickup_time = ?, driver_name = ?, vehicle_no = ?, agency_note = ? WHERE id = ?`, pickup, driver, vehicle, note, b.id));
  });
  await event(agencyId, "approved", `אישרתם את הזמנה #${b.id} (${ddmm(b.date)}) עם ${chosen.length} עובדים`, b.id, b.contractor_id);
  await audit(user, "booking.approve", `booking:${b.id}`, `${chosen.length} workers`);
  revalidatePath("/a", "layout");
  redirect(`/a/requests?approved=${b.id}`);
}

export async function rejectRequest(fd: FormData) {
  const { b, agencyId, user } = await ownBooking(Number(fd.get("id")));
  if (b.status !== "requested") return;
  const reason = String(fd.get("reason") ?? "").trim() || "אין זמינות";
  (await run(`UPDATE bookings SET status = 'rejected', agency_note = ? WHERE id = ?`, reason, b.id));
  await event(agencyId, "rejected", `דחיתם את הזמנה #${b.id}: ${reason}`, b.id, b.contractor_id);
  await audit(user, "booking.reject", `booking:${b.id}`, reason);
  revalidatePath("/a", "layout");
  redirect("/a/requests");
}

export async function updateTransport(fd: FormData) {
  const { b } = await ownBooking(Number(fd.get("id")));
  (await run(`UPDATE bookings SET pickup_time = ?, driver_name = ?, vehicle_no = ? WHERE id = ?`, String(fd.get("pickup_time") ?? "") || null, String(fd.get("driver_name") ?? "").trim() || null, String(fd.get("vehicle_no") ?? "").trim() || null, b.id));
  revalidatePath("/a/requests");
  revalidatePath(`/a/requests/${b.id}`);
}

/** Agency-side cancellation after approval — allowed, but it costs reliability points. */
export async function agencyCancel(fd: FormData) {
  const { b, agencyId } = await ownBooking(Number(fd.get("id")));
  if (b.status !== "approved" || !["approved", "locked"].includes(bookingPhase(b))) return;
  (await run(`UPDATE bookings SET status = 'cancelled', agency_note = ? WHERE id = ?`, String(fd.get("reason") ?? "") || "בוטל ע״י התאגיד", b.id));
  await event(agencyId, "agency_cancel", `ביטלתם הזמנה מאושרת #${b.id} — נספר בציון האמינות`, b.id, b.contractor_id);
  revalidatePath("/a", "layout");
  redirect("/a/requests");
}

/** Replace a worker on an approved booking (e.g. after a no-fit in the morning). */
export async function swapWorker(fd: FormData) {
  const { b, agencyId } = await ownBooking(Number(fd.get("id")));
  const out = Number(fd.get("out"));
  const inn = Number(fd.get("in"));
  const w = (await getWorker(inn));
  if (!w || w.agency_id !== agencyId || b.status !== "approved") return;
  if ((await busyWorkers(b.date, b.end_date, b.id)).has(inn) || !docCheck((await docsFor([inn])).get(inn)!, b.trade, b.end_date).ok) return;
  const a = (await getAgency(agencyId))!;
  await tx(async () => {
    (await run(`UPDATE booking_workers SET state = 'removed' WHERE booking_id = ? AND worker_id = ? AND checkin_at IS NULL`, b.id, out));
    (await run(`INSERT INTO booking_workers (booking_id, worker_id, hourly_rate) VALUES (?,?,?)`, b.id, inn, hourlyFor(w.hourly_rate, a, b)));
  });
  await event(agencyId, "swap", `החלפתם עובד בהזמנה #${b.id}`, b.id, b.contractor_id);
  revalidatePath(`/a/requests/${b.id}`);
}

// ── Workers ────────────────────────────────────────────────────────────
export async function saveWorker(_: FormState, fd: FormData): Promise<FormState> {
  const { agencyId, user } = await requireAgency("agency.workers.edit");
  const id = Number(fd.get("id")) || 0;
  if (id) await ownWorker(id);
  const f = (k: string) => String(fd.get(k) ?? "").trim();
  const tradeKey = f("trade"), country = f("country");
  if (!f("first_name") || !f("last_name")) return { error: "שם פרטי ושם משפחה חובה" };
  if (!TRADES.some((t) => t.key === tradeKey)) return { error: "מקצוע לא תקין" };
  if (!COUNTRIES[country]) return { error: "ארץ מוצא לא תקינה" };
  const rate = Number(f("hourly_rate"));
  if (!(rate >= 40 && rate <= 200)) return { error: "תעריף שעתי בין 40 ל-200 ₪" };
  let photo: string | null = null;
  try {
    photo = await saveUpload(fd.get("photo") as File | null, "p");
  } catch (e) {
    return { error: (e as Error).message };
  }
  const vals = [f("first_name"), f("last_name"), tradeKey, Number(f("years")) || 0, country, COUNTRIES[country].lang, normalizePhone(f("phone")), f("passport_no") || null, rate, f("skills") || null];
  let wid = id;
  if (id) {
    (await run(`UPDATE workers SET first_name=?, last_name=?, trade=?, years=?, country=?, lang=?, phone=?, passport_no=?, hourly_rate=?, skills=? WHERE id = ?`, ...vals, id));
    if (photo) (await run(`UPDATE workers SET photo = ? WHERE id = ?`, photo, id));
  } else {
    wid = Number((await insert(`INSERT INTO workers (agency_id, first_name, last_name, trade, years, country, lang, phone, passport_no, hourly_rate, skills, photo, token) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, agencyId, ...vals, photo, randomToken(9))));
    await audit(user, "worker.create", `worker:${wid}`, `${f("first_name")} ${f("last_name")}`);
  }
  // Documents entered inline on the form
  for (const d of DOC_TYPES) {
    const exp = normalizeDate(f(`doc_${d.key}_expires`));
    const num = f(`doc_${d.key}_number`) || null;
    let file: string | null = null;
    try {
      file = await saveUpload(fd.get(`doc_${d.key}_file`) as File | null, "d");
    } catch (e) {
      return { error: (e as Error).message };
    }
    if (!exp && !file) continue;
    const cur = (await get(`SELECT id FROM documents WHERE worker_id = ? AND type = ?`, wid, d.key)) as { id: number } | undefined;
    if (cur) (await run(`UPDATE documents SET expires = COALESCE(?, expires), number = COALESCE(?, number), file = COALESCE(?, file), status = 'verified', verified_at = now_txt() WHERE id = ?`, exp, num, file, cur.id));
    else (await run(`INSERT INTO documents (worker_id, type, number, expires, file, status, verified_at) VALUES (?,?,?,?,?, 'verified', now_txt())`, wid, d.key, num, exp, file));
  }
  revalidatePath("/a", "layout");
  redirect(`/a/workers/${wid}?saved=1`);
}

export async function setWorkerActive(fd: FormData) {
  const { w } = await ownWorker(Number(fd.get("id")));
  (await run(`UPDATE workers SET active = ? WHERE id = ?`, fd.get("active") === "1" ? 1 : 0, w.id));
  revalidatePath("/a", "layout");
}

export async function importWorkers(_: ImportState, fd: FormData): Promise<ImportState> {
  const { agencyId, user } = await requireAgency("agency.workers.edit");
  const file = fd.get("file") as File | null;
  if (!file || !file.size) return { error: "בחרו קובץ" };
  let rows: Record<string, string>[];
  try {
    const res = await readImport(file, WORKER_FIELDS, (fd.get("mapping") as string) || null);
    if ("mapping" in res) return { mapping: res.mapping };
    rows = res.rows;
  } catch (e) {
    return { error: (e as Error).message };
  }
  const tradeByLabel = (s: string) => TRADES.find((t) => s.includes(t.label) || t.key === s.toLowerCase() || s.includes(t.plural))?.key;
  const countryBy = (s: string) => Object.entries(COUNTRIES).find(([k, v]) => k === s.toUpperCase() || s.includes(v.label))?.[0];
  let added = 0, skipped = 0;
  await tx(async () => {
    for (const r of rows) {
      let first = r.first_name, last = r.last_name;
      if (!first && r.full_name) {
        const parts = r.full_name.split(/\s+/);
        first = parts[0];
        last = last || parts.slice(1).join(" ");
      }
      const tk = tradeByLabel(r.trade);
      const ck = countryBy(r.country);
      if (!first || !tk || !ck) { skipped++; continue; }
      const wid = Number((await insert(`INSERT INTO workers (agency_id, first_name, last_name, trade, years, country, lang, phone, passport_no, hourly_rate, token) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, agencyId, first, last || "-", tk, Number(r.years) || 0, ck, COUNTRIES[ck].lang,
        normalizePhone(r.phone), r.passport_no || null, Number(r.rate) || 75, randomToken(9))));
      for (const d of DOC_TYPES) {
        const exp = normalizeDate(r[`doc_${d.key}`] ?? "");
        if (exp) (await run(`INSERT INTO documents (worker_id, type, expires, status, verified_at) VALUES (?,?,?, 'verified', now_txt())`, wid, d.key, exp));
      }
      added++;
    }
  });
  await audit(user, "workers.import", `agency:${agencyId}`, `${file.name}: ${added} added, ${skipped} skipped`);
  revalidatePath("/a", "layout");
  return { ok: `נוספו ${added} עובדים${skipped ? ` · ${skipped} שורות דולגו (חסר שם, מקצוע או ארץ)` : ""}` };
}

// ── Compliance ─────────────────────────────────────────────────────────
export async function markRenewal(fd: FormData) {
  const { agencyId } = await requireAgency("agency.compliance.manage");
  const ids = fd.getAll("doc").map(Number);
  for (const id of ids)
    (await run(`UPDATE documents SET renewal_requested_at = now_txt() WHERE id = ? AND worker_id IN (SELECT id FROM workers WHERE agency_id = ?)`, id, agencyId));
  revalidatePath("/a/compliance");
}

// ── CRM ────────────────────────────────────────────────────────────────
export async function addContact(_: FormState, fd: FormData): Promise<FormState> {
  const { agencyId } = await requireAgency("agency.crm.manage");
  const name = String(fd.get("name") ?? "").trim();
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const city = String(fd.get("city") ?? "");
  if (!name || !phone) return { error: "שם וטלפון חובה" };
  const r = (await run(`INSERT INTO crm_contacts (agency_id, name, company, phone, city, region, trades, source) VALUES (?,?,?,?,?,?,?, 'manual') ON CONFLICT DO NOTHING RETURNING id`, agencyId, name, String(fd.get("company") ?? "") || null, phone, city || null, city ? regionOf(city) : null, fd.getAll("trades").join(",") || null));
  revalidatePath("/a", "layout");
  return r.length ? { ok: `${name} נוסף למאגר` } : { error: "המספר כבר קיים במאגר" };
}

export async function importContacts(_: ImportState, fd: FormData): Promise<ImportState> {
  const { agencyId } = await requireAgency("agency.crm.manage");
  const file = fd.get("file") as File | null;
  const pasted = String(fd.get("pasted") ?? "").trim();
  let rows: Record<string, string>[] = [];
  try {
    if (file && file.size) {
      const res = await readImport(file, CONTACT_FIELDS, (fd.get("mapping") as string) || null);
      if ("mapping" in res) return { mapping: res.mapping };
      rows = res.rows;
    } else if (pasted) {
      // WhatsApp group members / phone contacts pasted as lines: "name, phone" or just phones
      rows = pasted.split(/\n+/).map((line) => {
        const phone = (line.match(/\+?\d[\d\s-]{7,}\d/) ?? [""])[0];
        return { name: line.replace(phone, "").replace(/[,;:\t~]+/g, " ").trim(), phone, company: "", city: "" };
      });
    } else return { error: "בחרו קובץ או הדביקו רשימה" };
  } catch (e) {
    return { error: (e as Error).message };
  }
  const source = file && file.size ? "csv" : "whatsapp";
  let added = 0, dup = 0, bad = 0;
  await tx(async () => {
    for (const r of rows) {
      const phone = normalizePhone(r.phone);
      if (!phone || phone.replace(/\D/g, "").length < 9) { bad++; continue; }
      const city = r.city;
      const known = ALL_CITIES.includes(city) ? city : null;
      const res = (await run(`INSERT INTO crm_contacts (agency_id, name, company, phone, city, region, source) VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id`, agencyId, r.name || "ללא שם", r.company || null, phone, known, known ? regionOf(known) : null, source));
      if (res.length) added++; else dup++;
    }
  });
  revalidatePath("/a", "layout");
  return { ok: `נוספו ${added} קבלנים · ${dup} כפולים מוזגו${bad ? ` · ${bad} שורות בלי טלפון תקין` : ""}` };
}

export async function toggleOptOut(fd: FormData) {
  const { agencyId } = await requireAgency("agency.crm.manage");
  (await run(`UPDATE crm_contacts SET opted_out = 1 - opted_out WHERE id = ? AND agency_id = ?`, Number(fd.get("id")), agencyId));
  revalidatePath("/a/contractors");
}

// ── Campaigns ──────────────────────────────────────────────────────────
export async function createCampaign(fd: FormData) {
  const { agencyId, user } = await requireAgency("agency.campaigns.send");
  const tradeKey = String(fd.get("trade"));
  const message = String(fd.get("message") ?? "").trim();
  const from = String(fd.get("from")), to = String(fd.get("to"));
  const idle = Number(fd.get("idle")) || 0;
  const regions = fd.getAll("regions").map(String);
  if (!message || !TRADES.some((t) => t.key === tradeKey)) return;
  const cid = Number((await insert(`INSERT INTO campaigns (agency_id, trade, date_from, date_to, idle_days, message) VALUES (?,?,?,?,?,?)`, agencyId, tradeKey, from, to, idle, message)));
  // Frequency cap: max one offer per contact every 3 days (≈2 a week), never to opted-out contacts.
  const contacts = (await all(
    `SELECT id, region FROM crm_contacts WHERE agency_id = ? AND opted_out = 0 AND (last_sent_at IS NULL OR last_sent_at <= now_txt(interval '-3 days'))`
  , agencyId)) as { id: number; region: string | null }[];
  await tx(async () => {
    for (const c of contacts)
      if (!regions.length || !c.region || regions.includes(c.region)) await run(`INSERT INTO campaign_recipients (campaign_id, contact_id, ref) VALUES (?,?,?)`, cid, c.id, randomToken(6));
  });
  await audit(user, "campaign.create", `campaign:${cid}`, tradeKey);
  redirect(`/a/campaigns/${cid}`);
}

export async function markCampaignSent(fd: FormData) {
  const { agencyId } = await requireAgency("agency.campaigns.send");
  const id = Number(fd.get("id"));
  const c = (await get(`SELECT id FROM campaigns WHERE id = ? AND agency_id = ?`, id, agencyId));
  if (!c) return;
  (await run(`UPDATE campaigns SET status = 'sent', sent_at = COALESCE(sent_at, now_txt()) WHERE id = ?`, id));
  revalidatePath(`/a/campaigns/${id}`);
}

// ── Settings ───────────────────────────────────────────────────────────
export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const { agencyId, user } = await requireAgency("agency.settings.edit");
  const regions = fd.getAll("regions").map(String).filter((r) => REGIONS.some((x) => x.key === r));
  if (!regions.length) return { error: "בחרו לפחות אזור אחד" };
  const minDays = Number(fd.get("min_days"));
  if (!MIN_DAYS_OPTIONS.some((o) => o.v === minDays)) return { error: "משך מינימלי לא תקין" };
  (await run(`UPDATE agencies SET name = ?, phone = ?, about = ?, regions = ?, min_days = ?, lodging_discount = ?, transport_rate = ?, auto_campaign = ? WHERE id = ?`, String(fd.get("name") ?? "").trim(), String(fd.get("phone") ?? "").trim(), String(fd.get("about") ?? "").trim(), regions.join(","), minDays,
    Math.max(0, Number(fd.get("lodging_discount")) || 0), Math.max(0, Number(fd.get("transport_rate")) || 0), fd.get("auto_campaign") ? 1 : 0, agencyId));
  await audit(user, "agency.settings", `agency:${agencyId}`, `min_days=${minDays}`);
  revalidatePath("/a", "layout");
  return { ok: "נשמר" };
}
