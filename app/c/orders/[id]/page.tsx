import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContractor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { bookingsWhere, bookingTotals, displayName } from "@/lib/queries";
import { addDays, bookingPhase, ddmm, ils, LOCK_HOUR, PHASE_LABEL, prettyDate, todayISO, trade } from "@/lib/domain";
import { waLink } from "@/lib/wa";
import { cancelBooking, saveCrew } from "@/app/actions/contractor";
import { Avatar, Notice, PageHead, Rating } from "@/components/ui";
import { IBed, IClock, IPin, ITruck, IWhatsapp } from "@/components/icons";

export default async function Order({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string; done?: string }> }) {
  const { user, contractorId } = await requireContractor();
  const [b] = (await bookingsWhere(`b.id = ? AND b.contractor_id = ?`, Number((await params).id), contractorId));
  if (!b) notFound();
  const sp = await searchParams;
  const phase = bookingPhase(b);
  const crew = b.workers.filter((w) => w.state === "assigned");
  const completed = b.status === "completed";
  const totals = bookingTotals(b, crew, completed);
  const today = todayISO();
  const order = ["requested", "approved", "locked", "today", "completed"];
  const at = completed ? 4 : phase === "awaiting_hours" ? 3.5 : order.indexOf(phase);
  const steps = [
    { k: "נשלח", sub: ddmm(b.created_at.slice(0, 10)) },
    { k: "התאגיד אישר", sub: b.approved_at ? ddmm(b.approved_at.slice(0, 10)) : "" },
    { k: "צוות ננעל", sub: `${ddmm(addDays(b.date, -1))} ${LOCK_HOUR}` },
    { k: "באתר", sub: b.start_time },
    { k: "שעות אושרו", sub: b.completed_at ? ddmm(b.completed_at.slice(0, 10)) : "" },
  ];
  return (
    <div className="space-y-5">
      <PageHead back="/c/orders" title={`הזמנה #${b.id}`} sub={`${crew.length} ${trade(b.trade).plural} · ${prettyDate(b.date)}${b.days > 1 ? ` – ${prettyDate(b.end_date)}` : ""} · ${b.agency_name}`}>
        <a href={waLink(b.agency_phone, `שלום, לגבי הזמנה #${b.id} ל-${ddmm(b.date)}`)} target="_blank" className="btn-ghost"><IWhatsapp className="h-4 w-4" />לתאגיד</a>
      </PageHead>
      {sp.sent && <Notice tone="ok">ההזמנה נשלחה ל{b.agency_name}. התאגיד מאשר בדרך כלל תוך שעה — נעדכן כאן.</Notice>}
      {sp.done && <Notice tone="ok">השעות אושרו והדירוג נשמר. התשלום לתאגיד לפי השעות שאישרת.</Notice>}
      {b.status === "rejected" && <Notice tone="bad">התאגיד דחה את ההזמנה{b.agency_note ? `: ${b.agency_note}` : ""}. <Link className="underline" href={`/c/search?trade=${b.trade}&city=${b.city}&date=${b.date >= today ? b.date : ""}&days=${b.days}&count=${crew.length}`}>חיפוש חלופה</Link></Notice>}

      {!["rejected", "cancelled"].includes(b.status) && (
        <ol className="card grid grid-cols-5 p-4 text-center text-xs">
          {steps.map((s, i) => (
            <li key={s.k} className="relative">
              <div className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${i < at ? "bg-ink text-white" : i === Math.floor(at) || i === at ? "bg-hazard text-ink ring-4 ring-hazard/30" : "bg-paper text-muted"}`}>{i + 1}</div>
              <div className={`mt-1 font-semibold ${i <= at ? "" : "text-muted"}`}>{s.k}</div>
              <div className="num text-muted">{s.sub}</div>
            </li>
          ))}
        </ol>
      )}

      {(phase === "today" || phase === "awaiting_hours") && can(user, "contractor.site") && (
        <Link href={`/c/orders/${b.id}/site`} className="btn-hazard w-full py-3 text-base">
          {phase === "today" && today < b.end_date ? "צ׳ק־אין באתר" : phase === "today" ? "צ׳ק־אין · אישור שעות בסוף היום" : "אישור שעות ודירוג"}
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="card">
          <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{phase === "requested" ? "מי שביקשת" : "מי מגיע"}</h2>
          <ul>
            {crew.map((w) => (
              <li key={w.bw_id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                <Avatar w={w} size={48} />
                <div className="flex-1">
                  <div className="font-semibold">{displayName(w)}</div>
                  <div className="text-xs text-muted">{trade(w.trade).label} · {w.years} שנים</div>
                </div>
                {completed ? (
                  w.hours_approved ? <div className="text-left text-xs"><Rating value={w.rating} /><div className="num text-muted">{w.hours_approved} ש׳</div></div> : <span className="chip-bad">לא תואם · לא חויב</span>
                ) : w.checkin_at ? (
                  <span className={w.identity_ok === "no" || w.trade_ok === "no" ? "chip-bad" : "chip-ok"}>{w.identity_ok === "no" || w.trade_ok === "no" ? "לא תואם" : "✓ באתר"}</span>
                ) : (
                  <span className={phase === "requested" ? "chip-warn" : "chip-ok"}>{phase === "requested" ? "ממתין" : phase === "locked" || phase === "today" ? "✓ ננעל" : "✓ אושר"}</span>
                )}
              </li>
            ))}
          </ul>
          {b.agency_note && b.status !== "rejected" && <p className="border-t border-line px-5 py-3 text-sm text-muted">הערת התאגיד: {b.agency_note}</p>}
        </section>

        <aside className="space-y-4">
          <div className="card space-y-3 p-5 text-sm">
            <div className="flex gap-2"><IPin className="h-4 w-4 shrink-0 text-muted" /><span>{b.address}</span></div>
            <div className="flex gap-2"><IClock className="h-4 w-4 shrink-0 text-muted" /><span>התחלה <span className="num">{b.start_time}</span> · {b.hours} שעות ביום</span></div>
            <div className="flex gap-2"><ITruck className="h-4 w-4 shrink-0 text-muted" /><span>{b.transport === "agency" ? (b.pickup_time && ["locked", "today"].includes(phase) ? <>הסעה של התאגיד · נהג {b.driver_name} · <span className="num">{b.vehicle_no}</span> · יוצאים <span className="num">{b.pickup_time}</span></> : "הסעה של התאגיד · פרטי נהג ב-18:00 ערב לפני") : "הסעה עליך"}</span></div>
            <div className="flex gap-2"><IBed className="h-4 w-4 shrink-0 text-muted" /><span>לינה {b.lodging === "agency" ? "אצל התאגיד" : "אצלך"}</span></div>
            {b.notes && <p className="rounded-[3px] bg-paper p-3 text-muted">{b.notes}</p>}
          </div>
          <div className="card p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">{completed ? "לתשלום לתאגיד (לפי שעות שאושרו)" : "הערכה (לפני אישור שעות)"}</span>
              <span className="font-display text-2xl font-bold num">{ils(totals.gross, 2)}</span>
            </div>
            <div className="text-xs text-muted">כולל מע״מ · <span className="num">{ils(totals.net)}</span> לפני מע״מ</div>
          </div>
          {["requested", "approved"].includes(phase) && can(user, "contractor.book") && (
            <form action={cancelBooking}>
              <input type="hidden" name="id" value={b.id} />
              <button className="btn-ghost w-full text-bad">ביטול הזמנה</button>
              <p className="mt-1 text-center text-xs text-muted">אפשר לבטל בלי עלות עד 18:00 ערב לפני.</p>
            </form>
          )}
          {completed && crew.some((w) => w.hours_approved) && can(user, "contractor.crews.edit") && (
            <form action={saveCrew} className="card space-y-2 p-4">
              <input type="hidden" name="id" value={b.id} />
              <label className="label">שמירת הצוות להזמנה חוזרת</label>
              <div className="flex gap-2">
                <input className="input" name="name" placeholder={`צוות ${trade(b.trade).plural} · ${b.city}`} />
                <button className="btn-primary">שמירה</button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
