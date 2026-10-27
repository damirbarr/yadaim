import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { complianceItems, displayName } from "@/lib/queries";
import { diffDays, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { waLink } from "@/lib/wa";
import { RenewalPanel, type Row } from "@/components/RenewalPanel";
import { Avatar, Empty, Notice, PageHead } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("agency.compliance.title") };
}

export default async function Compliance() {
  const { user, agencyId } = await requireAgency();
  const manage = can(user, "agency.compliance.manage");
  const { t, fmt, intl } = await getI18n();
  const today = todayISO();
  const { rows, missing } = (await complianceItems(agencyId, 60));
  const expiring: Row[] = rows.filter((r) => r.status === "verified").map((r) => ({
    id: r.id, workerId: r.worker_id, trade: r.trade, photo: r.photo, country: r.country, name: displayName(r), doc: fmt.doc(r.type), expires: r.expires,
    daysLeft: r.expires ? diffDays(today, r.expires) : null, requested: r.renewal_requested_at ? r.renewal_requested_at.slice(0, 10) : null, status: r.status,
    // Written in the language of the person sending it.
    wa: waLink(r.phone, t("agency.compliance.waText", { name: r.first_name, doc: fmt.doc(r.type), date: r.expires ? fmt.fullDate(r.expires) : "" })),
  }));
  return (
    <div className="space-y-6">
      <PageHead title={t("agency.compliance.title")} sub={t("safety.complianceSub")} />

      <section className="space-y-2">
        <h2 className="text-[20px] font-bold text-ink">{t("agency.compliance.expiringTitle")}</h2>
        {expiring.length ? <RenewalPanel rows={expiring} readOnly={!manage} /> : <Empty title={t("agency.compliance.allValidTitle")}>{t("agency.compliance.allValidBody")}</Empty>}
      </section>

      {missing.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[20px] font-bold text-ink">{t("agency.compliance.missingTitle")}</h2>
          <Notice tone="warn">{t("agency.compliance.missingNotice", { trades: new Intl.ListFormat(intl, { type: "conjunction" }).format([...new Set(missing.map((w) => fmt.trades(w.trade)))]) })}</Notice>
          <div className="flex flex-wrap gap-2">
            {missing.map((w) => (
              <a key={w.id} href={`/a/workers/${w.id}`} className="flex items-center gap-2 rounded-[3px] border border-line bg-white py-1 pe-3 ps-1 text-sm hover:border-ink"><Avatar w={w} size={28} />{displayName(w)} · {fmt.trade(w.trade)}</a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
