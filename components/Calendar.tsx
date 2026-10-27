import Link from "next/link";
import type { ReactNode } from "react";
import { isWorkday } from "@/lib/domain";
import { monthGrid, shiftMonth } from "@/lib/calendar";
import { getI18n } from "@/lib/i18n/server";

// One month calendar for both sides, rendered on the server with no client script.
// Desktop: a Sunday-first 7-column grid (the grid follows the page direction, so Sunday sits on the right in
// Hebrew and Arabic). Phones: the same cells stack into a week-by-week agenda that shows only days with
// something in them, so there are no tiny cells to hit with a thumb.
//
// The caller supplies the content of each day; days outside the month stay empty on purpose, so a booking
// never shows up twice when paging between months.

type Query = { m?: string; d?: string };

export async function MonthCalendar({ month, today, selected, href, day, linkDays = false, empty, legend }: {
  month: string; // YYYY-MM
  today: string;
  selected?: string;
  /** Builds a link to this page with the given month/day, keeping the page's other filters. */
  href: (q: Query) => string;
  /** Content for a day in the month, or null for nothing (the day is then hidden in the phone agenda). */
  day: (iso: string) => ReactNode | null;
  /** The whole cell links to `href({ m, d })`. Use it when the cells don't hold links of their own. */
  linkDays?: boolean;
  /** Shown when no day in the month has content. */
  empty?: ReactNode;
  legend?: ReactNode;
}) {
  const { intl, t, fmt } = await getI18n();
  const { weeks } = monthGrid(month);
  const title = new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
  const short = new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: "UTC" });
  const wd = (iso: string) => short.format(new Date(iso + "T12:00:00Z"));
  const rows = weeks.map((w) => w.map((iso) => ({ iso, inMonth: iso.slice(0, 7) === month, content: iso.slice(0, 7) === month ? day(iso) : null })));
  const anything = rows.some((r) => r.some((c) => c.content != null));
  const thisMonth = today.slice(0, 7);
  // Phone week headers name the week's work days inside this month, e.g. 25.10 to 29.10.
  const weekLabel = (ds: string[]) => (ds.length ? t("calendar.week", { from: fmt.date(ds[0]), to: fmt.date(ds[ds.length - 1]) }) : null);

  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[24px] font-bold leading-none text-ink md:text-[28px]">{title}</h2>
        <nav className="flex items-center gap-1.5" aria-label={t("calendar.nav")}>
          <Link href={href({ m: shiftMonth(month, -1) })} className="btn-ghost btn-sm h-10 w-10 px-0" aria-label={t("calendar.prev")}><span className="inline-block flip-ltr" aria-hidden>→</span></Link>
          <Link href={href({})} className={`btn-sm btn h-10 border-[1.5px] ${month === thisMonth ? "border-line text-muted" : "border-ink text-ink hover:bg-ink hover:text-white"}`} aria-current={month === thisMonth ? "date" : undefined}>{t("calendar.today")}</Link>
          <Link href={href({ m: shiftMonth(month, 1) })} className="btn-ghost btn-sm h-10 w-10 px-0" aria-label={t("calendar.next")}><span className="inline-block flip-ltr" aria-hidden>←</span></Link>
        </nav>
      </div>
      {legend}
      {!anything && empty}

      <div className="sheet overflow-hidden">
        <div className="hidden grid-cols-7 border-b border-ink/20 bg-paper md:grid">
          {weeks[0].map((iso) => (
            <div key={iso} className={`px-2 py-1.5 text-[12px] font-bold ${isWorkday(iso) ? "text-ink" : "text-muted"}`}>{wd(iso)}</div>
          ))}
        </div>
        {rows.map((cells, i) => {
          const has = cells.some((c) => c.content != null);
          return (
            <div key={i} className={`${has ? "" : "hidden"} border-b border-line last:border-b-0 md:grid md:grid-cols-7`}>
              <div className="eyebrow border-b border-line bg-paper px-3 py-1.5 md:hidden">
                {weekLabel(cells.filter((c) => c.inMonth && isWorkday(c.iso)).map((c) => c.iso))}
              </div>
              {cells.map(({ iso, inMonth, content }) => {
                const off = !isWorkday(iso) || !inMonth;
                const isToday = iso === today;
                const isSel = iso === selected;
                const cls = `${content != null ? "flex" : "hidden"} items-start gap-3 border-b border-dashed border-line px-3 py-2.5 last:border-b-0 md:block md:min-h-[108px] md:border-b-0 md:border-solid md:p-1.5 md:[&:not(:last-child)]:border-e ${off ? "md:bg-paper/70" : "bg-white"} ${isSel ? "outline outline-2 -outline-offset-2 outline-ink" : ""} ${linkDays && inMonth ? "transition hover:bg-hazard-soft active:bg-hazard-soft" : ""}`;
                const body = (
                  <>
                    <div className="flex w-16 shrink-0 flex-col md:mb-1 md:w-auto md:flex-row md:items-center md:justify-between">
                      <span className="text-[12px] text-muted md:hidden">{isToday ? t("calendar.today") : wd(iso)}</span>
                      <span className={`num self-start rounded-[2px] text-[14px] font-bold md:text-[13px] ${isToday ? "bg-ink px-1.5 text-hazard" : off ? "text-muted/60" : "text-ink"}`}>
                        <span className="md:hidden">{fmt.date(iso)}</span>
                        <span className="hidden md:inline">{Number(iso.slice(8, 10))}</span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">{content}</div>
                  </>
                );
                return linkDays && inMonth ? (
                  <Link key={iso} href={href({ m: month, d: iso }) + "#day"} scroll={false} className={cls} aria-current={isSel ? "date" : undefined}>{body}</Link>
                ) : (
                  <div key={iso} className={cls}>{body}</div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
