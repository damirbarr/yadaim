import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { agencyCalendar, agencyDayDetail, isISODate, monthGrid, parseMonth } from "@/lib/calendar";
import { displayName } from "@/lib/queries";
import { addDays, isWorkday, todayISO, TRADES } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { Avatar, PageHead } from "@/components/ui";
import { MonthCalendar } from "@/components/Calendar";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("calendar.agency.title") };
}

type SP = { m?: string; d?: string; trade?: string };

export default async function AgencyCalendar({ searchParams }: { searchParams: Promise<SP> }) {
  const { agencyId } = await requireAgency("agency.view");
  const { t, fmt } = await getI18n();
  const sp = await searchParams;
  const today = todayISO();
  const trade = TRADES.some((x) => x.key === sp.trade) ? sp.trade : undefined;
  const month = parseMonth(sp.m, isISODate(sp.d) ? sp.d.slice(0, 7) : undefined);
  const grid = monthGrid(month);
  // The selected day: the one asked for if it's in this month, else today (this month) or the first work day.
  let selected = isISODate(sp.d) && sp.d.slice(0, 7) === month ? sp.d : today.slice(0, 7) === month ? today : grid.first;
  if (!sp.d && !isWorkday(selected)) while (!isWorkday(selected) && selected < grid.last) selected = addDays(selected, 1);

  const { workers, assignments, days } = await agencyCalendar(agencyId, grid.first, grid.last, trade);
  const detail = agencyDayDetail(selected, workers, assignments);
  const sel = days.get(selected);

  const href = (q: { m?: string; d?: string; trade?: string | null }) => {
    const p = new URLSearchParams();
    if (q.m) p.set("m", q.m);
    if (q.d) p.set("d", q.d);
    const tr = q.trade === null ? undefined : q.trade ?? trade;
    if (tr) p.set("trade", tr);
    const s = p.toString();
    return `/a/calendar${s ? `?${s}` : ""}`;
  };

  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-ink" />{t("calendar.agency.legendAssigned")}</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 border border-line bg-hazard-soft" />{t("calendar.agency.legendFree")}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHead eyebrow={t("calendar.agency.eyebrow")} title={t("calendar.agency.title")} sub={t("calendar.agency.sub")} />

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" aria-label={t("calendar.agency.allTrades")}>
        <Link href={href({ m: month, d: sp.d, trade: null })} className={`${!trade ? "chip-hazard" : "chip-muted"} px-3 py-1.5`} aria-current={!trade ? "true" : undefined}>{t("calendar.agency.allTrades")}</Link>
        {TRADES.map((tr) => (
          <Link key={tr.key} href={href({ m: month, d: sp.d, trade: tr.key })} className={`${trade === tr.key ? "chip-hazard" : "chip-muted"} px-3 py-1.5`} aria-current={trade === tr.key ? "true" : undefined}>{fmt.trades(tr.key)}</Link>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <MonthCalendar
          month={month}
          today={today}
          selected={selected}
          href={(q) => href(q)}
          linkDays
          legend={legend}
          day={(iso) => {
            const c = days.get(iso);
            if (!c) return null; // Friday, Saturday
            const pct = c.total ? (c.assigned / c.total) * 100 : 0;
            return (
              <div aria-label={t("calendar.agency.cellAria", { date: fmt.date(iso), assigned: c.assigned, free: c.free })}>
                <div className="flex items-baseline gap-1.5 md:justify-between">
                  <span className="num font-display text-[20px] font-bold leading-none text-ink">{c.assigned}</span>
                  <span className="whitespace-nowrap text-[12px] text-muted">{t("calendar.agency.ofTotal", { n: c.total })}</span>
                </div>
                <div className="mt-1.5 flex h-[6px] bg-hazard-soft outline outline-1 -outline-offset-1 outline-line" aria-hidden>
                  <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                </div>
                <div className={`mt-1 text-[12px] font-semibold ${c.free ? "text-ok" : "text-muted"}`}>{t("calendar.agency.free", { n: c.free })}</div>
              </div>
            );
          }}
        />

        <section id="day" className="sheet scroll-mt-20 xl:sticky xl:top-6" aria-live="polite">
          <div className="blueprint px-5 py-4">
            <div className="text-[12px] font-semibold text-white/60">{selected === today ? t("calendar.today") : fmt.weekday(selected)}</div>
            <h2 className="num text-[26px] font-bold leading-tight">{fmt.fullDate(selected)}</h2>
            {sel && (
              <div className="mt-3 flex gap-5 text-[13px]">
                <div><div className="num font-display text-[28px] font-bold leading-none text-hazard">{sel.assigned}</div><div className="text-white/70">{t("calendar.agency.legendAssigned")}</div></div>
                <div><div className="num font-display text-[28px] font-bold leading-none text-white">{sel.free}</div><div className="text-white/70">{t("calendar.agency.legendFree")}</div></div>
              </div>
            )}
          </div>

          {!workers.length ? (
            <p className="p-5 text-[14px] text-muted">{t("calendar.agency.noWorkers")}</p>
          ) : !sel ? (
            <p className="p-5 text-[14px] text-muted">{t("calendar.agency.weekend")}</p>
          ) : (
            <>
              <div className="border-b border-line px-5 pb-4 pt-4">
                <h3 className="mb-2 text-[17px] font-bold text-ink">{t("calendar.agency.assignedTitle")}</h3>
                {detail.bookings.length ? (
                  <ul>
                    {detail.bookings.map(({ booking: b, workers: ws }) => (
                      <li key={b.booking_id} className="border-b border-dashed border-line py-2.5 last:border-b-0">
                        <Link href={`/a/requests/${b.booking_id}`} className="group block">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-semibold text-ink group-hover:underline">{b.company}</span>
                            <span className="chip-muted shrink-0">{t("calendar.agency.workers", { n: ws.length })}</span>
                          </div>
                          <div className="truncate text-[13px] text-muted">{fmt.trade(b.trade)} · {fmt.city(b.city)} · {b.address}</div>
                          <div className="mt-1 truncate text-[13px] text-text">{ws.map(displayName).join(", ")}</div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[14px] text-muted">{t("calendar.agency.noneAssigned")}</p>}
              </div>
              <div className="px-5 pb-5 pt-4">
                <h3 className="mb-2 text-[17px] font-bold text-ink">{t("calendar.agency.freeTitle")}</h3>
                {detail.free.size ? (
                  <ul>
                    {TRADES.filter((tr) => detail.free.has(tr.key)).map((tr) => {
                      const ws = detail.free.get(tr.key)!;
                      return (
                        <li key={tr.key} className="border-b border-dashed border-line py-2.5 last:border-b-0">
                          <div className="mb-1.5 flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-ink">{fmt.trades(tr.key)}</span>
                            <span className="num text-[13px] font-bold text-ok">{ws.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ws.map((w) => (
                              <Link key={w.id} href={`/a/workers/${w.id}`} className="inline-flex items-center gap-1.5 rounded-[3px] border border-line py-0.5 pe-2 ps-0.5 text-[13px] hover:border-ink">
                                <Avatar w={w} size={22} />{displayName(w)}
                              </Link>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="text-[14px] text-muted">{t("calendar.agency.noneFree")}</p>}
                {detail.free.size > 0 && selected >= today && (
                  <Link href="/a/campaigns" className="btn-hazard btn-sm mt-4 w-full">{t("calendar.agency.market")} <span className="inline-block flip-ltr" aria-hidden>←</span></Link>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
