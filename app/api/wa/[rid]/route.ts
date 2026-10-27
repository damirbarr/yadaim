import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { all, get, insert, run, tx } from "@/lib/db";
import { appUrl, waLink } from "@/lib/wa";

/** Marks a campaign recipient as sent and forwards to WhatsApp with the personal message + tracking link. */
export async function GET(_: Request, { params }: { params: Promise<{ rid: string }> }) {
  const u = await currentUser();
  if (!u || u.role !== "agency") return NextResponse.redirect(appUrl("/login"));
  const r = (await get(
    `SELECT r.id, r.ref, r.contact_id, c.message, k.name, k.phone FROM campaign_recipients r JOIN campaigns c ON c.id = r.campaign_id JOIN crm_contacts k ON k.id = r.contact_id
     WHERE r.id = ? AND c.agency_id = ?`
  , Number((await params).rid), u.agency_id)) as { id: number; ref: string; contact_id: number; message: string; name: string; phone: string } | undefined;
  if (!r) return new NextResponse("not found", { status: 404 });
  (await run(`UPDATE campaign_recipients SET sent_at = COALESCE(sent_at, now_txt()) WHERE id = ?`, r.id));
  (await run(`UPDATE crm_contacts SET last_sent_at = now_txt() WHERE id = ?`, r.contact_id));
  const text = `${r.message.replace("{שם}", r.name.split(" ")[0])}\n${appUrl(`/r/${r.ref}`)}\n\nלהסרה מהודעות השיבו "הסר"`;
  return NextResponse.redirect(waLink(r.phone, text));
}
