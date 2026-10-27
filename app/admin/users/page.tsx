import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { can, type OrgRole, type Role } from "@/lib/rbac";
import { getI18n } from "@/lib/i18n/server";
import { impersonate, setDisabled, updateUser } from "@/app/actions/admin";
import { AdminInviteForm } from "@/components/AdminInviteForm";
import { PageHead } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("admin.users.title") };
}
type U = { id: number; name: string; email: string; role: Role; org_role: OrgRole; agency_id: number | null; contractor_id: number | null; disabled: number; last_login_at: string | null; org: string | null };

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const me = await requireAdmin("admin.users");
  const sp = await searchParams;
  const { t, fmt } = await getI18n();
  const users = await all<U>(
    `SELECT u.*, COALESCE(a.name, c.company) AS org FROM users u LEFT JOIN agencies a ON a.id = u.agency_id LEFT JOIN contractors c ON c.id = u.contractor_id ORDER BY u.id`
  );
  const agencies = await all<{ id: number; name: string }>(`SELECT id, name FROM agencies ORDER BY name`);
  const contractors = await all<{ id: number; company: string }>(`SELECT id, company FROM contractors ORDER BY company`);
  const invites = await all<{ id: number; email: string; role: Role; org_role: OrgRole; created_at: string }>(`SELECT * FROM invites WHERE accepted_at IS NULL ORDER BY id DESC`);
  const list = users.filter((u) => (!sp.role || u.role === sp.role) && (!sp.q || `${u.name} ${u.email} ${u.org ?? ""}`.toLowerCase().includes(sp.q.toLowerCase())));
  return (
    <div className="space-y-5">
      <PageHead title={t("admin.users.title")} sub={t("admin.users.sub")} />
      <AdminInviteForm agencies={agencies} contractors={contractors} />
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder={t("admin.users.search")} className="input max-w-xs" />
        <select name="role" defaultValue={sp.role ?? ""} className="input w-40"><option value="">{t("admin.users.allKinds")}</option>{(["contractor", "agency", "admin", "pending"] as Role[]).map((r) => <option key={r} value={r}>{t(`roles.kind.${r}`)}</option>)}</select>
        <button className="btn-ghost">{t("admin.users.filter")}</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="tbl min-w-[980px]">
          <thead><tr><th>{t("admin.users.colUser")}</th><th>{t("admin.users.colOrg")}</th><th>{t("admin.users.colAccess")}</th><th>{t("admin.users.colLastLogin")}</th><th /></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className={u.disabled ? "opacity-50" : ""}>
                <td><div className="font-medium">{u.name}</div><div className="text-xs text-muted"><bdi dir="ltr">{u.email}</bdi></div></td>
                <td className="text-sm">{u.org ?? "-"}</td>
                <td>
                  {u.role === "admin" ? <span className="text-xs text-muted">{t("admin.users.adminFixed")}</span> : (
                  <form action={updateUser} className="flex flex-wrap items-center gap-1">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input w-24 py-1 text-xs">{(["contractor", "agency", "pending"] as Role[]).map((r) => <option key={r} value={r}>{t(`roles.kind.${r}`)}</option>)}</select>
                    <select name="org_role" defaultValue={u.org_role} className="input w-24 py-1 text-xs">{(["owner", "manager", "viewer"] as OrgRole[]).map((r) => <option key={r} value={r}>{t(`roles.org.${r}`)}</option>)}</select>
                    <select name="org" defaultValue={u.agency_id ? `a:${u.agency_id}` : u.contractor_id ? `c:${u.contractor_id}` : ""} className="input w-40 py-1 text-xs">
                      <option value="">{t("admin.users.noOrg")}</option>
                      <optgroup label={t("admin.orgs.agencies")}>{agencies.map((a) => <option key={`a${a.id}`} value={`a:${a.id}`}>{a.name}</option>)}</optgroup>
                      <optgroup label={t("admin.orgs.contractors")}>{contractors.map((c) => <option key={`c${c.id}`} value={`c:${c.id}`}>{c.company}</option>)}</optgroup>
                    </select>
                    <button className="btn-ghost btn-sm">{t("admin.users.save")}</button>
                  </form>
                  )}
                </td>
                <td className="num text-xs text-muted">{u.last_login_at ? fmt.date(u.last_login_at.slice(0, 10)) : "-"}</td>
                <td>
                  <div className="flex gap-2">
                    {can(me, "admin.impersonate") && u.role !== "admin" && !u.disabled && (
                      <form action={impersonate}><input type="hidden" name="id" value={u.id} /><button className="btn-ghost btn-sm">{t("admin.users.impersonate")}</button></form>
                    )}
                    {u.role !== "admin" && (
                      <form action={setDisabled}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="v" value={u.disabled ? "0" : "1"} /><button className="text-xs text-muted underline">{u.disabled ? t("admin.users.enable") : t("admin.users.disable")}</button></form>
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
          <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{t("admin.users.invites")}</h2>
          {invites.map((i) => <div key={i.id} className="flex gap-3 border-b border-line px-5 py-2 text-sm last:border-0"><span className="flex-1"><bdi dir="ltr">{i.email}</bdi></span><span>{t(`roles.kind.${i.role}`)} · {t(`roles.org.${i.org_role}`)}</span><span className="num text-muted">{fmt.date(i.created_at.slice(0, 10))}</span></div>)}
        </section>
      )}
    </div>
  );
}
