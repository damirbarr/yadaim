import { Avatar } from "@/components/ui";
import { ICheck, IWhatsapp } from "@/components/icons";
import { getI18n } from "@/lib/i18n/server";
import { addDays, todayISO } from "@/lib/domain";

// Product pictures for the landing page. They are drawn as the real screens look (white sheet, line border,
// dashed row rules) at their natural size, so the page shows the product instead of a device mock-up.
// Every frame is self-sized: callers place them with self-start, never stretch them to a grid row.

const DOCS = ["visa", "insurance", "heights"] as const;
// Keeps a "from–to" date range in reading order inside RTL text: the whole range is one LTR isolate (LRI … PDI).
const ltr = (s: string) => `\u2066${s}\u2069`;

/** Small green "document valid" marks, as in the search results. */
async function DocMarks({ className = "" }: { className?: string }) {
  const { fmt } = await getI18n();
  return (
    <div className={`flex flex-wrap gap-x-2.5 gap-y-0.5 text-[12px] font-semibold text-ok ${className}`}>
      {DOCS.map((d) => <span key={d} className="inline-flex items-center gap-1"><ICheck className="h-3 w-3" />{fmt.docShort(d)}</span>)}
    </div>
  );
}

/** Lime drafting frame offset behind a sheet on navy: the blueprint "registration mark" for the hero picture. */
function Offset() {
  return <span aria-hidden className="pointer-events-none absolute inset-0 translate-y-3 border border-hazard/45 ltr:translate-x-3 rtl:-translate-x-3" />;
}

