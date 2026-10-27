import type React from "react";
import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { agencyReliability, bookingsWhere, idleForecast, weeklyUtilization } from "@/lib/queries";
import { addDays, IDLE_DAY_COST, nowParts, nextWorkday, todayISO } from "@/lib/domain";
import { eventText } from "@/lib/events";
import { getI18n } from "@/lib/i18n/server";
import { Avatar, PageHead, ScoreRing } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("agency.today.title") };
}

export default async function AgencyToday() {
  const { user, agencyId } = await requireAgency();
  const i18n = await getI18n();
  const { t, rich, fmt, dir } = i18n;
  const b_ = (c: React.ReactNode) => <b className="num text-ink">{c}</b>;
  const crew = (n: number, k: string) => t("agency.crew", { n, trade: fmt.trade(k), trades: fmt.trades(k) });
  const today = todayISO();
  const tomorrow = nextWorkday(today);
  const rel = (await agencyReliability(agencyId));
  const util = (await weeklyUtilization(agencyId));
  const idle = (await idleForecast(agencyId, 10));
  const idleDays = idle.reduce((a, e) => a + e.idleDays, 0);
  const onSite = (await bookingsWhere(`b.agency_id = ? AND b.status = 'approved' AND b.date <= ? AND b.end_date >= ? ORDER BY b.date`, agencyId, today, today));
  const tmr = (await bookingsWhere(`b.agency_id = ? AND b.status = 'approved' AND b.date <= ? AND b.end_date >= ? ORDER BY b.date`, agencyId, tomorrow, tomorrow));
  const requests = (await bookingsWhere(`b.agency_id = ? AND b.status = 'requested' AND b.date >= ? ORDER BY b.created_at`, agencyId, today));
  const expiring = ((await get(`SELECT COUNT(*) AS n FROM documents d JOIN workers w ON w.id = d.worker_id WHERE w.agency_id = ? AND w.active = 1 AND d.expires <= ?`, agencyId, addDays(today, 14))) as { n: number }).n;
  const events = (await all(`SELECT id, kind, text, msg, params, created_at, booking_id FROM events WHERE agency_id = ? ORDER BY id DESC LIMIT 8`, agencyId)) as { id: number; kind: string; text: string | null; msg: string | null; params: string | null; created_at: string; booking_id: number | null }[];
  const { time } = nowParts();
  const hello = time < "12:00" ? "morning" : time < "17:00" ? "noon" : "evening";
  const marks = t("agency.today.marks").split(" ");
  const max = Math.max(100, ...util.map((u) => u.pct));
  const onSiteCount = onSite.reduce((a, b) => a + b.workers.filter((w) => w.state === "assigned").length, 0);
  const tmrCount = tmr.reduce((a, b) => a + b.workers.filter((w) => w.state === "assigned").length, 0);
  const missingTransport = tmr.filter((b) => b.transport === "agency" && !b.pickup_time);

  const last = util[util.length - 1]?.pct ?? 0;
  const lo = Math.max(0, Math.min(...util.map((u) => u.pct)) - 20);
  // The timeline reads in the page direction: oldest week at the start (right in RTL, left in LTR).
  const step = (i: number) => (i * 268) / (util.length - 1);
  const pts = util.map((u, i) => [util.length > 1 ? (dir === "rtl" ? 284 - step(i) : 16 + step(i)) : 150, 88 - ((u.pct - lo) / (max - lo || 1)) * 72] as const);
  const sheetHead = (title: string, note?: React.ReactNode) => (
    <div className="flex items-baseline justify-between border-b border-line px-5 py-3"><h2 className="text-[21px] font-bold text-ink">{title}</h2>{note && <span className="text-[13px] text-muted">{note}</span>}</div>
  );

  return (
    <div className="space-y-7">
      <PageHead eyebrow={t("agency.today.eyebrow", { date: fmt.date(today) })} title={t(`agency.today.hello.${hello}`, { name: user.name.split(" ")[0] })}
        sub={<>{rich("agency.today.onSite", { b: b_ }, { n: onSiteCount })} · {rich("agency.today.tomorrow", { b: b_ }, { n: tmrCount })}</>} />

      <div className="grid border border-line bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          { k: marks[0], href: "/a/requests", label: t("agency.today.stats.pending"), v: requests.length, hint: requests.length ? <>{t("agency.today.stats.pendingHint")} <span className="inline-block flip-ltr">←</span></> : t("agency.today.stats.noPending"), dark: requests.length > 0 },
          { k: marks[1], href: "/a/campaigns", label: t("agency.today.stats.idle"), v: idleDays, hint: rich("agency.today.stats.idleHint", { n: (c) => <span className="num">{c}</span> }, { cost: fmt.money(idleDays * IDLE_DAY_COST) }), tone: idleDays > 40 ? "text-bad" : "" },
          { k: marks[2], href: "/a/compliance", label: t("agency.today.stats.expiring"), v: expiring, hint: t("agency.today.stats.expiringHint"), tone: expiring ? "text-bad" : "text-ok" },
          { k: marks[3], href: null, label: t("agency.today.stats.util"), v: `${last}%`, hint: t("agency.today.stats.utilHint") },
        ].map((c) => {
          const body = (
            <div className={`relative h-full border-line p-5 sm:[&:not(:last-child)]:border-e ${c.dark ? "blueprint" : ""}`}>
              <span className={`absolute end-3 top-2.5 text-[11px] font-bold tracking-widest ${c.dark ? "text-white/50" : "text-muted"}`}>{c.k}</span>
              <div className={`text-[13px] font-semibold ${c.dark ? "text-white/70" : "text-muted"}`}>{c.label}</div>
              <div className={`num mt-1 font-display text-[52px] font-bold leading-none ${c.dark ? "text-hazard" : c.tone || "text-ink"}`}>{c.v}</div>
              <div className={`mt-2 text-[13px] ${c.dark ? "font-bold text-white" : "text-muted"}`}>{c.hint}</div>
            </div>
          );
          return c.href ? <Link key={c.k} href={c.href} className="block border-b border-line transition hover:bg-paper xl:border-b-0">{body}</Link> : <div key={c.k} className="border-b border-line xl:border-b-0">{body}</div>;
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <section className="sheet">
          {sheetHead(t("agency.today.reliability.title"), t("agency.today.reliability.note"))}
          <div className="p-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={rel.score} />
              <div>
                <div className={rel.tier.tone === "good" ? "chip-ok" : rel.tier.tone === "ok" ? "chip-info" : rel.tier.tone === "warn" ? "chip-warn" : "chip-bad"}>{t(`domain.reliability.${rel.tier.tone}`)}</div>
                <p className="mt-2 text-[13px] text-muted">{t("agency.today.reliability.explain")}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-[14px]">
              {[
                [t("agency.today.reliability.arrival"), rel.arrival],
                [t("agency.today.reliability.match"), rel.match],
                [t("agency.today.reliability.quality"), rel.quality],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center gap-3">
                  <dt className="flex-1 text-muted">{k}</dt>
                  <div className="h-[5px] w-24 bg-paper-2"><div className="h-full bg-ink" style={{ width: `${Math.round((v as number) * 100)}%` }} /></div>
                  <dd className="num w-10 text-end font-bold text-ink">{Math.round((v as number) * 100)}%</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-dashed border-line pt-2"><dt className="text-muted">{t("agency.today.reliability.cancels")}</dt><dd className="num font-bold text-ink">{rel.cancels}</dd></div>
            </dl>
          </div>
        </section>

        <section className="sheet">
          {sheetHead(t("agency.today.utilization.title"), t("agency.today.utilization.note"))}
          <div className="paper-grid px-5 pb-4 pt-5">
            <svg viewBox="0 0 300 100" className="h-44 w-full" preserveAspectRatio="none" aria-label={t("agency.today.utilization.aria")}>
              <line x1="0" y1={88 - ((100 - lo) / (max - lo || 1)) * 72} x2="300" y2={88 - ((100 - lo) / (max - lo || 1)) * 72} stroke="#0e2a44" strokeOpacity=".25" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#0e2a44" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="-mt-[176px] mb-2 h-44 w-full" style={{ position: "relative" }}>
              {pts.map(([x, y], i) => (
                <span key={i} className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink ${i === pts.length - 1 ? "h-4 w-4 bg-signal" : "h-3 w-3 bg-white"}`} style={{ left: `${(x / 300) * 100}%`, top: `${y}%` }} />
              ))}
            </div>
            <div className="grid text-center" style={{ gridTemplateColumns: `repeat(${util.length}, 1fr)` }}>
              {util.map((u, i) => (
                <div key={u.label}>
                  <div className={`num font-display text-[22px] font-bold ${i === util.length - 1 ? "text-ink" : "text-muted"}`}>{u.pct}%</div>
                  <div className="num text-[12px] text-muted">{u.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {(requests.length > 0 || missingTransport.length > 0 || idle.length > 0) && (
        <section className="sheet">
          {sheetHead(t("agency.today.todo.title"), requests.length ? t("agency.today.todo.note", { n: requests.length }) : undefined)}
          <ul>
            {requests.slice(0, 4).map((b) => (
              <li key={b.id}>
                <Link href={`/a/requests/${b.id}`} className="flex items-center gap-4 border-b border-dashed border-line px-5 py-4 transition hover:bg-paper">
                  <span className="num w-16 shrink-0 font-display text-[28px] font-bold leading-none text-ink">{fmt.date(b.date)}</span>
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
                <Link href={`/a/requests/${b.id}`} className="flex items-center gap-4 border-b border-dashed border-line px-5 py-4 transition hover:bg-paper">
                  <span className="w-16 shrink-0 text-[13px] font-bold text-warn">{t("agency.today.todo.transport")}</span>
                  <span className="flex-1 text-[15px]">{rich("agency.today.todo.transportText", { b: (c) => <b className="text-ink">{c}</b> }, { company: b.company })}</span>
                </Link>
              </li>
            ))}
            {idle[0] && idle[0].idleDays >= 5 && (
              <li>
                <Link href={`/a/campaigns?trade=${idle[0].trade}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-paper">
                  <span className="w-16 shrink-0 text-[13px] font-bold text-info">{t("agency.today.todo.opportunity")}</span>
                  <span className="flex-1 text-[15px]">{rich("agency.today.todo.opportunityText", { b: (c) => <b>{c}</b> }, { days: t("agency.days", { n: idle[0].idleDays }), crew: crew(idle[0].workerCount, idle[0].trade), date: fmt.date(idle[0].to) })}</span>
                  <span className="btn-ghost btn-sm shrink-0">{t("agency.today.todo.toOffer")}</span>
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="sheet">
          {sheetHead(t("agency.today.onSiteTitle"), t("agency.workers", { n: onSiteCount }))}
          {onSite.length === 0 ? <p className="p-5 text-[15px] text-muted">{t("agency.today.noneOnSite")}</p> : (
            <ul>
              {onSite.map((b) => (
                <li key={b.id} className="border-b border-dashed border-line px-5 py-3.5 last:border-0">
                  <div className="flex items-center justify-between gap-3 text-[15px]"><b className="text-ink">{b.company}</b><span className="truncate text-[13px] text-muted">{b.address}</span></div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.workers.filter((w) => w.state === "assigned").map((w) => (
                      <span key={w.bw_id} className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-0.5 pe-2.5 ps-0.5 text-[13px]">
                        <Avatar w={w} size={24} className="!border" />{w.first_name}
                        {w.identity_ok === "no" || w.trade_ok === "no" ? <span className="font-bold text-bad">{t("agency.today.noFit")}</span> : w.arrived === 0 ? <span className="font-bold text-bad">{t("agency.today.noShow")}</span> : w.checkin_at ? <span className="font-bold text-ok">✓</span> : <span className="text-muted">·</span>}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="sheet">
          {sheetHead(t("agency.today.updates"))}
          {events.length === 0 && <p className="p-5 text-[15px] text-muted">{t("agency.today.noUpdates")}</p>}
          <ul className="text-[14px]">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-dashed border-line px-5 py-2.5 last:border-0">
                <span className={`mt-[7px] h-2 w-2 shrink-0 ${e.kind === "nofit" || e.kind === "noshow" || e.kind === "cancel" ? "bg-bad" : e.kind === "request" ? "bg-signal" : "bg-line"}`} />
                <span className="flex-1">{e.booking_id ? <Link href={`/a/requests/${e.booking_id}`} className="hover:underline">{eventText(e, i18n)}</Link> : eventText(e, i18n)}</span>
                <span className="num text-[12px] text-muted">{fmt.date(e.created_at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
