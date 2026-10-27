import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { agencyReliability, type Agency, type Contractor } from "@/lib/queries";
import { ils, platformFee, todayISO } from "@/lib/domain";
import { setSuspended, setVerified } from "@/app/actions/admin";
import { PageHead, Stat } from "@/components/ui";

export const metadata = { title: "ניהול" };

export default async function Admin() {
  await requireAdmin("admin.orgs");
  const agencies = await all<Agency & { workers: number }>(`SELECT a.*, (SELECT COUNT(*)::int FROM workers w WHERE w.agency_id = a.id AND w.active = 1) AS workers FROM agencies a ORDER BY a.verified, a.id`);
  const contractors = await all<Contractor & { bookings: number }>(`SELECT c.*, (SELECT COUNT(*)::int FROM bookings b WHERE b.contractor_id = c.id) AS bookings FROM contractors c ORDER BY c.verified, c.id`);
  const rel = new Map(await Promise.all(agencies.map(async (a) => [a.id, await agencyReliability(a.id)] as const)));
  const month = todayISO().slice(0, 7);
  const hours = (await get<{ h: number }>(`SELECT COALESCE(SUM(bw.hours_approved), 0)::float8 AS h FROM booking_workers bw JOIN bookings b ON b.id = bw.booking_id WHERE b.status = 'completed' AND substr(b.date, 1, 7) = ?`, month))!.h;
  return (
    <div className="space-y-6">
      <PageHead title="ארגונים" sub="אימות היתרי תאגידים מול רשימת רשות האוכלוסין, ומספרי רישום מול פנקס הקבלנים. תאגיד לא מאומת לא מופיע בחיפוש; קבלן לא מאומת לא יכול לשלוח הזמנה." />
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="תאגידים פעילים" value={agencies.filter((a) => a.verified).length} hint={`${agencies.filter((a) => !a.verified).length} ממתינים לאימות`} />
        <Stat label="קבלנים מאומתים" value={contractors.filter((c) => c.verified).length} hint={`${contractors.filter((c) => !c.verified).length} ממתינים`} />
        <Stat label="שעות עבודה שאושרו החודש" value={<span className="num">{Math.round(hours).toLocaleString("he-IL")}</span>} />
        <Stat label="הכנסות המערכת החודש" value={<span className="num">{ils(platformFee(hours))}</span>} hint="לפני מע״מ" />
      </div>
      <section className="card overflow-x-auto">
        <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">תאגידים</h2>
        <table className="tbl min-w-[720px]">
          <thead><tr><th>שם</th><th>היתר</th><th>עובדים</th><th>אמינות</th><th>סטטוס</th><th /></tr></thead>
          <tbody>
            {agencies.map((a) => {
              const r = rel.get(a.id)!;
              return (
                <tr key={a.id}>
                  <td><Link href={`/o/${a.slug}`} className="font-medium hover:underline">{a.name}</Link><div className="text-xs text-muted">{a.city}</div></td>
                  <td className="num">{a.license_no}</td>
                  <td className="num">{a.workers}</td>
                  <td><span className="num font-semibold">{r.score}</span> <span className="text-xs text-muted">{r.tier.label}</span></td>
                  <td>{a.suspended ? <span className="chip-bad">מושעה</span> : a.verified ? <span className="chip-ok">מאומת</span> : <span className="chip-warn">ממתין</span>}</td>
                  <td className="flex gap-2">
                    <form action={setVerified}><input type="hidden" name="kind" value="agency" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="v" value={a.verified ? "0" : "1"} /><button className={a.verified ? "btn-ghost btn-sm" : "btn-ok btn-sm"}>{a.verified ? "ביטול אימות" : "אימות"}</button></form>
                    <form action={setSuspended}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="v" value={a.suspended ? "0" : "1"} /><button className="btn-ghost btn-sm">{a.suspended ? "החזרה" : "השעיה"}</button></form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="card overflow-x-auto">
        <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">קבלנים</h2>
        <table className="tbl min-w-[640px]">
          <thead><tr><th>חברה</th><th>רשם הקבלנים</th><th>סיווג</th><th>איש קשר</th><th>הזמנות</th><th>סטטוס</th><th /></tr></thead>
          <tbody>
            {contractors.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.company}<div className="text-xs text-muted">{c.city}</div></td>
                <td className="num">{c.registry_no}</td>
                <td>{c.classification ?? "—"}</td>
                <td>{c.contact_name} <span className="num text-xs text-muted">{c.phone}</span></td>
                <td className="num">{c.bookings}</td>
                <td>{c.verified ? <span className="chip-ok">מאומת</span> : <span className="chip-warn">ממתין</span>}</td>
                <td><form action={setVerified}><input type="hidden" name="kind" value="contractor" /><input type="hidden" name="id" value={c.id} /><input type="hidden" name="v" value={c.verified ? "0" : "1"} /><button className={c.verified ? "btn-ghost btn-sm" : "btn-ok btn-sm"}>{c.verified ? "ביטול אימות" : "אימות"}</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
