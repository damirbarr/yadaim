"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, get, insert, run, tx } from "@/lib/db";
import { requireAgency } from "@/lib/auth";
import { randomToken } from "@/lib/tokens";
import { saveUpload } from "@/lib/storage";
import { audit } from "@/lib/audit";
import type { Perm } from "@/lib/rbac";
import { busyWorkers, docCheck, docsFor, getAgency, getBooking, getWorker, idleForecast } from "@/lib/queries";
import { offerTail } from "@/app/a/campaigns/offer";
import { ALL_CITIES, COUNTRIES, DOC_TYPES, MIN_DAYS_OPTIONS, REGIONS, TRADES, bookingPhase, hourlyFor, regionOf } from "@/lib/domain";
import { CONTACT_FIELDS, ImportError, WORKER_FIELDS, normalizeDate, normalizePhone, readImport, type ImportField, type ImportState } from "@/lib/importer";
import { logEvent } from "@/lib/events";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";
import { messages } from "@/messages";
import type { FormState } from "./auth";

/** Read an uploaded sheet, with field labels and errors in the user's language. */
async function readSheetRows(file: File, fields: ImportField[], mapping: string | null) {
  const { t, intl } = await getI18n();
  const label = (k: string) => t(`import.fields.${k}` as MessageKey);
  try {
    return await readImport(file, fields, mapping, label);
  } catch (e) {
    // A file the sheet reader can't open is reported like any other unsupported file.
    if (!(e instanceof ImportError)) return { error: t("import.errors.format") };
    if (e.code !== "missing") return { error: t(`import.errors.${e.code}`) };
    const either = new Intl.ListFormat(intl, { type: "disjunction" });
    const list = new Intl.ListFormat(intl, { type: "unit", style: "short" });
    return { error: t("import.errors.missing", { fields: list.format(e.groups.map((g) => either.format(g.map(label)))) }) };
  }
}

