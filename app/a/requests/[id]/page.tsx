import { notFound } from "next/navigation";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all, get, insert, run, tx } from "@/lib/db";
import { bookingsWhere, bookingTotals, busyWorkers, displayName, docCheck, docsFor, workedWith, workerStats, type Worker } from "@/lib/queries";
import { bookingPhase, ddmm, docType, ils, PHASE_LABEL, prettyDate, trade } from "@/lib/domain";
import { waLink } from "@/lib/wa";
import { agencyCancel, rejectRequest, swapWorker } from "@/app/actions/agency";
import { AssignForm, type Cand } from "@/components/AssignForm";
import { Avatar, Notice, PageHead, Rating } from "@/components/ui";
import { IWhatsapp } from "@/components/icons";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, agencyId } = await requireAgency();
  const manage = can(user, "agency.requests.manage");
  const [b] = (await bookingsWhere(`b.id = ? AND b.agency_id = ?`, Number((await params).id), agencyId));
  if (!b) notFound();
  const phase = bookingPhase(b);
  const crew = b.workers.filter((w) => w.state === "assigned");
  const requestedIds = b.workers.map((w) => w.worker_id);
  const pool = (await all(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND trade = ?`, agencyId, b.trade)) as Worker[];
  const busy = (await busyWorkers(b.date, b.end_date, b.id));
  const docs = (await docsFor(pool.map((w) => w.id)));
  const stats = (await workerStats(pool.map((w) => w.id)));
  const hist = (await workedWith(b.contractor_id));
  const cands: Cand[] = pool
    .map((w) => {
      const dc = docCheck(docs.get(w.id)!, b.trade, b.end_date);
      return {
        id: w.id, name: displayName(w), trade: w.trade, years: w.years, photo: w.photo, requested: requestedIds.includes(w.id),
        withContractor: hist.get(w.id) ?? 0, rating: stats.get(w.id)!.rating, busy: busy.has(w.id), docsOk: dc.ok,
        docsNote: dc.ok ? (dc.expiring.length ? `אישורים בתוקף · ${docType(dc.expiring[0].type).short} עד ${ddmm(dc.expiring[0].expires)}` : "כל האישורים בתוקף לכל התקופה") : `חסר: ${dc.missing.map((m) => docType(m).short).join(", ")}`,
      };
    })
    .sort((x, y) => Number(y.requested) - Number(x.requested) || Number(x.busy) - Number(y.busy) || y.withContractor - x.withContractor || (y.rating ?? 0) - (x.rating ?? 0));
  const totals = bookingTotals(b, b.status === "requested" ? b.workers : crew, b.status === "completed");
  const free = cands.filter((c) => !c.busy && c.docsOk && !crew.some((w) => w.worker_id === c.id));

  return (
    <div className="space-y-5">
      <PageHead back="/a/requests" title={`${b.status === "requested" ? "בקשה" : "הזמנה"} #${b.id} · ${b.company}`} sub={`${b.workers.length} ${trade(b.trade).plural} · ${prettyDate(b.date)}${b.days > 1 ? ` – ${prettyDate(b.end_date)} (${b.days} ימים)` : ""} · ${b.start_time}, ${b.hours} שעות`}>
        <span className={b.status === "requested" ? "chip-hazard" : "chip-ok"}>{PHASE_LABEL[phase]}</span>
      </PageHead>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {b.status === "requested" && !manage ? (
            <section className="card p-5 text-sm text-muted">ממתין לאישור של מנהל בתאגיד. (יש לך הרשאת צפייה בלבד.)</section>
          ) : b.status === "requested" ? (
            <>
              <h2 className="text-[20px] font-bold text-ink">הצעת שיבוץ</h2>
              <AssignForm id={b.id} cands={cands} need={b.workers.length} transport={b.transport === "agency"} defaults={{ pickup: "06:15" }} />
              <form action={rejectRequest} className="card flex flex-wrap items-end gap-2 p-4">
                <input type="hidden" name="id" value={b.id} />
                <div className="flex-1"><label className="label">דחיית הבקשה</label><input name="reason" className="input" placeholder="סיבה שהקבלן יראה (למשל: אין זמינות בתאריך)" /></div>
                <button className="btn-ghost text-bad">דחייה</button>
              </form>
            </>
          ) : (
            <section className="card">
              <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">הצוות</h2>
              <ul>
                {crew.map((w) => {
                  const noFit = w.arrived === 0 || w.identity_ok === "no" || w.trade_ok === "no";
                  return (
                    <li key={w.bw_id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                      <Avatar w={w} size={44} />
                      <div className="flex-1">
                        <div className="font-semibold">{displayName(w)}</div>
                        <div className="text-xs text-muted">{w.phone ?? ""}</div>
                      </div>
                      {b.status === "completed" ? (w.hours_approved ? <span className="text-xs"><Rating value={w.rating} /> · <span className="num">{w.hours_approved}</span> ש׳</span> : <span className="chip-bad">לא תואם · לא חויב</span>)
                        : noFit ? <span className="chip-bad">{w.arrived === 0 ? "לא הגיע" : "הקבלן סימן לא תואם"}</span>
                        : w.checkin_at ? <span className="chip-ok">✓ באתר</span> : <span className="chip-muted">טרם צ׳ק־אין</span>}
                      {manage && b.status === "approved" && (!w.checkin_at || noFit) ? (
                        <form action={swapWorker} className="flex w-full gap-2 sm:w-auto">
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="out" value={w.worker_id} />
                          <select name="in" className="input py-1.5 text-xs" defaultValue="">
                            <option value="" disabled>החלפה ב…</option>
                            {free.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.years} שנים</option>)}
                          </select>
                          <button className="btn-ghost btn-sm">החלפה</button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {manage && b.status === "approved" && ["approved", "locked"].includes(phase) && (
            <form action={agencyCancel} className="text-center">
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="reason" value="בוטל ע״י התאגיד" />
              <button className="text-xs text-muted underline hover:text-bad">ביטול ההזמנה (פוגע בציון האמינות)</button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card space-y-2 p-5 text-sm">
            <h3 className="text-[18px] font-bold text-ink">הקבלן</h3>
            <div>{b.company} · {b.contact_name}</div>
            <div className="flex flex-wrap gap-1">
              <span className="chip-ok">✓ רשום ברשם הקבלנים · <span className="num">{b.registry_no}</span></span>
              {b.classification && <span className="chip-muted">סיווג {b.classification}</span>}
            </div>
            <div className="text-muted">{b.address}</div>
            <div className="text-muted">לינה {b.lodging === "agency" ? "אצלכם" : "אצל הקבלן"} · הסעה {b.transport === "agency" ? "שלכם" : "של הקבלן"}</div>
            {b.notes && <p className="rounded-[3px] bg-paper p-3">{b.notes}</p>}
            {b.campaign_id && <span className="chip-info">הגיע מהצעה ששלחתם</span>}
            <a href={waLink(b.contractor_phone, `שלום ${b.contact_name}, לגבי ההזמנה ל-${ddmm(b.date)}`)} target="_blank" className="btn-ghost btn-sm w-full"><IWhatsapp className="h-4 w-4" />וואטסאפ לקבלן</a>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted">{b.status === "completed" ? "לגבייה מהקבלן (שעות שאושרו)" : "שווי ההזמנה"}</div>
            <div className="font-display text-2xl font-bold num">{ils(totals.net)}</div>
            <div className="text-xs text-muted">+ מע״מ · הקבלן משלם לכם ישירות</div>
          </div>
          <Notice>התאגיד נשאר המעסיק החוקי ומאשר כל הצבה. המערכת מוודאת שהמזמין קבלן רשום ושכל עובד מחזיק אישורים בתוקף לכל תקופת ההצבה.</Notice>
        </aside>
      </div>
    </div>
  );
}
