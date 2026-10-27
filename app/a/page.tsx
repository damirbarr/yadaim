import type React from "react";
import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { all, get, insert, run, tx } from "@/lib/db";
import { agencyReliability, bookingsWhere, idleForecast, weeklyUtilization } from "@/lib/queries";
import { addDays, ddmm, IDLE_DAY_COST, ils, nowParts, nextWorkday, todayISO, trade } from "@/lib/domain";
import { Avatar, PageHead, ScoreRing } from "@/components/ui";

export const metadata = { title: "היום" };

export default async function AgencyToday() {
  const { user, agencyId } = await requireAgency();
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
  const events = (await all(`SELECT * FROM events WHERE agency_id = ? ORDER BY id DESC LIMIT 8`, agencyId)) as { id: number; kind: string; text: string; created_at: string; booking_id: number | null }[];
  const { time } = nowParts();
  const hello = time < "12:00" ? "בוקר טוב" : time < "17:00" ? "צהריים טובים" : "ערב טוב";
  const max = Math.max(100, ...util.map((u) => u.pct));
  const onSiteCount = onSite.reduce((a, b) => a + b.workers.filter((w) => w.state === "assigned").length, 0);
  const tmrCount = tmr.reduce((a, b) => a + b.workers.filter((w) => w.state === "assigned").length, 0);
  const missingTransport = tmr.filter((b) => b.transport === "agency" && !b.pickup_time);

  const last = util[util.length - 1]?.pct ?? 0;
  const lo = Math.max(0, Math.min(...util.map((u) => u.pct)) - 20);
  // RTL timeline: oldest week on the right, this week on the left.
  const pts = util.map((u, i) => [util.length > 1 ? 284 - (i * 268) / (util.length - 1) : 150, 88 - ((u.pct - lo) / (max - lo || 1)) * 72] as const);
  const sheetHead = (title: string, note?: React.ReactNode) => (
    <div className="flex items-baseline justify-between border-b border-line px-5 py-3"><h2 className="text-[21px] font-bold text-ink">{title}</h2>{note && <span className="text-[13px] text-muted">{note}</span>}</div>
  );

  return (
    <div className="space-y-7">
      <PageHead eyebrow={`גיליון יומי · ${ddmm(today)}`} title={`${hello}, ${user.name.split(" ")[0]}.`} sub={<><b className="num text-ink">{onSiteCount}</b> עובדים באתרים היום · <b className="num text-ink">{tmrCount}</b> מחר</>} />

      <div className="grid border border-line bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          { k: "א", href: "/a/requests", label: "בקשות ממתינות", v: requests.length, hint: requests.length ? "קבלנים מחכים לאישור ←" : "אין בקשות פתוחות", dark: requests.length > 0 },
          { k: "ב", href: "/a/campaigns", label: "ימי עבודה פנויים · 10 ימים", v: idleDays, hint: <>עלות משוערת <span className="num">{ils(idleDays * IDLE_DAY_COST)}</span></>, tone: idleDays > 40 ? "text-bad" : "" },
          { k: "ג", href: "/a/compliance", label: "מסמכים פגים ב-14 יום", v: expiring, hint: "כולל מסמכים שכבר פגו", tone: expiring ? "text-bad" : "text-ok" },
          { k: "ד", href: null, label: "ניצול השבוע", v: `${last}%`, hint: "ימי עבודה מוזמנים / זמינים" },
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
          {sheetHead("ציון אמינות", "90 יום")}
          <div className="p-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={rel.score} />
              <div>
                <div className={rel.tier.tone === "good" ? "chip-ok" : rel.tier.tone === "ok" ? "chip-info" : rel.tier.tone === "warn" ? "chip-warn" : "chip-bad"}>{rel.tier.label}</div>
                <p className="mt-2 text-[13px] text-muted">קובע את המיקום שלכם בחיפוש של קבלנים.</p>
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-[14px]">
              {[
                ["הגעה למקום", rel.arrival],
                ["התאמה למה שהוזמן", rel.match],
                ["שביעות רצון קבלנים", rel.quality],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center gap-3">
                  <dt className="flex-1 text-muted">{k}</dt>
                  <div className="h-[5px] w-24 bg-paper-2"><div className="h-full bg-ink" style={{ width: `${Math.round((v as number) * 100)}%` }} /></div>
                  <dd className="num w-10 text-left font-bold text-ink">{Math.round((v as number) * 100)}%</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-dashed border-line pt-2"><dt className="text-muted">ביטולים של התאגיד</dt><dd className="num font-bold text-ink">{rel.cancels}</dd></div>
            </dl>
          </div>
        </section>

        <section className="sheet">
          {sheetHead("ניצול ימי עבודה", "4 שבועות אחרונים")}
          <div className="paper-grid px-5 pb-4 pt-5">
            <svg viewBox="0 0 300 100" className="h-44 w-full" preserveAspectRatio="none" aria-label="ניצול לפי שבוע">
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
          {sheetHead("דורש טיפול", requests.length ? <><span className="num">{requests.length}</span> בקשות ממתינות</> : undefined)}
          <ul>
            {requests.slice(0, 4).map((b) => (
              <li key={b.id}>
                <Link href={`/a/requests/${b.id}`} className="flex items-center gap-4 border-b border-dashed border-line px-5 py-4 transition hover:bg-paper">
                  <span className="num w-16 shrink-0 font-display text-[28px] font-bold leading-none text-ink">{ddmm(b.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]"><b className="text-ink">{b.company}</b> · {b.workers.length} {trade(b.trade).plural}{b.days > 1 ? ` · ${b.days} ימים` : ""}</span>
                    <span className="block text-[13px] text-muted">{b.city} · בקשה חדשה</span>
                  </span>
                  <span className="btn-primary btn-sm shrink-0">לשיבוץ</span>
                </Link>
              </li>
            ))}
            {missingTransport.map((b) => (
              <li key={b.id}>
                <Link href={`/a/requests/${b.id}`} className="flex items-center gap-4 border-b border-dashed border-line px-5 py-4 transition hover:bg-paper">
                  <span className="w-16 shrink-0 text-[13px] font-bold tracking-wider text-warn">הסעה</span>
                  <span className="flex-1 text-[15px]">חסרים פרטי נהג ושעת איסוף להזמנה של <b className="text-ink">{b.company}</b> מחר. הקבלן מקבל אותם ב-18:00.</span>
                </Link>
              </li>
            ))}
            {idle[0] && idle[0].idleDays >= 5 && (
              <li>
                <Link href={`/a/campaigns?trade=${idle[0].trade}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-paper">
                  <span className="w-16 shrink-0 text-[13px] font-bold tracking-wider text-info">הזדמנות</span>
                  <span className="flex-1 text-[15px]"><b className="num">{idle[0].workerCount}</b> {trade(idle[0].trade).plural} עם <b className="num">{idle[0].idleDays}</b> ימים פנויים עד <span className="num">{ddmm(idle[0].to)}</span>. המערכת הכינה הצעה לקבלנים במאגר.</span>
                  <span className="btn-ghost btn-sm shrink-0">להצעה</span>
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="sheet">
          {sheetHead("באתרים היום", <><span className="num">{onSiteCount}</span> עובדים</>)}
          {onSite.length === 0 ? <p className="p-5 text-[15px] text-muted">אין הצבות היום.</p> : (
            <ul>
              {onSite.map((b) => (
                <li key={b.id} className="border-b border-dashed border-line px-5 py-3.5 last:border-0">
                  <div className="flex items-center justify-between gap-3 text-[15px]"><b className="text-ink">{b.company}</b><span className="truncate text-[13px] text-muted">{b.address}</span></div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.workers.filter((w) => w.state === "assigned").map((w) => (
                      <span key={w.bw_id} className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-0.5 pe-2.5 ps-0.5 text-[13px]">
                        <Avatar w={w} size={24} className="!border" />{w.first_name}
                        {w.identity_ok === "no" || w.trade_ok === "no" ? <span className="font-bold text-bad">✕ לא תואם</span> : w.arrived === 0 ? <span className="font-bold text-bad">לא הגיע</span> : w.checkin_at ? <span className="font-bold text-ok">✓</span> : <span className="text-muted">·</span>}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="sheet">
          {sheetHead("עדכונים")}
          <ul className="text-[14px]">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-dashed border-line px-5 py-2.5 last:border-0">
                <span className={`mt-[7px] h-2 w-2 shrink-0 ${e.kind === "nofit" || e.kind === "noshow" || e.kind === "cancel" ? "bg-bad" : e.kind === "request" ? "bg-signal" : "bg-line"}`} />
                <span className="flex-1">{e.booking_id ? <Link href={`/a/requests/${e.booking_id}`} className="hover:underline">{e.text}</Link> : e.text}</span>
                <span className="num text-[12px] text-muted">{ddmm(e.created_at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
