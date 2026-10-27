import { NextResponse } from "next/server";
import { all, get, insert, run, tx } from "@/lib/db";
import { appUrl } from "@/lib/wa";

/** Tracking link from a WhatsApp offer: records the open, remembers the ref for attribution, shows the agency page. */
export async function GET(_: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const r = (await get(
    `SELECT r.id, c.trade, a.slug FROM campaign_recipients r JOIN campaigns c ON c.id = r.campaign_id JOIN agencies a ON a.id = c.agency_id WHERE r.ref = ?`
  , ref)) as { id: number; trade: string; slug: string } | undefined;
  if (!r) return NextResponse.redirect(appUrl("/"));
  (await run(`UPDATE campaign_recipients SET opened_at = COALESCE(opened_at, now_txt()) WHERE id = ?`, r.id));
  const res = NextResponse.redirect(appUrl(`/o/${r.slug}?trade=${r.trade}`));
  res.cookies.set("yd_ref", ref, { maxAge: 60 * 60 * 24 * 14, path: "/", sameSite: "lax", httpOnly: true });
  return res;
}