/** Trade and country names as written in any of our languages (sheets come in Hebrew, Arabic or English). */
const norm = (s: string) => s.trim().toLowerCase();
function tradeFromText(s: string) {
  const v = norm(s);
  if (!v) return undefined;
  return TRADES.find((t) => t.key === v
    || Object.values(messages).some((m) => { const n = m.domain.trades[t.key]; return v.includes(norm(n.one)) || v.includes(norm(n.many)); }))?.key;
}
function countryFromText(s: string) {
  const v = norm(s);
  if (!v) return undefined;
  return Object.entries(COUNTRIES).find(([k]) => k.toLowerCase() === v
    || Object.values(messages).some((m) => { const n = m.domain.countries[k as keyof typeof m.domain.countries]; return !!n && v.includes(norm(n)); }))?.[0];
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
  const { t } = await getI18n();
  if (b.status !== "requested") return { error: t("agency.actions.alreadyHandled") };
  const a = (await getAgency(agencyId))!;
  const chosen = fd.getAll("w").map(Number).filter(Boolean);
  if (!chosen.length) return { error: t("agency.actions.pickOne") };
  const busy = (await busyWorkers(b.date, b.end_date, b.id));
  const docs = (await docsFor(chosen));
  for (const id of chosen) {
    const w = (await getWorker(id));
    if (!w || w.agency_id !== agencyId || !w.active) return { error: t("agency.actions.badWorker") };
    if (busy.has(id)) return { error: t("agency.actions.busy", { name: w.first_name }) };
    if (!docCheck(docs.get(id)!, b.trade, b.end_date).ok) return { error: t("agency.actions.docsMissing", { name: w.first_name }) };
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
  await logEvent("approved", { agency: agencyId, contractor: b.contractor_id, booking: b.id }, "approved", { id: b.id, date: b.date, n: chosen.length });
  await audit(user, "booking.approve", `booking:${b.id}`, `${chosen.length} workers`);
  revalidatePath("/a", "layout");
  redirect(`/a/requests?approved=${b.id}`);
}

export async function rejectRequest(fd: FormData) {
  const { b, agencyId, user } = await ownBooking(Number(fd.get("id")));
  if (b.status !== "requested") return;
  // The reason is shown to the contractor as written.
  const reason = String(fd.get("reason") ?? "").trim() || (await getI18n()).t("agency.actions.noAvailability");
  (await run(`UPDATE bookings SET status = 'rejected', agency_note = ? WHERE id = ?`, reason, b.id));
  await logEvent("rejected", { agency: agencyId, contractor: b.contractor_id, booking: b.id }, "rejected", { id: b.id, reason });
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

/** Agency-side cancellation after approval - allowed, but it costs reliability points. */
export async function agencyCancel(fd: FormData) {
  const { b, agencyId } = await ownBooking(Number(fd.get("id")));
  if (b.status !== "approved" || !["approved", "locked"].includes(bookingPhase(b))) return;
  (await run(`UPDATE bookings SET status = 'cancelled', agency_note = ? WHERE id = ?`, String(fd.get("reason") ?? "").trim() || (await getI18n()).t("agency.actions.cancelledByAgency"), b.id));
  await logEvent("agency_cancel", { agency: agencyId, contractor: b.contractor_id, booking: b.id }, "agencyCancel", { id: b.id });
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
  await logEvent("swap", { agency: agencyId, contractor: b.contractor_id, booking: b.id }, "swap", { id: b.id });
  revalidatePath(`/a/requests/${b.id}`);
}

// ── Workers ────────────────────────────────────────────────────────────
export async function saveWorker(_: FormState, fd: FormData): Promise<FormState> {
  const { agencyId, user } = await requireAgency("agency.workers.edit");
  const id = Number(fd.get("id")) || 0;
  if (id) await ownWorker(id);
  const f = (k: string) => String(fd.get(k) ?? "").trim();
  const { t, fmt } = await getI18n();
  const tradeKey = f("trade"), country = f("country");
  if (!f("first_name") || !f("last_name")) return { error: t("agency.actions.nameRequired") };
  if (!TRADES.some((x) => x.key === tradeKey)) return { error: t("agency.actions.badTrade") };
  if (!COUNTRIES[country]) return { error: t("agency.actions.badCountry") };
  const rate = Number(f("hourly_rate"));
  if (!(rate >= 40 && rate <= 200)) return { error: t("agency.actions.badRate", { min: fmt.money(40), max: fmt.money(200) }) };
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
  const { t } = await getI18n();
  const file = fd.get("file") as File | null;
  if (!file || !file.size) return { error: t("agency.actions.chooseFile") };
  const res = await readSheetRows(file, WORKER_FIELDS, (fd.get("mapping") as string) || null);
  if ("error" in res) return { error: res.error };
  if ("mapping" in res) return { mapping: res.mapping };
  const rows = res.rows;
  let added = 0, skipped = 0;
  await tx(async () => {
    for (const r of rows) {
      let first = r.first_name, last = r.last_name;
      if (!first && r.full_name) {
        const parts = r.full_name.split(/\s+/);
        first = parts[0];
        last = last || parts.slice(1).join(" ");
      }
      const tk = tradeFromText(r.trade);
      const ck = countryFromText(r.country);
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
  return { ok: [t("agency.actions.workersAdded", { n: added }), skipped ? t("agency.actions.rowsSkipped", { n: skipped }) : ""].filter(Boolean).join(" · ") };
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
  const { t } = await getI18n();
  if (!name || !phone) return { error: t("agency.actions.nameAndPhone") };
  const r = (await run(`INSERT INTO crm_contacts (agency_id, name, company, phone, city, region, trades, source) VALUES (?,?,?,?,?,?,?, 'manual') ON CONFLICT DO NOTHING RETURNING id`, agencyId, name, String(fd.get("company") ?? "") || null, phone, city || null, city ? regionOf(city) : null, fd.getAll("trades").join(",") || null));
  revalidatePath("/a", "layout");
  return r.length ? { ok: t("agency.actions.contactAdded", { name }) } : { error: t("agency.actions.phoneExists") };
}

export async function importContacts(_: ImportState, fd: FormData): Promise<ImportState> {
  const { agencyId } = await requireAgency("agency.crm.manage");
  const file = fd.get("file") as File | null;
  const pasted = String(fd.get("pasted") ?? "").trim();
  const { t } = await getI18n();
  let rows: Record<string, string>[] = [];
  if (file && file.size) {
    const res = await readSheetRows(file, CONTACT_FIELDS, (fd.get("mapping") as string) || null);
    if ("error" in res) return { error: res.error };
    if ("mapping" in res) return { mapping: res.mapping };
    rows = res.rows;
  } else if (pasted) {
      // WhatsApp group members / phone contacts pasted as lines: "name, phone" or just phones
    rows = pasted.split(/\n+/).map((line) => {
      const phone = (line.match(/\+?\d[\d\s-]{7,}\d/) ?? [""])[0];
      return { name: line.replace(phone, "").replace(/[,;:\t~،]+/g, " ").trim(), phone, company: "", city: "" }; // i18n-data: Arabic comma
    });
  } else return { error: t("agency.actions.fileOrPaste") };
  const source = file && file.size ? "csv" : "whatsapp";
  let added = 0, dup = 0, bad = 0;
  await tx(async () => {
    for (const r of rows) {
      const phone = normalizePhone(r.phone);
      if (!phone || phone.replace(/\D/g, "").length < 9) { bad++; continue; }
      const city = r.city;
      const known = ALL_CITIES.includes(city) ? city : null;
      const res = (await run(`INSERT INTO crm_contacts (agency_id, name, company, phone, city, region, source) VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id`, agencyId, r.name || t("agency.actions.noName"), r.company || null, phone, known, known ? regionOf(known) : null, source));
      if (res.length) added++; else dup++;
    }
  });
  revalidatePath("/a", "layout");
  return { ok: [t("agency.actions.contactsAdded", { n: added }), dup ? t("agency.actions.duplicates", { n: dup }) : "", bad ? t("agency.actions.badPhones", { n: bad }) : ""].filter(Boolean).join(" · ") };
}

export async function toggleOptOut(fd: FormData) {
  const { agencyId } = await requireAgency("agency.crm.manage");
  (await run(`UPDATE crm_contacts SET opted_out = 1 - opted_out WHERE id = ? AND agency_id = ?`, Number(fd.get("id")), agencyId));
  revalidatePath("/a/contractors");
}

// ── Campaigns ──────────────────────────────────────────────────────────
/** Pressing "send" on /a/campaigns is the agency's approval: it creates the offer and its recipient list, and the
 *  campaign page then opens WhatsApp for each contractor. Dates and counts are recomputed here, never taken from the form. */
export async function createCampaign(fd: FormData) {
  const { agencyId, user } = await requireAgency("agency.campaigns.send");
  const i18n = await getI18n();
  const tradeKey = String(fd.get("trade"));
  const body = String(fd.get("message") ?? "").trim().slice(0, 1000);
  const regions = fd.getAll("regions").map(String).filter((r) => REGIONS.some((x) => x.key === r));
  const idle = (await idleForecast(agencyId)).find((i) => i.trade === tradeKey);
  const a = await getAgency(agencyId);
  if (!body || !idle || !a || !regions.length) return;
  const message = `${body} ${offerTail(i18n, a.min_days)}`;
  // Frequency cap: max one offer per contact every 3 days (≈2 a week), never to opted-out contacts.
  // Contacts without a known area are included: the agency added them, and leaving them out silently would be worse.
  const contacts = (await all(
    `SELECT id, region FROM crm_contacts WHERE agency_id = ? AND opted_out = 0 AND (last_sent_at IS NULL OR last_sent_at <= now_txt(interval '-3 days'))`
  , agencyId)) as { id: number; region: string | null }[];
  const to = contacts.filter((c) => !c.region || regions.includes(c.region));
  if (!to.length) return;
  const cid = await tx(async () => {
    const id = Number(await insert(`INSERT INTO campaigns (agency_id, trade, date_from, date_to, idle_days, message) VALUES (?,?,?,?,?,?)`, agencyId, tradeKey, idle.from, idle.to, idle.idleDays, message));
    for (const c of to) await run(`INSERT INTO campaign_recipients (campaign_id, contact_id, ref) VALUES (?,?,?)`, id, c.id, randomToken(6));
    return id;
  });
  await audit(user, "campaign.create", `campaign:${cid}`, tradeKey);
  redirect(`/a/campaigns/${cid}`);
}

// ── Settings ───────────────────────────────────────────────────────────
export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const { agencyId, user } = await requireAgency("agency.settings.edit");
  const { t } = await getI18n();
  const regions = fd.getAll("regions").map(String).filter((r) => REGIONS.some((x) => x.key === r));
  if (!regions.length) return { error: t("agency.actions.pickRegion") };
  const minDays = Number(fd.get("min_days"));
  if (!MIN_DAYS_OPTIONS.some((o) => o.v === minDays)) return { error: t("agency.actions.badMinDays") };
  (await run(`UPDATE agencies SET name = ?, phone = ?, about = ?, regions = ?, min_days = ?, lodging_discount = ?, transport_rate = ?, auto_campaign = ? WHERE id = ?`, String(fd.get("name") ?? "").trim(), String(fd.get("phone") ?? "").trim(), String(fd.get("about") ?? "").trim(), regions.join(","), minDays,
    Math.max(0, Number(fd.get("lodging_discount")) || 0), Math.max(0, Number(fd.get("transport_rate")) || 0), fd.get("auto_campaign") ? 1 : 0, agencyId));
  await audit(user, "agency.settings", `agency:${agencyId}`, `min_days=${minDays}`);
  revalidatePath("/a", "layout");
  return { ok: t("agency.actions.saved") };
}
