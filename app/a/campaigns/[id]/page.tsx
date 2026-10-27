import { notFound } from "next/navigation";
import { requireAgency } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { markCampaignSent } from "@/app/actions/agency";
import { PageHead, Stat } from "@/components/ui";
import { IWhatsapp } from "@/components/icons";
import { getI18n } from "@/lib/i18n/server";
import { messages } from "@/messages";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("market.campaigns.title") };
}

// An offer keeps the name placeholder of the language it was written in.
const TOKENS = Object.values(messages).map((m) => m.market.campaigns.nameToken);

export default async function Campaign({ params }: { params: Promise<{ id: string }> }) {
  const { agencyId } = await requireAgency("agency.campaigns.send");
  const { t, fmt } = await getI18n();
  const c = (await get(`SELECT * FROM campaigns WHERE id = ? AND agency_id = ?`, Number((await params).id), agencyId)) as { id: number; trade: string; date_from: string; date_to: string; message: string; status: string } | undefined;
  if (!c) notFound();
  const recs = (await all(
    `SELECT r.*, k.name, k.company, k.phone, k.city FROM campaign_recipients r JOIN crm_contacts k ON k.id = r.contact_id WHERE r.campaign_id = ? ORDER BY r.booked_at IS NULL, r.opened_at IS NULL, r.sent_at IS NOT NULL, k.name`
  , c.id)) as { id: number; ref: string; sent_at: string | null; opened_at: string | null; booked_at: string | null; name: string; company: string | null; phone: string; city: string | null }[];
  const n = (f: (r: (typeof recs)[number]) => unknown) => recs.filter(f).length;
  const sub = TOKENS.reduce((s, tok) => s.replaceAll(tok, "…"), c.message);
  return (
    <div className="space-y-5">
      <PageHead back="/a/campaigns" title={t("market.campaigns.detail.title", { trades: fmt.trades(c.trade), from: fmt.date(c.date_from), to: fmt.date(c.date_to) })} sub={sub}>
        {c.status === "draft" && <form action={markCampaignSent}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost">{t("market.campaigns.detail.markDone")}</button></form>}
      </PageHead>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("market.campaigns.detail.recipients")} value={<span className="num">{recs.length}</span>} />
        <Stat label={t("market.campaigns.detail.sent")} value={<span className="num">{n((r) => r.sent_at)}</span>} />
        <Stat label={t("market.campaigns.detail.viewed")} value={<span className="num">{n((r) => r.opened_at)}</span>} />
        <Stat label={t("market.campaigns.detail.requests")} value={<span className="num">{n((r) => r.booked_at)}</span>} tone="hazard" />
      </div>
      <p className="text-sm text-muted">{t("market.campaigns.detail.note")}</p>
      <div className="card divide-y divide-line">
        {recs.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-40 flex-1"><b>{r.name}</b> <span className="text-muted">{[r.company, r.city && fmt.city(r.city)].filter(Boolean).map((x) => ` · ${x}`).join("")}</span></span>
            {r.booked_at ? <span className="chip-ok">{t("market.campaigns.detail.booked")}</span> : r.opened_at ? <span className="chip-info">{t("market.campaigns.detail.viewedOne")}</span> : r.sent_at ? <span className="chip-muted">{t("market.campaigns.detail.sentOne")}</span> : null}
            <a href={`/api/wa/${r.id}`} target="_blank" className={r.sent_at ? "btn-ghost btn-sm" : "btn-ok btn-sm"}><IWhatsapp className="h-4 w-4" />{r.sent_at ? t("market.campaigns.detail.again") : t("market.campaigns.detail.send")}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
