import { notFound } from "next/navigation";
import { requireAgency } from "@/lib/auth";
import { all, get, insert, run, tx } from "@/lib/db";
import { ddmm, trade } from "@/lib/domain";
import { markCampaignSent } from "@/app/actions/agency";
import { PageHead, Stat } from "@/components/ui";
import { IWhatsapp } from "@/components/icons";

export default async function Campaign({ params }: { params: Promise<{ id: string }> }) {
  const { agencyId } = await requireAgency("agency.campaigns.send");
  const c = (await get(`SELECT * FROM campaigns WHERE id = ? AND agency_id = ?`, Number((await params).id), agencyId)) as { id: number; trade: string; date_from: string; date_to: string; message: string; status: string } | undefined;
  if (!c) notFound();
  const recs = (await all(
    `SELECT r.*, k.name, k.company, k.phone, k.city FROM campaign_recipients r JOIN crm_contacts k ON k.id = r.contact_id WHERE r.campaign_id = ? ORDER BY r.booked_at IS NULL, r.opened_at IS NULL, r.sent_at IS NOT NULL, k.name`
  , c.id)) as { id: number; ref: string; sent_at: string | null; opened_at: string | null; booked_at: string | null; name: string; company: string | null; phone: string; city: string | null }[];
  const n = (f: (r: (typeof recs)[number]) => unknown) => recs.filter(f).length;
  return (
    <div className="space-y-5">
      <PageHead back="/a/campaigns" title={`הצעה · ${trade(c.trade).plural} · ${ddmm(c.date_from)}–${ddmm(c.date_to)}`} sub={c.message.replace("{שם}", "…")}>
        {c.status === "draft" && <form action={markCampaignSent}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost">סימון כהושלם</button></form>}
      </PageHead>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="נמענים" value={<span className="num">{recs.length}</span>} />
        <Stat label="נשלחו" value={<span className="num">{n((r) => r.sent_at)}</span>} />
        <Stat label="צפו בפרופילים" value={<span className="num">{n((r) => r.opened_at)}</span>} />
        <Stat label="בקשות הזמנה" value={<span className="num">{n((r) => r.booked_at)}</span>} tone="hazard" />
      </div>
      <p className="text-sm text-muted">כל כפתור פותח וואטסאפ עם הודעה אישית וקישור מעקב. בחיבור לוואטסאפ עסקי (בהגדרות) השליחה יוצאת אוטומטית לכולם.</p>
      <div className="card divide-y divide-line">
        {recs.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-40 flex-1"><b>{r.name}</b> <span className="text-muted">· {r.company ?? ""} {r.city ? `· ${r.city}` : ""}</span></span>
            {r.booked_at ? <span className="chip-ok">הזמין</span> : r.opened_at ? <span className="chip-info">צפה</span> : r.sent_at ? <span className="chip-muted">נשלח</span> : null}
            <a href={`/api/wa/${r.id}`} target="_blank" className={r.sent_at ? "btn-ghost btn-sm" : "btn-ok btn-sm"}><IWhatsapp className="h-4 w-4" />{r.sent_at ? "שוב" : "שליחה"}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
