import { requireContractor } from "@/lib/auth";
import { getContractor, searchWorkers } from "@/lib/queries";
import { parseSearch, toQS } from "@/lib/params";
import { countryLabel, DOC_TYPES, diffDays, endOfBlock, prettyDate, regionLabel, regionOf, trade } from "@/lib/domain";
import { displayName } from "@/lib/queries";
import { SearchForm } from "@/components/SearchForm";
import { PriceToggles } from "@/components/PriceToggles";
import { ResultsGrid, type Hit } from "@/components/ResultsGrid";
import { Empty, Notice } from "@/components/ui";

export const metadata = { title: "תוצאות חיפוש" };

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { contractorId } = await requireContractor("contractor.book");
  const q = parseSearch(await searchParams);
  const hits = (await searchWorkers(q, contractorId));
  const contractor = (await getContractor(contractorId))!;
  const end = endOfBlock(q.date, q.days);
  const t = trade(q.trade);
  const qs = toQS({ trade: q.trade, city: q.city, date: q.date, days: q.days, count: q.count, lodging: q.lodging, transport: q.transport });
  const agencies = new Set(hits.map((h) => h.agency.id)).size;
  const data: Hit[] = hits.map((h) => ({
    id: h.worker.id, name: displayName(h.worker), trade: h.worker.trade, tradeLabel: t.label, years: h.worker.years,
    country: countryLabel(h.worker.country), skills: (h.worker.skills ?? "").split(",").filter(Boolean).slice(0, 3),
    rating: h.stats.rating, jobs: h.stats.jobs, arrival: h.stats.arrival, match: h.stats.match, withContractor: h.withContractor,
    agency: h.agency.name, agencyScore: h.reliability.score, agencyTier: h.reliability.tier.label, daily: h.daily, hourly: h.hourly,
    photo: h.worker.photo,
    docs: DOC_TYPES.filter((d) => d.key !== "passport" && (d.key !== "heights" || h.heightsOk)).map((d) => {
      const soon = h.docs.expiring.find((e) => e.type === d.key);
      return { label: d.short, ok: true, soon: !!soon && diffDays(end, soon.expires) < 30 };
    }),
  }));
  return (
    <div className="space-y-5">
      <SearchForm d={q} compact />
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4">
        <div>
          <div className="eyebrow mb-1">תוצאות · {t.label}</div>
          <h1 className="text-[28px] font-bold leading-tight text-ink md:text-[36px]">
            <span className="num">{hits.length}</span> {t.plural} פנויים · {prettyDate(q.date)}{q.days > 1 ? ` – ${prettyDate(end)}` : ""}
          </h1>
          <p className="mt-1 text-[14px] text-muted">{q.city} ({regionLabel(regionOf(q.city))}) · מ-{agencies} תאגידים מורשים · כל האישורים בתוקף עד סוף העבודה · מחיר ל-{q.hours} שעות עבודה</p>
        </div>
      </div>
      <div className="sheet p-3"><PriceToggles lodging={q.lodging} transport={q.transport} /></div>
      {hits.length > 0 && hits.length < q.count && <Notice tone="warn">נמצאו רק {hits.length} מתוך {q.count}. אפשר להזמין את מי שיש, או לנסות תאריך אחר.</Notice>}
      {hits.length === 0 ? (
        <Empty title="אין עובדים פנויים בחיפוש הזה">נסו תאריך אחר, מקצוע קרוב או טווח ימים ארוך יותר — חלק מהתאגידים מציבים רק לשבוע ומעלה.</Empty>
      ) : (
        <ResultsGrid hits={data} qs={qs} count={q.count} days={q.days} canBook={!!contractor.verified} />
      )}
    </div>
  );
}
