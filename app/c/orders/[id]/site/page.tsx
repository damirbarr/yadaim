import { notFound } from "next/navigation";
import { requireContractor } from "@/lib/auth";
import { bookingsWhere, displayName } from "@/lib/queries";
import { bookingPhase, nowParts, todayISO, trade, WORK_TAGS } from "@/lib/domain";
import { approveHours, siteCheck } from "@/app/actions/contractor";
import { Avatar, Notice, PageHead } from "@/components/ui";

export const metadata = { title: "באתר" };

function Ask({ bw, field, q, value }: { bw: number; field: string; q: string; value: string | null }) {
  const opts = [["yes", "כן"], ["partial", "חלקית"], ["no", "לא"]] as const;
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">{q}</div>
      <div className="grid grid-cols-3 gap-2">
        {opts.map(([v, l]) => (
          <form key={v} action={siteCheck}>
            <input type="hidden" name="bw" value={bw} />
            <input type="hidden" name="field" value={field} />
            <input type="hidden" name="value" value={v} />
            <button className={`btn w-full border py-3 ${value === v ? (v === "no" ? "border-bad bg-bad text-white" : "border-ink bg-ink text-white") : "border-line bg-white"}`}>{l}</button>
          </form>
        ))}
      </div>
    </div>
  );
}

export default async function Site({ params }: { params: Promise<{ id: string }> }) {
  const { contractorId } = await requireContractor("contractor.site");
  const [b] = (await bookingsWhere(`b.id = ? AND b.contractor_id = ?`, Number((await params).id), contractorId));
  if (!b) notFound();
  const phase = bookingPhase(b);
  const crew = b.workers.filter((w) => w.state === "assigned");
  const canClose = b.status === "approved" && todayISO() >= b.end_date;
  const { time } = nowParts();
  if (!["today", "awaiting_hours", "locked"].includes(phase))
    return <div className="mx-auto max-w-md"><PageHead back={`/c/orders/${b.id}`} title="באתר" /><Notice>הצ׳ק־אין נפתח ביום העבודה.</Notice></div>;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHead back={`/c/orders/${b.id}`} title="הצוות הגיע?" sub={`הזמנה #${b.id} · ${b.address} · ${time}`} />
      <Notice>שתי שאלות לכל עובד. מי שלא תואם — לא משלמים עליו, והתאגיד מקבל התראה מיידית להחלפה.</Notice>
      {crew.map((w) => {
        const bad = w.arrived === 0 || w.identity_ok === "no" || w.trade_ok === "no";
        return (
          <section key={w.bw_id} className={`card space-y-4 p-4 ${bad ? "border-bad" : w.identity_ok && w.trade_ok ? "border-ok" : ""}`}>
            <div className="flex items-center gap-3">
              <Avatar w={w} size={64} />
              <div className="flex-1">
                <div className="text-[22px] font-bold text-ink">{displayName(w)}</div>
                <div className="text-sm text-muted">הוזמן כ{trade(w.trade).label} · {w.years} שנים</div>
              </div>
              {bad ? <span className="chip-bad">לא יחויב</span> : w.identity_ok && w.trade_ok ? <span className="chip-ok">✓ תואם</span> : null}
            </div>
            {w.arrived === 0 ? (
              <form action={siteCheck}><input type="hidden" name="bw" value={w.bw_id} /><input type="hidden" name="field" value="arrived" /><input type="hidden" name="value" value="1" />
                <button className="btn-ghost w-full">סומן “לא הגיע” · ביטול הסימון</button></form>
            ) : (
              <>
                <Ask bw={w.bw_id} field="identity_ok" q="זה האדם מהתמונה?" value={w.identity_ok} />
                <Ask bw={w.bw_id} field="trade_ok" q={`יודע לעבוד כ${trade(w.trade).label}?`} value={w.trade_ok} />
                {!w.checkin_at && (
                  <form action={siteCheck}><input type="hidden" name="bw" value={w.bw_id} /><input type="hidden" name="field" value="arrived" /><input type="hidden" name="value" value="0" />
                    <button className="w-full text-center text-xs text-muted underline">לא הגיע בכלל</button></form>
                )}
              </>
            )}
          </section>
        );
      })}

      {canClose ? (
        <form action={approveHours} className="card space-y-4 p-4">
          <input type="hidden" name="id" value={b.id} />
          <h2 className="text-[22px] font-bold text-ink">סוף {b.days > 1 ? "העבודה" : "היום"} · אישור שעות</h2>
          {crew.filter((w) => !(w.arrived === 0 || w.identity_ok === "no" || w.trade_ok === "no")).map((w) => (
            <div key={w.bw_id} className="space-y-2 border-t border-line pt-3">
              <div className="flex items-center gap-2">
                <Avatar w={w} size={32} />
                <span className="flex-1 font-semibold">{displayName(w)}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input type="number" name={`hours_${w.bw_id}`} defaultValue={b.hours * b.days} min={0} step={0.5} className="input w-20 py-1.5 text-center" /> ש׳
                </label>
              </div>
              <div className="flex gap-1" aria-label="דירוג">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="chip-muted cursor-pointer px-3 py-1.5 text-sm has-[:checked]:bg-hazard has-[:checked]:text-ink">
                    <input type="radio" name={`rating_${w.bw_id}`} value={n} defaultChecked={n === 5} className="sr-only" />
                    <span className="num">{n}</span>★
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TAGS.map((t) => (
                  <label key={t} className="chip-muted cursor-pointer px-2.5 py-1 has-[:checked]:bg-ink has-[:checked]:text-white">
                    <input type="checkbox" name={`tags_${w.bw_id}`} value={t} className="sr-only" />{t}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <textarea name="review" className="input" rows={2} placeholder="מילה על הצוות (יופיע בפרופיל העובדים)" />
          <button className="btn-ok w-full py-3 text-base">אישור שעות ודירוג</button>
          <p className="text-center text-xs text-muted">השעות שאישרת הן הבסיס לחשבונית של התאגיד.</p>
        </form>
      ) : (
        <p className="text-center text-xs text-muted">אישור השעות נפתח ביום העבודה האחרון של ההזמנה.</p>
      )}
    </div>
  );
}
