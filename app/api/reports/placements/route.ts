import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { all, get, insert, run, tx } from "@/lib/db";
import { countryLabel, docType, trade } from "@/lib/domain";

/** Monthly placement report: which worker was placed with which registered contractor, where and when. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || u.role !== "agency") return new NextResponse("unauthorized", { status: 401 });
  const m = new URL(req.url).searchParams.get("m") ?? "";
  if (!/^\d{4}-\d{2}$/.test(m)) return new NextResponse("bad month", { status: 400 });
  const rows = (await all(
    `SELECT w.first_name, w.last_name, w.passport_no, w.country, b.trade, c.company, c.registry_no, c.classification, b.address, b.date, b.end_date, b.status,
            bw.hours_approved, (SELECT expires FROM documents d WHERE d.worker_id = w.id AND d.type = 'visa' AND d.status = 'verified') AS visa
     FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id JOIN workers w ON w.id = bw.worker_id JOIN contractors c ON c.id = b.contractor_id
     WHERE b.agency_id = ? AND bw.state = 'assigned' AND b.status IN ('approved','completed') AND substr(b.date,1,7) = ? ORDER BY b.date, w.last_name`
  , u.agency_id, m)) as Record<string, string | number | null>[];
  const head = ["שם פרטי", "שם משפחה", "דרכון", "נתינות", "מקצוע", `${docType("visa").short} בתוקף עד`, "קבלן", "מס׳ רשם קבלנים", "סיווג", "כתובת אתר", "מתאריך", "עד תאריך", "שעות שאושרו"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.first_name, r.last_name, r.passport_no, countryLabel(String(r.country)), trade(String(r.trade)).label, r.visa, r.company, r.registry_no, r.classification, r.address, r.date, r.end_date, r.hours_approved ?? ""].map(esc).join(","));
  return new NextResponse("﻿" + [head.map(esc).join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="placements-${m}.csv"` },
  });
}
