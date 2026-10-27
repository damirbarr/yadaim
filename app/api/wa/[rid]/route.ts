import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { get, run } from "@/lib/db";
import { appUrl, waLink } from "@/lib/wa";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/messages";
import type { Locale } from "@/lib/i18n/locales";

/** Marks a campaign recipient as sent and forwards to WhatsApp with the personal message + tracking link. */
export async function GET(_: Request, { params }: { params: Promise<{ rid: string }> }) {
  const u = await currentUser();
  if (!u || !can(u, "agency.campaigns.send")) return NextResponse.redirect(appUrl("/login"));
  const r = (await get(
    `SELECT r.id, r.ref, r.campaign_id, r.contact_id, r.sent_at, c.message, k.name, k.phone, k.opted_out,
            (k.last_sent_at IS NOT NULL AND k.last_sent_at > now_txt(interval '-3 days')) AS recent
     FROM campaign_recipients r JOIN campaigns c ON c.id = r.campaign_id JOIN crm_contacts k ON k.id = r.contact_id
     WHERE r.id = ? AND c.agency_id = ?`
  , Number((await params).rid), u.agency_id)) as { id: number; ref: string; campaign_id: number; contact_id: number; sent_at: string | null; message: string; name: string; phone: string; opted_out: number; recent: boolean } | undefined;
  if (!r) return new NextResponse("not found", { status: 404 });
  // The rules hold here too, not only when the list was built: a contractor may opt out, or get another offer,
  // after this campaign was created. Re-opening the same message for someone already sent to is a retry, not a new message.
  if (r.opted_out || (r.recent && !r.sent_at)) return NextResponse.redirect(appUrl(`/a/campaigns/${r.campaign_id}`));
  (await run(`UPDATE campaign_recipients SET sent_at = COALESCE(sent_at, now_txt()) WHERE id = ?`, r.id));
  (await run(`UPDATE crm_contacts SET last_sent_at = now_txt() WHERE id = ?`, r.contact_id));
  // Once everyone on the list has been sent to, the campaign is done; nobody has to mark it.
  (await run(`UPDATE campaigns SET status = 'sent', sent_at = COALESCE(sent_at, now_txt())
              WHERE id = ? AND NOT EXISTS (SELECT 1 FROM campaign_recipients WHERE campaign_id = ? AND sent_at IS NULL)`, r.campaign_id, r.campaign_id));
  // The opt-out line follows the offer's language (known from its name placeholder), else the sender's.
  const all = Object.entries(messages) as [Locale, (typeof messages)[Locale]][];
  const lang = all.find(([, m]) => r.message.includes(m.market.campaigns.nameToken))?.[0] ?? (await getLocale());
  const first = r.name.split(" ")[0];
  const body = all.reduce((s, [, m]) => s.replaceAll(m.market.campaigns.nameToken, first), r.message);
  const text = `${body}\n${appUrl(`/r/${r.ref}`)}\n\n${messages[lang].market.campaigns.offer.optOut}`;
  return NextResponse.redirect(waLink(r.phone, text));
}
