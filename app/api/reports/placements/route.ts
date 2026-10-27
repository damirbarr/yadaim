import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";

/** Monthly placement report: which worker was placed with which registered contractor, where and when. Headers and labels follow the viewer's language. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || u.role !== "agency") return new NextResponse("unauthorized", { status: 401 });
  const m = new URL(req.url).searchParams.get("m") ?? "";
  if (!/^\d{4}-\d{2}$/.test(m)) return new NextResponse("bad month", { status: 400 });
  const { t, fmt } = await getI18n();
  const rows = (await all(
    `SELECT w.first_name, w.last_name, w.passport_no, w.country, b.trade, c.company, c.registry_no, c.classification, b.address, b.date, b.end_date, b.status,
            bw.hours_approved, (SELECT expires FROM documents d WHERE d.worker_id = w.id AND d.type = 'visa' AND d.status = 'verified') AS visa
     FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id JOIN workers w ON w.id = bw.worker_id JOIN contractors c ON c.id = b.contractor_id
     WHERE b.agency_id = ? AND bw.state = 'assigned' AND b.status IN ('approved','completed') AND substr(b.date,1,7) = ? ORDER BY b.date, w.last_name`
  , u.agency_id, m)) as Record<string, string | number | null>[];
  const c = (k: "firstName" | "lastName" | "passport" | "country" | "trade" | "contractor" | "registry" | "classification" | "address" | "from" | "to" | "hours") => t(`market.billing.csv.${k}`);
  const head = [c("firstName"), c("lastName"), c("passport"), c("country"), c("trade"), t("market.billing.csv.visaUntil", { visa: fmt.docShort("visa") }), c("contractor"), c("registry"), c("classification"), c("address"), c("from"), c("to"), c("hours")];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.first_name, r.last_name, r.passport_no, fmt.country(String(r.country)), fmt.trade(String(r.trade)), r.visa, r.company, r.registry_no, r.classification, r.address, r.date, r.end_date, r.hours_approved ?? ""].map(esc).join(","));
  return new NextResponse("﻿" + [head.map(esc).join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="placements-${m}.csv"` },
  });
}
