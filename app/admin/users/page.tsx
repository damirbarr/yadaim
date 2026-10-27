import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { can, ORG_ROLE_LABEL, ROLE_LABEL, type OrgRole, type Role } from "@/lib/rbac";
import { ddmm } from "@/lib/domain";
import { impersonate, setDisabled, updateUser } from "@/app/actions/admin";
import { AdminInviteForm } from "@/components/AdminInviteForm";
import { PageHead } from "@/components/ui";

export const metadata = { title: "משתמשים" };
type U = { id: number; name: string; email: string; role: Role; org_role: OrgRole; agency_id: number | null; contractor_id: number | null; disabled: number; last_login_at: string | null; org: string | null };

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const me = await requireAdmin("admin.users");
  const sp = await searchParams;
  const users = await all<U>(
    `SELECT u.*, COALESCE(a.name, c.company) AS org FROM users u LEFT JOIN agencies a ON a.id = u.agency_id LEFT JOIN contractors c ON c.id = u.contractor_id ORDER BY u.id`
  );
  const agencies = await all<{ id: number; name: string }>(`SELECT id, name FROM agencies ORDER BY name`);
  const contractors = await all<{ id: number; company: string }>(`SELECT id, company FROM contractors ORDER BY company`);
  const invites = await all<{ id: number; email: string; role: Role; org_role: OrgRole; created_at: string }>(`SELECT * FROM invites WHERE accepted_at IS NULL ORDER BY id DESC`);
  const list = users.filter((u) => (!sp.role || u.role === sp.role) && (!sp.q || `${u.name} ${u.email} ${u.org ?? ""}`.toLowerCase().includes(sp.q.toLowerCase())));
  return (
    <div className="space-y-5">
      <PageHead title="משתמשים והרשאות" sub="סוג חשבון (קבלן / תאגיד / אדמין) + רמת הרשאה בארגון (בעלים / מנהל / צפייה). אדמינים נוספים מוסיפים כאן, או ברשימת מנהלי המערכת בהגדרות השרת." />
      <AdminInviteForm agencies={agencies} contractors={contractors} />
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="חיפוש שם / אימייל / ארגון" className="input max-w-xs" />
        <select name="role" defaultValue={sp.role ?? ""} className="input w-40"><option value="">כל הסוגים</option>{(["contractor", "agency", "admin", "pending"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
        <button className="btn-ghost">סינון</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="tbl min-w-[980px]">
          <thead><tr><th>משתמש</th><th>ארגון</th><th>סוג · הרשאה · ארגון</th><th>כניסה אחרונה</th><th /></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className={u.disabled ? "opacity-50" : ""}>
                <td><div className="font-medium">{u.name}</div><div className="text-xs text-muted" dir="ltr">{u.email}</div></td>
                <td className="text-sm">{u.org ?? "—"}</td>
                <td>
                  <form action={updateUser} className="flex flex-wrap items-center gap-1">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input w-24 py-1 text-xs">{(["contractor", "agency", "admin", "pending"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                    <select name="org_role" defaultValue={u.org_role} className="input w-24 py-1 text-xs">{(["owner", "manager", "viewer"] as OrgRole[]).map((r) => <option key={r} value={r}>{ORG_ROLE_LABEL[r]}</option>)}</select>
                    <select name="org" defaultValue={u.agency_id ? `a:${u.agency_id}` : u.contractor_id ? `c:${u.contractor_id}` : ""} className="input w-40 py-1 text-xs">
                      <option value="">ללא ארגון</option>
                      <optgroup label="תאגידים">{agencies.map((a) => <option key={`a${a.id}`} value={`a:${a.id}`}>{a.name}</option>)}</optgroup>
                      <optgroup label="קבלנים">{contractors.map((c) => <option key={`c${c.id}`} value={`c:${c.id}`}>{c.company}</option>)}</optgroup>
                    </select>
                    <button className="btn-ghost btn-sm">שמירה</button>
                  </form>
                </td>
                <td className="num text-xs text-muted">{u.last_login_at ? ddmm(u.last_login_at.slice(0, 10)) : "—"}</td>
                <td>
                  <div className="flex gap-2">
                    {can(me, "admin.impersonate") && u.id !== me.id && !u.disabled && (
                      <form action={impersonate}><input type="hidden" name="id" value={u.id} /><button className="btn-ghost btn-sm">כניסה בתור</button></form>
                    )}
                    {u.id !== me.id && (
                      <form action={setDisabled}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="v" value={u.disabled ? "0" : "1"} /><button className="text-xs text-muted underline">{u.disabled ? "הפעלה" : "השבתה"}</button></form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {invites.length > 0 && (
        <section className="card">
          <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">הזמנות פתוחות</h2>
          {invites.map((i) => <div key={i.id} className="flex gap-3 border-b border-line px-5 py-2 text-sm last:border-0"><span className="flex-1" dir="ltr">{i.email}</span><span>{ROLE_LABEL[i.role]} · {ORG_ROLE_LABEL[i.org_role]}</span><span className="num text-muted">{ddmm(i.created_at.slice(0, 10))}</span></div>)}
        </section>
      )}
    </div>
  );
}
