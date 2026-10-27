import { requireAgency } from "@/lib/auth";
import { all } from "@/lib/db";
import { PLATFORM, platformFee, todayISO, VAT } from "@/lib/domain";
import { PageHead, Stat } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("market.billing.title") };
}

export default async function Billing({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { agencyId } = await requireAgency("agency.billing.view");
  const { t, fmt } = await getI18n();
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
  const withVat = (n: number) => n * (1 + VAT);
  const byContractor = new Map<string, number>();
  rows.forEach((r) => byContractor.set(r.company, (byContractor.get(r.company) ?? 0) + r.amount));
  return (
    <div className="space-y-5">
      <PageHead title={t("market.billing.title")} sub={t("market.billing.sub")}>
        <a href={`/api/reports/placements?m=${month}`} className="btn-ghost">{t("market.billing.report")}</a>
      </PageHead>
      <div className="flex gap-1.5">{months.map((m) => <a key={m} href={`?m=${m}`} className={`num ${m === month ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}`}>{fmt.month(m + "-01")}</a>)}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("market.billing.revenue")} value={<span className="num">{fmt.money(revenue)}</span>} hint={t("market.billing.orders", { n: rows.length })} />
        <Stat label={t("market.billing.hours")} value={<span className="num">{fmt.num(Math.round(hours))}</span>} hint={t("market.billing.perHour", { fee: fmt.money(PLATFORM.feePerHour) })} />
        <Stat label={t("market.billing.due")} value={<span className="num">{fmt.money(withVat(fee), 2)}</span>} hint={t("market.billing.dueHint")} tone="hazard" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[560px]">
            <thead><tr><th>#</th><th>{t("market.billing.cols.date")}</th><th>{t("market.billing.cols.contractor")}</th><th>{t("market.billing.cols.trade")}</th><th>{t("market.billing.cols.hours")}</th><th>{t("market.billing.cols.collect")}</th></tr></thead>
            <tbody>
              {rows.slice(0, 25).map((r) => (
                <tr key={r.id}>
                  <td className="num text-muted"><a href={`/a/requests/${r.id}`} className="hover:underline">{r.id}</a></td>
                  <td className="num">{fmt.date(r.date)}</td>
                  <td>{r.company}</td>
                  <td>{t("market.billing.tradeTimes", { trade: fmt.trade(r.trade), n: r.workers })}</td>
                  <td className="num">{fmt.num(r.hours)}</td>
                  <td className="num">{fmt.money(withVat(r.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-5 text-sm text-muted">{t("market.billing.empty")}</p>}
          {rows.length > 25 && <p className="p-3 text-center text-xs text-muted">{t("market.billing.truncated", { n: rows.length })}</p>}
        </div>
        <aside className="card h-fit">
          <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{t("market.billing.byContractor")}</h2>
          {[...byContractor.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-line px-5 py-2.5 text-sm last:border-0"><span>{k}</span><span className="num font-semibold">{fmt.money(withVat(v))}</span></div>
          ))}
        </aside>
      </div>
    </div>
  );
}
