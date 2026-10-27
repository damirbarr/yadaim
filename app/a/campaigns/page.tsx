import Link from "next/link";
import type { ReactNode } from "react";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all } from "@/lib/db";
import { getAgency, workerStats } from "@/lib/queries";
import { IDLE_DAY_COST, REGIONS, SALE_PCTS } from "@/lib/domain";
import { isISODate } from "@/lib/calendar";
import { datedWindows, idleWindows, regularRange, type OfferWindow } from "@/lib/promotions";
import { appUrl } from "@/lib/wa";
import { Empty, Notice, PageHead } from "@/components/ui";
import { OfferBuilder, type OfferContact, type OfferOption, type OfferTrade } from "@/components/campaign/OfferBuilder";
import { getI18n } from "@/lib/i18n/server";
import { offerBody, offerTail } from "./offer";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("market.campaigns.title") };
}

type SP = { trade?: string; from?: string };

export default async function Campaigns({ searchParams }: { searchParams: Promise<SP> }) {
  const { user, agencyId } = await requireAgency();
  const i18n = await getI18n();
  const { t, rich, fmt } = i18n;
  const num = (x: ReactNode) => <span className="num" dir="ltr">{x}</span>; // a date range: keep 28.10–10.11 in order
  const sp = await searchParams;
  const a = (await getAgency(agencyId))!;
  // From the calendar (?trade=&from=): one trade, starting on that day, with a sale price suggested.
  // Otherwise: one ready-made offer per trade with idle days, so picking another trade on the page is instant.
  const fromDay = sp.trade && isISODate(sp.from) ? sp.from : null;
  const dated = fromDay ? await datedWindows(agencyId, sp.trade!, fromDay, a.min_days) : null;
  const windows = dated?.length ? dated : await idleWindows(agencyId);
  const stats = await workerStats([...new Set(windows.flatMap((w) => w.workers.map((x) => x.id)))]);
  const option = (w: OfferWindow): OfferOption => {
    const rated = w.workers.map((x) => stats.get(x.id)?.rating).filter((x): x is number => x != null);
    const avg = rated.length ? rated.reduce((x, y) => x + y, 0) / rated.length : 0;
    return {
      to: w.to, workerCount: w.workers.length, idleDays: w.idleDays, cost: w.idleDays * IDLE_DAY_COST,
      body: offerBody(i18n, { trade: w.trade, workerCount: w.workers.length, from: w.from, to: w.to }, avg), ...regularRange(a, w.workers),
    };
  };
  const trades: OfferTrade[] = dated?.length
    ? [{ trade: dated[0].trade, from: dated[0].from, options: dated.map(option) }]
    : windows.map((w) => ({ trade: w.trade, from: w.from, options: [option(w)] }));
  // Sorted by name like the campaign page, so the name in the preview is the first contractor the agency will send to.
  const contacts = (await all(
    `SELECT name, region, CASE WHEN opted_out = 1 THEN 1 WHEN last_sent_at > now_txt(interval '-3 days') THEN 2 ELSE 0 END AS s
     FROM crm_contacts WHERE agency_id = ? ORDER BY name`
  , agencyId)) as { name: string; region: string | null; s: 0 | 1 | 2 }[];
  const past = (await all(
    `SELECT c.id, c.trade, c.date_from, c.date_to, c.created_at, (SELECT MAX(p.pct) FROM promotions p WHERE p.campaign_id = c.id) AS sale, COUNT(r.id) AS total, COUNT(r.sent_at) AS sent, COUNT(r.opened_at) AS opened, COUNT(r.booked_at) AS booked
     FROM campaigns c LEFT JOIN campaign_recipients r ON r.campaign_id = c.id WHERE c.agency_id = ?
     GROUP BY c.id, c.trade, c.date_from, c.date_to, c.created_at ORDER BY c.id DESC`
  , agencyId)) as { id: number; trade: string; date_from: string; date_to: string; created_at: string; sale: number | null; total: number; sent: number; opened: number; booked: number }[];

  return (
    <div className="space-y-8">
      <PageHead title={t("market.campaigns.title")} sub={t("market.campaigns.sub")} />
      {fromDay && !dated?.length && (
        <Notice tone="warn">{t("market.campaigns.datedNone", { trades: fmt.trades(sp.trade!), date: fmt.date(fromDay), min: fmt.minDays(a.min_days) })}</Notice>
      )}
      {trades.length === 0 ? (
        <Empty title={t("market.campaigns.emptyTitle")}>{t("market.campaigns.emptyBody")}</Empty>
      ) : (
        <OfferBuilder
          trades={trades}
          initialTrade={trades.find((x) => x.trade === sp.trade)?.trade ?? trades[0].trade}
          dated={!!dated?.length}
          minDays={a.min_days}
          initialPct={dated?.length ? SALE_PCTS[0] : 0}
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
                    {c.sale != null && <span className="chip-hazard">{t("market.campaigns.pastSale", { pct: c.sale })}</span>}
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
