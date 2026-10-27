import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { agencyReliability, type Agency, type Contractor } from "@/lib/queries";
import { platformFee, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { setSuspended, setVerified } from "@/app/actions/admin";
import { PageHead, Stat } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("admin.orgs.metaTitle") };
}

export default async function Admin() {
  await requireAdmin("admin.orgs");
  const { t, fmt } = await getI18n();
  const agencies = await all<Agency & { workers: number }>(`SELECT a.*, (SELECT COUNT(*)::int FROM workers w WHERE w.agency_id = a.id AND w.active = 1) AS workers FROM agencies a ORDER BY a.verified, a.id`);
  const contractors = await all<Contractor & { bookings: number }>(`SELECT c.*, (SELECT COUNT(*)::int FROM bookings b WHERE b.contractor_id = c.id) AS bookings FROM contractors c ORDER BY c.verified, c.id`);
  const rel = new Map(await Promise.all(agencies.map(async (a) => [a.id, await agencyReliability(a.id)] as const)));
  const month = todayISO().slice(0, 7);
  const hours = (await get<{ h: number }>(`SELECT COALESCE(SUM(bw.hours_approved), 0)::float8 AS h FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id WHERE b.status = 'completed' AND substr(b.date, 1, 7) = ?`, month))!.h;
  return (
    <div className="space-y-6">
      <PageHead title={t("admin.orgs.title")} sub={t("admin.orgs.sub")} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={t("admin.orgs.statAgencies")} value={<span className="num">{agencies.filter((a) => a.verified).length}</span>} hint={t("admin.orgs.statAgenciesHint", { n: agencies.filter((a) => !a.verified).length })} />
        <Stat label={t("admin.orgs.statContractors")} value={<span className="num">{contractors.filter((c) => c.verified).length}</span>} hint={t("admin.orgs.statContractorsHint", { n: contractors.filter((c) => !c.verified).length })} />
        <Stat label={t("admin.orgs.statHours")} value={<span className="num">{fmt.num(Math.round(hours))}</span>} />
        <Stat label={t("admin.orgs.statRevenue")} value={<span className="num">{fmt.money(platformFee(hours))}</span>} hint={t("admin.orgs.beforeVat")} />
      </div>
      <section className="card overflow-x-auto">
        <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{t("admin.orgs.agencies")}</h2>
        <table className="tbl min-w-[720px]">
          <thead><tr><th>{t("admin.orgs.colName")}</th><th>{t("admin.orgs.colLicense")}</th><th>{t("admin.orgs.colWorkers")}</th><th>{t("admin.orgs.colReliability")}</th><th>{t("admin.orgs.colStatus")}</th><th /></tr></thead>
          <tbody>
            {agencies.map((a) => {
              const r = rel.get(a.id)!;
              return (
                <tr key={a.id}>
                  <td><Link href={`/o/${a.slug}`} className="font-medium hover:underline">{a.name}</Link><div className="text-xs text-muted">{fmt.city(a.city)}</div></td>
                  <td className="num">{a.license_no}</td>
                  <td className="num">{a.workers}</td>
                  <td><span className="num font-semibold">{r.score}</span> <span className="text-xs text-muted">{t(`domain.reliability.${r.tier.tone}`)}</span></td>
                  <td>{a.suspended ? <span className="chip-bad">{t("admin.orgs.suspended")}</span> : a.verified ? <span className="chip-ok">{t("admin.orgs.verified")}</span> : <span className="chip-warn">{t("admin.orgs.pending")}</span>}</td>
                  <td className="flex gap-2">
                    <form action={setVerified}><input type="hidden" name="kind" value="agency" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="v" value={a.verified ? "0" : "1"} /><button className={a.verified ? "btn-ghost btn-sm" : "btn-ok btn-sm"}>{a.verified ? t("admin.orgs.unverify") : t("admin.orgs.verify")}</button></form>
                    <form action={setSuspended}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="v" value={a.suspended ? "0" : "1"} /><button className="btn-ghost btn-sm">{a.suspended ? t("admin.orgs.unsuspend") : t("admin.orgs.suspend")}</button></form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="card overflow-x-auto">
        <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{t("admin.orgs.contractors")}</h2>
        <table className="tbl min-w-[640px]">
          <thead><tr><th>{t("admin.orgs.colCompany")}</th><th>{t("admin.orgs.colRegistry")}</th><th>{t("admin.orgs.colClass")}</th><th>{t("admin.orgs.colContact")}</th><th>{t("admin.orgs.colBookings")}</th><th>{t("admin.orgs.colStatus")}</th><th /></tr></thead>
          <tbody>
            {contractors.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.company}<div className="text-xs text-muted">{fmt.city(c.city)}</div></td>
                <td className="num">{c.registry_no}</td>
                <td>{c.classification ?? "-"}</td>
                <td>{c.contact_name} <span className="num text-xs text-muted">{c.phone}</span></td>
                <td className="num">{c.bookings}</td>
                <td>{c.verified ? <span className="chip-ok">{t("admin.orgs.verified")}</span> : <span className="chip-warn">{t("admin.orgs.pending")}</span>}</td>
                <td><form action={setVerified}><input type="hidden" name="kind" value="contractor" /><input type="hidden" name="id" value={c.id} /><input type="hidden" name="v" value={c.verified ? "0" : "1"} /><button className={c.verified ? "btn-ghost btn-sm" : "btn-ok btn-sm"}>{c.verified ? t("admin.orgs.unverify") : t("admin.orgs.verify")}</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