/** Hero: tomorrow's crew, named and priced, the evening before. */
export async function CrewCard() {
  const { t, fmt } = await getI18n();
  const crew = [
    { id: 3, n: t("public.landing.names.sergei"), tk: "formwork", c: "MD", y: 14, r: 4.9 },
    { id: 8, n: t("public.landing.names.rajesh"), tk: "formwork", c: "IN", y: 9, r: 4.8 },
    { id: 20, n: t("public.landing.names.mikhail"), tk: "rebar", c: "BY", y: 11, r: 4.7 },
  ];
  return (
    <figure className="w-full max-w-[440px]">
      <div className="relative">
        <Offset />
        <div className="relative rounded-[3px] bg-white text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)]">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3.5 pt-4">
          <div className="min-w-0">
            <div className="text-[12px] text-muted">{t("public.landing.hero.where")}</div>
            <div className="mt-0.5 text-[20px] font-bold leading-tight">{t("public.landing.hero.title")}</div>
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-[3px] bg-ink px-2 py-1 text-[12px] font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />{t("public.landing.hero.locked")}
          </span>
        </div>
        <ul className="px-5">
          {crew.map((w) => (
            <li key={w.id} className="flex items-center gap-3 border-b border-dashed border-line py-3">
              <Avatar w={{ id: w.id, trade: w.tk, country: w.c }} size={42} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold leading-snug">{w.n}</div>
                <div className="text-[12px] text-muted">{fmt.trade(w.tk)} · {t("public.landing.hero.years", { n: w.y })}</div>
                <DocMarks className="mt-1" />
              </div>
              <span className="num shrink-0 text-[14px] font-semibold">★ {fmt.num(w.r, 1)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-[12px] text-muted">
          <span>{t("public.landing.hero.pickup", { time: "06:15", driver: t("public.landing.names.driver") })}</span>
          <span>{t("public.landing.hero.included")}</span>
        </div>
        <div className="flex items-center justify-between rounded-b-[3px] bg-hazard px-5 py-3">
          <span className="text-[14px] font-semibold">{t("public.landing.hero.total")}</span>
          <span className="num text-[24px] font-bold leading-none">{fmt.money(1962)}</span>
        </div>
      </div>
      </div>
      {/* The morning after: the check-in result, as the notification a contractor gets. */}
      <figcaption className="relative z-10 -mt-3 ms-5 inline-flex max-w-[calc(100%-2.5rem)] items-center gap-2 rounded-[3px] border border-line bg-paper px-3 py-2 text-[13px] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(0,0,0,.55)]">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok text-white"><ICheck className="h-3 w-3" /></span>
        {t("public.landing.hero.arrived", { time: "07:02" })}
      </figcaption>
    </figure>
  );
}

/** Contractor section: a search result with two workers picked and the running daily total. */
export async function SearchCard() {
  const { t, rich, fmt } = await getI18n();
  const picks = [
    { id: 3, n: t("public.landing.names.sergei"), c: "MD", y: 14, r: 4.9, p: 657, on: true },
    { id: 8, n: t("public.landing.names.rajesh"), c: "IN", y: 9, r: 4.8, p: 639, on: true },
    { id: 13, n: t("public.landing.names.wang"), c: "CN", y: 12, r: 4.7, p: 666, on: false },
  ];
  return (
    <figure className="w-full max-w-[440px] rounded-[3px] border border-line bg-white text-ink shadow-[10px_10px_0_-1px_rgba(14,42,68,.06)] rtl:shadow-[-10px_10px_0_-1px_rgba(14,42,68,.06)]">
      <div className="border-b border-line px-5 pb-3.5 pt-4">
        <div className="text-[12px] text-muted">{t("public.landing.search.where")}</div>
        <div className="mt-0.5 text-[22px] font-bold leading-tight">{t("public.landing.search.available", { n: 11, trade: fmt.trade("formwork"), trades: fmt.trades("formwork") })}</div>
      </div>
      <ul className="px-5">
        {picks.map((w) => (
          <li key={w.id} className="flex items-center gap-3 border-b border-dashed border-line py-3.5">
            <Avatar w={{ id: w.id, trade: "formwork", country: w.c }} size={46} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold leading-snug">{w.n}</div>
              <div className="text-[12px] text-muted">{t("public.landing.search.years", { n: w.y })} · <span className="num">★ {fmt.num(w.r, 1)}</span></div>
              <DocMarks className="mt-1" />
            </div>
            <div className="shrink-0 text-end">
              <div className="num text-[19px] font-bold leading-none">{fmt.money(w.p)}</div>
              <span className={`mt-1.5 inline-flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-[12px] font-bold ${w.on ? "bg-ink text-white" : "border border-ink text-ink"}`}>
                {w.on && <ICheck className="h-3 w-3" />}{w.on ? t("public.landing.search.picked") : t("public.landing.search.add")}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="m-4 flex items-center justify-between gap-3 rounded-[3px] bg-ink py-2.5 pe-2.5 ps-4 text-[14px] text-white">
        <span>{rich("public.landing.search.selected", { b: (c) => <b>{c}</b> }, { n: 2, trade: fmt.trade("formwork"), trades: fmt.trades("formwork"), price: fmt.money(1296) })}</span>
        <span className="rounded-[3px] bg-hazard px-3.5 py-1.5 text-[13px] font-bold text-ink">{t("public.landing.search.next")}</span>
      </div>
    </figure>
  );
}

/** Agency section: an idle-days offer the system drafted, waiting for the agency's approval. */
export async function OfferCard() {
  const { t, fmt } = await getI18n();
  const from = addDays(todayISO(), 2);
  const team = [{ id: 4, c: "MD" }, { id: 9, c: "IN" }, { id: 15, c: "UZ" }, { id: 22, c: "LK" }];
  return (
    <figure className="w-full max-w-[400px] rounded-[3px] border border-line bg-white text-ink shadow-[10px_10px_0_-1px_rgba(14,42,68,.06)] rtl:shadow-[-10px_10px_0_-1px_rgba(14,42,68,.06)]">
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted"><span className="h-1.5 w-1.5 rounded-full bg-signal" />{t("public.landing.agencies.offer.eyebrow")}</div>
        <div className="mt-1 text-[22px] font-bold leading-tight">{t("public.landing.agencies.offer.available", { n: 4, trade: fmt.trade("formwork"), trades: fmt.trades("formwork") })}</div>
        <div className="mt-0.5 text-[13px] text-muted">{t("public.landing.agencies.offer.dates", { range: ltr(`${fmt.date(from)}–${fmt.date(addDays(from, 2))}`) })}</div>
        <div className="mt-4 flex gap-2.5">
          {team.map((w) => <Avatar key={w.id} w={{ id: w.id, trade: "formwork", country: w.c }} size={40} />)}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/60 px-5 py-3">
        <span className="text-[13px] text-muted">{t("public.landing.agencies.offer.to", { n: 23 })}</span>
        <span className="flex gap-2">
          <span className="inline-flex items-center rounded-[3px] border border-ink px-2.5 py-1 text-[12px] font-bold">{t("public.landing.agencies.offer.edit")}</span>
          <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-ink px-2.5 py-1 text-[12px] font-bold text-white"><IWhatsapp className="h-3.5 w-3.5" />{t("public.landing.agencies.offer.approve")}</span>
        </span>
      </div>
    </figure>
  );
}

/** The dimension-line motif: a lime line with end ticks. Decorative, used once or twice on the page. */
export function DimLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" preserveAspectRatio="none" className={`h-3 text-hazard ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M1 1v10M119 1v10M1 6h118" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
