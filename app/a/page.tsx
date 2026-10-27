import type React from "react";
import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { can } from "@/lib/rbac";
import { agencyReliability, bookingsWhere, getAgency, idleForecast, weeklyUtilization } from "@/lib/queries";
import { nextWeekAvailability, searchRank } from "@/lib/dashboard";
import { addDays, IDLE_DAY_COST, nowParts, nextWorkday, todayISO } from "@/lib/domain";
import { eventText } from "@/lib/events";
import { getI18n } from "@/lib/i18n/server";
import { Avatar, PageHead, ScoreRing } from "@/components/ui";
import { SheetHead, WhyBox } from "@/components/dashboard/Sheet";
import { UtilizationBars } from "@/components/dashboard/UtilizationBars";
import { WeekBars, WeekLegend } from "@/components/dashboard/WeekBars";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("agency.today.title") };
}

// Reads top-down: what needs action now, next week's free days, then performance, then what is happening on site.
export default async function AgencyToday() {
  const { user, agencyId } = await requireAgency();
  const i18n = await getI18n();
  const { t, rich, fmt, intl } = i18n;
  const b_ = (c: React.ReactNode) => <b className="num text-ink">{c}</b>;
  const crew = (n: number, k: string) => t("agency.crew", { n, trade: fmt.trade(k), trades: fmt.trades(k) });
  const today = todayISO();
  const tomorrow = nextWorkday(today);
  const agency = (await getAgency(agencyId))!;
  const rel = await agencyReliability(agencyId);
  const rank = await searchRank(agency);
  const util = await weeklyUtilization(agencyId);
  const week = await nextWeekAvailability(agencyId, today);
  const idle = await idleForecast(agencyId, 10);
  const onSite = await bookingsWhere(`b.agency_id = ? AND b.status = 'approved' AND b.date <= ? AND b.end_date >= ? ORDER BY b.date`, agencyId, today, today);
  const tmr = await bookingsWhere(`b.agency_id = ? AND b.status = 'approved' AND b.date <= ? AND b.end_date >= ? ORDER BY b.date`, agencyId, tomorrow, tomorrow);
  const requests = await bookingsWhere(`b.agency_id = ? AND b.status = 'requested' AND b.date >= ? ORDER BY b.created_at`, agencyId, today);
  const expiring = ((await get(`SELECT COUNT(*) AS n FROM documents d JOIN workers w ON w.id = d.worker_id WHERE w.agency_id = ? AND w.active = 1 AND d.expires <= ?`, agencyId, addDays(today, 14))) as { n: number }).n;
  const events = (await all(`SELECT id, kind, text, msg, params, created_at, booking_id FROM events WHERE agency_id = ? ORDER BY id DESC LIMIT 8`, agencyId)) as { id: number; kind: string; text: string | null; msg: string | null; params: string | null; created_at: string; booking_id: number | null }[];
  const { time } = nowParts();
  const hello = time < "12:00" ? "morning" : time < "17:00" ? "noon" : "evening";
  const onSiteCount = onSite.reduce((a, b) => a + b.workers.filter((w) => w.state === "assigned").length, 0);
  const tmrCount = tmr.reduce((a, b) => a + b.workers.filter((w) => w.state === "assigned").length, 0);
  const missingTransport = tmr.filter((b) => b.transport === "agency" && !b.pickup_time);
  const opportunity = idle[0] && idle[0].idleDays >= 5 ? idle[0] : null;
  const lastUtil = util[util.length - 1]?.pct ?? 0;
  const canPublish = can(user, "agency.campaigns.send");

  const shortDay = new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: "UTC" });
  const weekBars = week.week.map((d) => {
    const weekday = shortDay.format(new Date(d.date + "T12:00:00Z"));
    return {
      ...d, weekday, dateLabel: fmt.date(d.date), href: `/a/calendar?d=${d.date}`,
      count: d.free ? String(d.free) : null,
      word: d.free ? t("agency.today.week.freeTop", { n: d.free }) : t("agency.today.week.full"),
      aria: t("agency.today.week.dayAria", { day: fmt.prettyDate(d.date), assigned: d.assigned, free: d.free, total: d.total }),
    };
  });
  const range = week.week.length ? fmt.range(fmt.date(week.week[0].date), fmt.date(week.week[week.week.length - 1].date)) : null;
  const hasWorkers = week.week.some((d) => d.total > 0);

  const metrics = [
    { k: "arrival", label: t("agency.today.reliability.arrival"), note: t("agency.today.reliability.arrivalNote"), v: `${Math.round(rel.arrival * 100)}%` },
    { k: "match", label: t("agency.today.reliability.match"), note: t("agency.today.reliability.matchNote"), v: `${Math.round(rel.match * 100)}%` },
    { k: "quality", label: t("agency.today.reliability.quality"), note: t("agency.today.reliability.qualityNote"), v: `${Math.round(rel.quality * 100)}%` },
    { k: "cancels", label: t("agency.today.reliability.cancels"), note: t("agency.today.reliability.cancelsNote"), v: String(rel.cancels) },
    ...(rank ? [{ k: "rank", label: t("agency.today.reliability.rank"), note: t("agency.today.reliability.rankNote", { trades: fmt.trades(rank.trade), region: fmt.region(rank.region) }), v: t("agency.today.reliability.rankValue", { rank: rank.rank, of: rank.of }) }] : []),
  ];

  const stats = [
    { k: "pending", href: "/a/requests", label: t("agency.today.stats.pending"), v: requests.length, hint: requests.length ? <>{t("agency.today.stats.pendingHint")} <span className="inline-block flip-ltr">←</span></> : t("agency.today.stats.noPending"), dark: requests.length > 0, tone: "" },
    { k: "expiring", href: "/a/compliance", label: t("agency.today.stats.expiring"), v: expiring, hint: t("agency.today.stats.expiringHint"), dark: false, tone: expiring ? "text-bad" : "text-ok" },
  ];
  const hasTodo = requests.length > 0 || missingTransport.length > 0 || !!opportunity;

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHead eyebrow={fmt.prettyDate(today)} title={t(`agency.today.hello.${hello}`, { name: user.name.split(" ")[0] })}
        sub={<>{rich("agency.today.onSite", { b: b_ }, { n: onSiteCount })} · {rich("agency.today.tomorrow", { b: b_ }, { n: tmrCount })}</>} />

      {/* 1. Needs action now */}
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        <div className="grid grid-cols-2 border border-line bg-white lg:grid-cols-1">
          {stats.map((c, i) => (
            <Link key={c.k} href={c.href} className={`block border-line transition hover:bg-paper ${i === 0 ? "border-e lg:border-e-0 lg:border-b" : ""}`}>
              <div className={`h-full p-4 sm:p-5 ${c.dark ? "blueprint" : ""}`}>
                <div className={`text-[13px] font-semibold ${c.dark ? "text-white/70" : "text-muted"}`}>{c.label}</div>
                <div className={`num mt-1 text-[44px] font-bold leading-none sm:text-[52px] ${c.dark ? "text-hazard" : c.tone || "text-ink"}`}>{c.v}</div>
                <div className={`mt-2 text-[13px] ${c.dark ? "font-bold text-white" : "text-muted"}`}>{c.hint}</div>
              </div>
            </Link>
          ))}
        </div>

        <section className="sheet" aria-labelledby="todo-h">
          <SheetHead id="todo-h" title={t("agency.today.todo.title")} note={requests.length ? t("agency.today.todo.note", { n: requests.length }) : undefined} />
          {!hasTodo && <p className="px-4 py-5 text-[15px] text-muted sm:px-5">{t("agency.today.todo.empty")}</p>}
          <ul>
            {requests.slice(0, 4).map((b) => (
              <li key={b.id}>
                <Link href={`/a/requests/${b.id}`} className="flex items-center gap-3 border-b border-dashed border-line px-4 py-3.5 transition hover:bg-paper sm:gap-4 sm:px-5">
                  <span className="num w-[60px] shrink-0 text-[20px] font-bold leading-none text-ink sm:w-[78px] sm:text-[26px]">{fmt.date(b.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]"><b className="text-ink">{b.company}</b> · {crew(b.workers.length, b.trade)}{b.days > 1 ? ` · ${t("agency.days", { n: b.days })}` : ""}</span>
                    <span className="block text-[13px] text-muted">{fmt.city(b.city)} · {t("agency.today.todo.newRequest")}</span>
                  </span>
                  <span className="btn-primary btn-sm shrink-0">{t("agency.today.todo.assign")}</span>
                </Link>
              </li>
            ))}
            {missingTransport.map((b) => (
              <li key={b.id}>
                <Link href={`/a/requests/${b.id}`} className="flex items-center gap-3 border-b border-dashed border-line px-4 py-3.5 transition hover:bg-paper sm:gap-4 sm:px-5">
                  <span className="w-[60px] shrink-0 text-[13px] font-bold text-warn sm:w-[78px]">{t("agency.today.todo.transport")}</span>
                  <span className="flex-1 text-[15px]">{rich("agency.today.todo.transportText", { b: (c) => <b className="text-ink">{c}</b> }, { company: b.company })}</span>
                </Link>
              </li>
            ))}
            {opportunity && (
              <li>
                <Link href={`/a/campaigns?trade=${opportunity.trade}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-paper sm:gap-4 sm:px-5">
                  <span className="w-[60px] shrink-0 text-[13px] font-bold text-info sm:w-[78px]">{t("agency.today.todo.opportunity")}</span>
                  <span className="min-w-0 flex-1 text-[15px]">{rich("agency.today.todo.opportunityText", { b: (c) => <b>{c}</b> }, { days: t("agency.days", { n: opportunity.idleDays }), crew: crew(opportunity.workerCount, opportunity.trade), date: fmt.date(opportunity.to) })}</span>
                  <span className="btn-ghost btn-sm shrink-0">{t("agency.today.todo.toOffer")}</span>
                </Link>
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* 2. Next week's availability */}
      <section className="sheet" aria-labelledby="week-h">
        <SheetHead id="week-h" title={t("agency.today.week.title")} note={range && <span className="num">{range.from} – {range.to}</span>} />
        {!hasWorkers ? <p className="px-4 py-5 text-[15px] text-muted sm:px-5">{t("agency.today.week.noWorkers")}</p> : (
          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1 lg:block">
              <div className="flex items-baseline gap-2 lg:block">
                <div className={`num text-[48px] font-bold leading-none sm:text-[56px] ${week.idle ? "text-ink" : "text-ok"}`}>{week.idle}</div>
                <div className="text-[14px] font-semibold text-ink lg:mt-1">{t("agency.today.week.idle", { n: week.idle })}</div>
              </div>
              {week.idle > 0 ? (
                <div className="flex items-center gap-1.5 text-[14px] text-muted lg:mt-2"><span aria-hidden className="h-2 w-2 shrink-0 bg-signal" />{t("agency.today.week.cost", { cost: fmt.money(week.idle * IDLE_DAY_COST) })}</div>
              ) : (
                <div className="text-[14px] text-muted lg:mt-2">{t("agency.today.week.allBooked")}</div>
              )}
            </div>
            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <WeekBars days={weekBars} />
            </div>
            <div className="flex flex-col gap-4 lg:justify-end">
              <WeekLegend booked={t("agency.today.week.booked")} free={t("agency.today.week.free")} />
              {week.idle > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  {canPublish && <Link href="/a/campaigns" className="btn-primary w-full sm:w-auto lg:w-full">{t("agency.today.week.publish")}</Link>}
                  {week.firstFree && <Link href={`/a/calendar?d=${week.firstFree}`} className={`${canPublish ? "btn-ghost" : "btn-primary"} w-full sm:w-auto lg:w-full`}>{t("agency.today.week.openDay")}</Link>}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 3. Performance */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="sheet" aria-labelledby="util-h">
          <SheetHead id="util-h" title={t("agency.today.utilization.title")} note={t("agency.today.utilization.note")} />
          <div className="space-y-5 p-4 sm:p-5">
            <UtilizationBars weeks={util} aria={t("agency.today.utilization.aria", { list: util.map((u) => t("agency.today.utilization.item", { date: u.label, pct: u.pct })).join(" · ") })} />
            <WhyBox label={t("agency.today.why.label")} value={`${lastUtil}%`}>{t("agency.today.why.text", { cost: fmt.money(IDLE_DAY_COST) })}</WhyBox>
          </div>
        </section>

        <section className="sheet" aria-labelledby="rel-h">
          <SheetHead id="rel-h" title={t("agency.today.reliability.title")} note={t("agency.today.reliability.note")} />
          <div className="px-4 pb-2 pt-4 sm:px-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={rel.score} size={96} />
              <div className="min-w-0">
                <div className={rel.tier.tone === "good" ? "chip-ok" : rel.tier.tone === "ok" ? "chip-info" : rel.tier.tone === "warn" ? "chip-warn" : "chip-bad"}>{t(`domain.reliability.${rel.tier.tone}`)}</div>
                <p className="mt-2 text-[13px] text-muted">{t("agency.today.reliability.explain")}</p>
              </div>
            </div>
            <dl className="mt-3">
              {metrics.map((m) => (
                <div key={m.k} className="flex items-center justify-between gap-3 border-t border-dashed border-line py-2.5">
                  <dt className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">{m.label}</span>
                    <span className="block text-[12px] text-muted">{m.note}</span>
                  </dt>
                  <dd className="num shrink-0 text-[19px] font-bold text-ink">{m.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>

      {/* 4. On site today and the activity feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="sheet" aria-labelledby="site-h">
          <SheetHead id="site-h" title={t("agency.today.onSiteTitle")} note={t("agency.workers", { n: onSiteCount })} />
          {onSite.length === 0 ? <p className="px-4 py-5 text-[15px] text-muted sm:px-5">{t("agency.today.noneOnSite")}</p> : (
            <ul>
              {onSite.map((b) => (
                <li key={b.id} className="border-b border-dashed border-line px-4 py-3.5 last:border-0 sm:px-5">
                  <div className="flex items-center justify-between gap-3 text-[15px]"><b className="text-ink">{b.company}</b><span className="truncate text-[13px] text-muted">{b.address}</span></div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.workers.filter((w) => w.state === "assigned").map((w) => (
                      <span key={w.bw_id} className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-0.5 pe-2.5 ps-0.5 text-[13px]">
                        <Avatar w={w} size={26} />{w.first_name}
                        {w.identity_ok === "no" || w.trade_ok === "no" ? <span className="font-bold text-bad">{t("agency.today.noFit")}</span> : w.arrived === 0 ? <span className="font-bold text-bad">{t("agency.today.noShow")}</span> : w.checkin_at ? <span className="font-bold text-ok">✓</span> : <span className="text-muted">·</span>}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="sheet" aria-labelledby="upd-h">
          <SheetHead id="upd-h" title={t("agency.today.updates")} />
          {events.length === 0 && <p className="px-4 py-5 text-[15px] text-muted sm:px-5">{t("agency.today.noUpdates")}</p>}
          <ul className="text-[14px]">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-dashed border-line px-4 py-2.5 last:border-0 sm:px-5">
                <span className={`mt-[7px] h-2 w-2 shrink-0 ${e.kind === "nofit" || e.kind === "noshow" || e.kind === "cancel" ? "bg-bad" : e.kind === "request" ? "bg-signal" : "bg-line"}`} />
                <span className="min-w-0 flex-1">{e.booking_id ? <Link href={`/a/requests/${e.booking_id}`} className="hover:underline">{eventText(e, i18n)}</Link> : eventText(e, i18n)}</span>
                <span className="num text-[12px] text-muted">{fmt.date(e.created_at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
