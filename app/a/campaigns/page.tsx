import Link from "next/link";
import type { ReactNode } from "react";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all } from "@/lib/db";
import { getAgency, idleForecast, workerStats } from "@/lib/queries";
import { IDLE_DAY_COST, REGIONS } from "@/lib/domain";
import { appUrl } from "@/lib/wa";
import { Empty, PageHead } from "@/components/ui";
import { OfferBuilder, type OfferContact } from "@/components/campaign/OfferBuilder";
import { getI18n } from "@/lib/i18n/server";
import { offerBody, offerTail } from "./offer";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("market.campaigns.title") };
}

export default async function Campaigns({ searchParams }: { searchParams: Promise<{ trade?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const i18n = await getI18n();
  const { t, rich, fmt } = i18n;
  const num = (x: ReactNode) => <span className="num">{x}</span>;
  const sp = await searchParams;
  const a = (await getAgency(agencyId))!;
  const idle = await idleForecast(agencyId, 10);
  // One ready-made offer per trade, so picking another trade on the page is instant.
  const trades = await Promise.all(idle.map(async (i) => {
    const st = await workerStats(i.workerIds);
    const rated = i.workerIds.map((id) => st.get(id)?.rating).filter((x): x is number => x != null);
    const avg = rated.length ? rated.reduce((x, y) => x + y, 0) / rated.length : 0;
    return { trade: i.trade, workerCount: i.workerCount, idleDays: i.idleDays, cost: i.idleDays * IDLE_DAY_COST, body: offerBody(i18n, i, avg) };
  }));
  // Sorted by name like the campaign page, so the name in the preview is the first contractor the agency will send to.
  const contacts = (await all(
    `SELECT name, region, CASE WHEN opted_out = 1 THEN 1 WHEN last_sent_at > now_txt(interval '-3 days') THEN 2 ELSE 0 END AS s
     FROM crm_contacts WHERE agency_id = ? ORDER BY name`
  , agencyId)) as { name: string; region: string | null; s: 0 | 1 | 2 }[];
  const past = (await all(
    `SELECT c.id, c.trade, c.date_from, c.date_to, c.created_at, COUNT(r.id) AS total, COUNT(r.sent_at) AS sent, COUNT(r.opened_at) AS opened, COUNT(r.booked_at) AS booked
     FROM campaigns c LEFT JOIN campaign_recipients r ON r.campaign_id = c.id WHERE c.agency_id = ?
     GROUP BY c.id, c.trade, c.date_from, c.date_to, c.created_at ORDER BY c.id DESC`
  , agencyId)) as { id: number; trade: string; date_from: string; date_to: string; created_at: string; total: number; sent: number; opened: number; booked: number }[];

  return (
    <div className="space-y-8">
      <PageHead title={t("market.campaigns.title")} sub={t("market.campaigns.sub")} />
      {trades.length === 0 ? (
        <Empty title={t("market.campaigns.emptyTitle")}>{t("market.campaigns.emptyBody")}</Empty>
      ) : (
        <OfferBuilder
          trades={trades}
          initialTrade={trades.find((x) => x.trade === sp.trade)?.trade ?? trades[0].trade}
          regions={REGIONS.map((r) => r.key)}
          defaultRegions={a.regions.split(",").filter(Boolean)}
          contacts={contacts.map((c): OfferContact => ({ first: c.name.split(" ")[0], region: c.region, s: Number(c.s) as OfferContact["s"] }))}
          tail={offerTail(i18n, a.min_days)}
          sampleLink={appUrl("/r/k3m9qa")}
          canSend={can(user, "agency.campaigns.send")}
        />
      )}

      {past.length > 0 && (
        <section className="sheet max-w-3xl">
          <header className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line px-4 py-3">
            <h2 className="text-[18px] font-bold text-ink">{t("market.campaigns.past")}</h2>
            <span className="text-[13px] text-muted">{t("market.campaigns.pastNote")}</span>
          </header>
          <ul className="divide-y divide-dashed divide-line">
            {past.map((c) => (
              <li key={c.id}>
                <Link href={`/a/campaigns/${c.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 transition hover:bg-paper">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{rich("market.campaigns.pastTitle", { num }, { trades: fmt.trades(c.trade), from: fmt.date(c.date_from), to: fmt.date(c.date_to) })}</span>
                    <span className="block text-[13px] text-muted">{t("market.campaigns.pastSent", { date: fmt.date(c.created_at.slice(0, 10)), sent: c.sent, total: c.total })}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-[13px] sm:flex-row sm:items-center sm:gap-2">
                    <span className="text-muted">{t("market.campaigns.pastViewed", { n: c.opened })}</span>
                    <span className={c.booked ? "chip-ok" : "chip-muted"}>{t("market.campaigns.pastBooked", { n: c.booked })}</span>
                  </span>
                  <span aria-hidden className="flip-ltr text-muted">←</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
