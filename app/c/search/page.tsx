import { requireContractor } from "@/lib/auth";
import { getContractor, searchWorkers } from "@/lib/queries";
import { parseSearch, toQS } from "@/lib/params";
import { DOC_TYPES, diffDays, endOfBlock, regionOf } from "@/lib/domain";
import { displayName } from "@/lib/queries";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";
import { SearchForm } from "@/components/SearchForm";
import { PriceToggles } from "@/components/PriceToggles";
import { ResultsGrid, type Hit } from "@/components/ResultsGrid";
import { Empty, Notice } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.search.title") };
}

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { contractorId } = await requireContractor("contractor.book");
  const { t, fmt } = await getI18n();
  const q = parseSearch(await searchParams);
  const hits = (await searchWorkers(q, contractorId));
  const contractor = (await getContractor(contractorId))!;
  const end = endOfBlock(q.date, q.days);
  const qs = toQS({ trade: q.trade, city: q.city, date: q.date, days: q.days, count: q.count, lodging: q.lodging, transport: q.transport });
  const agencies = new Set(hits.map((h) => h.agency.id)).size;
  const dates = q.days > 1 ? t("contractor.dateRange", { from: fmt.prettyDate(q.date), to: fmt.prettyDate(end) }) : fmt.prettyDate(q.date);
  const data: Hit[] = hits.map((h) => ({
    id: h.worker.id, name: displayName(h.worker), trade: h.worker.trade, years: h.worker.years,
    country: h.worker.country, skills: (h.worker.skills ?? "").split(",").filter(Boolean).slice(0, 3),
    rating: h.stats.rating, jobs: h.stats.jobs, arrival: h.stats.arrival, match: h.stats.match, withContractor: h.withContractor,
    agency: h.agency.name, agencyScore: h.reliability.score, agencyTier: h.reliability.tier.tone, daily: h.daily, hourly: h.hourly,
    photo: h.worker.photo,
    docs: DOC_TYPES.filter((d) => d.key !== "passport" && (d.key !== "heights" || h.heightsOk)).map((d) => {
      const soon = h.docs.expiring.find((e) => e.type === d.key);
      return { key: d.key, soon: !!soon && diffDays(end, soon.expires) < 30 };
    }),
  }));
  return (
    <div className="space-y-5">
      {/* Phone: the query is a one-line summary so the results come first; tapping it opens the form. */}
      <details className="group md:hidden">
        <summary className="sheet flex cursor-pointer list-none items-center gap-2 border-b-[3px] border-b-hazard px-4 py-3 text-[15px] [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 truncate font-semibold">
            {fmt.trades(q.trade)} · {fmt.city(q.city)} · {fmt.prettyDate(q.date)}{q.days > 1 ? ` · ${t("contractor.count.days", { n: q.days })}` : ""} · {t("contractor.count.workers", { n: q.count })}
          </span>
          <span className="text-sm font-semibold text-ink underline group-open:hidden">{t("common.change")}</span>
          <span className="hidden text-sm text-muted group-open:inline">{t("common.close")}</span>
        </summary>
        <div className="mt-2"><SearchForm d={q} compact /></div>
      </details>
      <div className="hidden md:block"><SearchForm d={q} compact /></div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4">
        <div>
          <div className="eyebrow mb-1">{t("contractor.search.eyebrow", { trade: fmt.trades(q.trade) })}</div>
          <h1 className="text-[28px] font-bold leading-tight text-ink md:text-[36px]">
            {t("contractor.search.heading", { count: t(`contractor.count.${q.trade}` as MessageKey, { n: hits.length }), dates })}
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            {fmt.city(q.city)} ({fmt.region(regionOf(q.city))}) · {t("contractor.search.fromAgencies", { n: agencies })} · {t("contractor.search.docsValid")} · {t("contractor.search.priceFor", { hours: q.hours })}
          </p>
        </div>
      </div>
      <div className="sheet p-3"><PriceToggles lodging={q.lodging} transport={q.transport} /></div>
      {hits.length > 0 && hits.length < q.count && <Notice tone="warn">{t("contractor.search.partial", { found: hits.length, wanted: q.count })}</Notice>}
      {hits.length === 0 ? (
        <Empty title={t("contractor.search.emptyTitle")}>{t("contractor.search.emptyBody")}</Empty>
      ) : (
        <ResultsGrid hits={data} qs={qs} count={q.count} days={q.days} canBook={!!contractor.verified} />
      )}
    </div>
  );
}
