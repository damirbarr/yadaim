import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { complianceItems, displayName } from "@/lib/queries";
import { ddmm, diffDays, docType, todayISO, trade } from "@/lib/domain";
import { waLink } from "@/lib/wa";
import { RenewalPanel, type Row } from "@/components/RenewalPanel";
import { Avatar, Empty, Notice, PageHead } from "@/components/ui";

export const metadata = { title: "אישורים ותוקף" };

export default async function Compliance() {
  const { user, agencyId } = await requireAgency();
  const manage = can(user, "agency.compliance.manage");
  const today = todayISO();
  const { rows, missing } = (await complianceItems(agencyId, 60));
  const expiring: Row[] = rows.filter((r) => r.status === "verified").map((r) => ({
    id: r.id, workerId: r.worker_id, trade: r.trade, photo: r.photo, name: displayName(r), doc: docType(r.type).label, expires: r.expires,
    daysLeft: r.expires ? diffDays(today, r.expires) : null, requested: r.renewal_requested_at ? ddmm(r.renewal_requested_at.slice(0, 10)) : null, status: r.status,
    wa: waLink(r.phone, `שלום ${r.first_name}, ה${docType(r.type).short} שלך בתוקף עד ${r.expires ? ddmm(r.expires) + "." + r.expires.slice(0, 4) : ""}. נא לשלוח בתשובה צילום של המסמך המחודש.`),
  }));
  return (
    <div className="space-y-6">
      <PageHead title="אישורים ותוקף" sub="כל אשרה, ביטוח, הדרכת בטיחות ואישור גובה עם תאריך. 60 יום לפני פקיעה מתחילה התראה; עובד עם מסמך שפג לא מוצג לקבלנים — ולא יוצב בטעות." />

      <section className="space-y-2">
        <h2 className="text-[20px] font-bold text-ink">פגים או פגים ב-60 הימים הקרובים</h2>
        {expiring.length ? <RenewalPanel rows={expiring} readOnly={!manage} /> : <Empty title="הכול בתוקף">אין מסמכים שפגים בחודשיים הקרובים.</Empty>}
      </section>

      {missing.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[20px] font-bold text-ink">חסר אישור עבודה בגובה</h2>
          <Notice tone="warn">לעובדים האלה אין אישור גובה, ולכן הם לא מוצגים בחיפוש של {missing.map((w) => trade(w.trade).plural).filter((v, i, a) => a.indexOf(v) === i).join(", ")}.</Notice>
          <div className="flex flex-wrap gap-2">
            {missing.map((w) => (
              <a key={w.id} href={`/a/workers/${w.id}`} className="flex items-center gap-2 rounded-[3px] border border-line bg-white py-1 pe-3 ps-1 text-sm hover:border-ink"><Avatar w={w} size={28} />{displayName(w)} · {trade(w.trade).label}</a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
