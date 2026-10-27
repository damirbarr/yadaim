import { requireAgency } from "@/lib/auth";
import { all, get, insert, run, tx } from "@/lib/db";
import { ddmm, ils, PLATFORM, platformFee, todayISO, trade } from "@/lib/domain";
import { PageHead, Stat } from "@/components/ui";

export const metadata = { title: "חשבון ודוחות" };

export default async function Billing({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { agencyId } = await requireAgency("agency.billing.view");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : todayISO().slice(0, 7);
  const months = Array.from({ length: 4 }, (_, i) => { const d = new Date(todayISO() + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - i); return d.toISOString().slice(0, 7); });
  const rows = (await all(
    `SELECT b.id, b.date, b.days, b.trade, b.source, c.company, SUM(bw.hours_approved) AS hours, SUM(bw.hours_approved * bw.hourly_rate) AS amount, COUNT(bw.id) AS workers
     FROM bookings b JOIN contractors c ON c.id = b.contractor_id JOIN booking_workers bw ON bw.booking_id = b.id AND bw.state = 'assigned'
     WHERE b.agency_id = ? AND b.status = 'completed' AND substr(b.date, 1, 7) = ? GROUP BY b.id, c.company ORDER BY b.date DESC`
  , agencyId, month)) as { id: number; date: string; days: number; trade: string; source: string; company: string; hours: number; amount: number; workers: number }[];
  const hours = rows.reduce((a, r) => a + r.hours, 0);
  const revenue = rows.reduce((a, r) => a + r.amount, 0);
  const fee = platformFee(hours);
  const byContractor = new Map<string, number>();
  rows.forEach((r) => byContractor.set(r.company, (byContractor.get(r.company) ?? 0) + r.amount));
  return (
    <div className="space-y-5">
      <PageHead title="חשבון ודוחות" sub="הכסף של העסקה עובר ישירות מהקבלן אליכם. אנחנו גובים תעריף קבוע לכל שעת עבודה שהקבלן אישר — פעם בחודש, בהוראת קבע.">
        <a href={`/api/reports/placements?m=${month}`} className="btn-ghost">דוח הצבות לרשות האוכלוסין (אקסל)</a>
      </PageHead>
      <div className="flex gap-1.5">{months.map((m) => <a key={m} href={`?m=${m}`} className={m === month ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{m.slice(5)}.{m.slice(0, 4)}</a>)}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="הכנסות מהצבות בחודש" value={<span className="num">{ils(revenue)}</span>} hint={`${rows.length} הזמנות`} />
        <Stat label="שעות עבודה שאושרו" value={<span className="num">{Math.round(hours).toLocaleString("he-IL")}</span>} hint={`× ${ils(PLATFORM.feePerHour)} לשעת עבודה`} />
        <Stat label="לתשלום לנו החודש" value={<span className="num">{ils(fee * 1.18, 2)}</span>} hint="כולל מע״מ · יורד ב-1 לחודש" tone="hazard" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[560px]">
            <thead><tr><th>#</th><th>תאריך</th><th>קבלן</th><th>מקצוע</th><th>שעות</th><th>לגבייה מהקבלן</th></tr></thead>
            <tbody>
              {rows.slice(0, 25).map((r) => (
                <tr key={r.id}>
                  <td className="num text-muted"><a href={`/a/requests/${r.id}`} className="hover:underline">{r.id}</a></td>
                  <td className="num">{ddmm(r.date)}</td>
                  <td>{r.company}</td>
                  <td>{trade(r.trade).label} × {r.workers}</td>
                  <td className="num">{r.hours}</td>
                  <td className="num">{ils(r.amount * 1.18)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-5 text-sm text-muted">אין הזמנות שהושלמו בחודש הזה.</p>}
          {rows.length > 25 && <p className="p-3 text-center text-xs text-muted">מוצגות 25 ההזמנות האחרונות מתוך {rows.length}. הפירוט המלא בדוח ההצבות.</p>}
        </div>
        <aside className="card h-fit">
          <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">לגבייה לפי קבלן</h2>
          {[...byContractor.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-line px-5 py-2.5 text-sm last:border-0"><span>{k}</span><span className="num font-semibold">{ils(v * 1.18)}</span></div>
          ))}
        </aside>
      </div>
    </div>
  );
}
