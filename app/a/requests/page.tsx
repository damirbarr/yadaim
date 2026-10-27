import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { bookingsWhere, bookingTotals } from "@/lib/queries";
import { bookingPhase, ddmm, ils, PHASE_LABEL, prettyDate, relDay, todayISO, trade } from "@/lib/domain";
import { updateTransport } from "@/app/actions/agency";
import { Avatar, Empty, Notice, PageHead } from "@/components/ui";
import { TimeField } from "@/components/DateField";

export const metadata = { title: "בקשות ושיבוץ" };

export default async function Requests({ searchParams }: { searchParams: Promise<{ approved?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const manage = can(user, "agency.requests.manage");
  const { approved } = await searchParams;
  const today = todayISO();
  const pending = (await bookingsWhere(`b.agency_id = ? AND b.status = 'requested' AND b.date >= ? ORDER BY b.date`, agencyId, today));
  const upcoming = (await bookingsWhere(`b.agency_id = ? AND b.status = 'approved' AND b.end_date >= ? ORDER BY b.date`, agencyId, today));
  const awaiting = (await bookingsWhere(`b.agency_id = ? AND b.status = 'approved' AND b.end_date < ? ORDER BY b.date`, agencyId, today));
  return (
    <div className="space-y-6">
      <PageHead title="בקשות ושיבוץ" sub="קבלן לוחץ “הזמנה” — הבקשה מגיעה לכאן מסודרת: מקצוע, יום, אתר והעובדים שבחר. מאשרים או מחליפים בלחיצה." />
      {approved && <Notice tone="ok">הזמנה #{approved} אושרה. הצוות ננעל ב-18:00 ערב לפני, והקבלן יקבל את פרטי ההסעה.</Notice>}

      <section className="space-y-2">
        <h2 className="eyebrow">ממתינות לאישור · {pending.length}</h2>
        {pending.length === 0 ? <Empty title="אין בקשות ממתינות">בקשות חדשות מקבלנים יופיעו כאן. בינתיים — <Link className="underline" href="/a/campaigns">שווקו ימים פנויים</Link>.</Empty> : pending.map((b) => {
          const t = bookingTotals(b, b.workers);
          return (
            <Link key={b.id} href={`/a/requests/${b.id}`} className="card flex flex-wrap items-center gap-4 p-4 hover:border-ink">
              <span className="chip-hazard">חדש</span>
              {/* On a phone the details take the whole first line and price + action wrap below. */}
              <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-0">
                <div className="font-semibold">{b.company} · {b.contact_name}</div>
                <div className="text-sm text-muted">{b.workers.length} {trade(b.trade).plural} · {prettyDate(b.date)}{b.days > 1 ? ` · ${b.days} ימים` : ""} · {b.address} · לינה {b.lodging === "agency" ? "אצלכם" : "אצל הקבלן"}</div>
              </div>
              <div className="flex-1 sm:flex-none sm:text-left"><div className="text-[22px] font-bold text-ink num">{ils(t.net)}</div><div className="text-xs text-muted">לפני מע״מ</div></div>
              <span className="btn-primary">לשיבוץ</span>
            </Link>
          );
        })}
      </section>

      {awaiting.length > 0 && (
        <section className="space-y-2">
          <h2 className="eyebrow">ממתינות לאישור שעות של הקבלן · {awaiting.length}</h2>
          {awaiting.map((b) => (
            <Link key={b.id} href={`/a/requests/${b.id}`} className="card flex items-center gap-3 p-4 text-sm hover:border-ink">
              <span className="chip-warn">שעות</span><span className="flex-1">{b.company} · <span className="num">{ddmm(b.date)}</span> · {b.workers.filter((w) => w.state === "assigned").length} עובדים</span>
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="eyebrow">מאושרות · לוח הצבות</h2>
        {upcoming.length === 0 ? <p className="text-sm text-muted">אין הצבות קרובות.</p> : (
          <div className="card divide-y divide-line">
            {upcoming.map((b) => {
              const phase = bookingPhase(b);
              const crew = b.workers.filter((w) => w.state === "assigned");
              return (
                <div key={b.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
                  <Link href={`/a/requests/${b.id}`} className="flex items-center gap-3">
                    <div className="w-14 text-center"><div className="font-display text-xl font-bold num">{ddmm(b.date)}</div><div className="text-[11px] text-muted">{relDay(b.date)}</div></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><b>{b.company}</b><span className={phase === "today" ? "chip-hazard" : phase === "locked" ? "chip-info" : "chip-ok"}>{PHASE_LABEL[phase]}</span>{b.days > 1 && <span className="chip-muted">{b.days} ימים</span>}</div>
                      <div className="truncate text-sm text-muted">{trade(b.trade).plural} · {b.address}</div>
                    </div>
                    <div className="hidden -space-x-2 space-x-reverse sm:flex">{crew.map((w) => <Avatar key={w.bw_id} w={w} size={30} className="ring-2 ring-white" />)}</div>
                  </Link>
                  {b.transport === "agency" && manage && (
                    <form action={updateTransport} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <TimeField name="pickup_time" defaultValue={b.pickup_time ?? ""} className="w-28 py-1.5" placeholder="שעת איסוף" />
                      <input name="driver_name" defaultValue={b.driver_name ?? ""} placeholder="נהג" className="input w-24 py-1.5" />
                      <input name="vehicle_no" defaultValue={b.vehicle_no ?? ""} placeholder="מס׳ רכב" className="input w-28 py-1.5" dir="ltr" />
                      <button className={b.pickup_time ? "btn-ghost btn-sm" : "btn-hazard btn-sm"}>{b.pickup_time ? "עדכון" : "שמירת הסעה"}</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
