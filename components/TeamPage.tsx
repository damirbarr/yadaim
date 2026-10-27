import { all } from "@/lib/db";
import { ORG_ROLE_HINT, ORG_ROLE_LABEL, PERMISSIONS, MATRIX, type OrgRole } from "@/lib/rbac";
import type { User } from "@/lib/auth";
import { cancelInvite, changeMemberRole, removeMember } from "@/app/actions/team";
import { InviteForm } from "./InviteForm";
import { AutoSubmitSelect } from "./AutoSubmitSelect";
import { PageHead } from "./ui";

/** Shared team & permissions screen for agencies and contractors. */
export async function TeamPage({ kind, orgId, me }: { kind: "agency" | "contractor"; orgId: number; me: User }) {
  const col = kind === "agency" ? "agency_id" : "contractor_id";
  const members = await all<{ id: number; name: string; email: string; org_role: OrgRole; last_login_at: string | null; avatar_url: string | null }>(
    `SELECT id, name, email, org_role, last_login_at, avatar_url FROM users WHERE ${col} = ? AND disabled = 0 ORDER BY (org_role = 'owner') DESC, id`, orgId
  );
  const invites = await all<{ id: number; email: string; org_role: OrgRole; created_at: string }>(
    `SELECT id, email, org_role, created_at FROM invites WHERE ${col} = ? AND accepted_at IS NULL ORDER BY id DESC`, orgId
  );
  const roles: OrgRole[] = ["owner", "manager", "viewer"];
  const perms = Object.entries(PERMISSIONS).filter(([k]) => k.startsWith(kind + "."));
  return (
    <div className="space-y-6">
      <PageHead title="צוות והרשאות" sub="כל אחד נכנס עם חשבון הגוגל שלו. ההרשאות נקבעות לפי התפקיד." />
      <InviteForm kind={kind} />
      {/* Fixed columns so every row lines up: avatar · name/email · role · remove. */}
      <section className="card divide-y divide-line">
        {members.map((m) => (
          <div key={m.id} className="grid grid-cols-[36px_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[36px_1fr_160px_48px]">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-paper font-semibold">{m.name.charAt(0)}</div>
            <div className="min-w-0">
              <div className="font-semibold">{m.name}{m.id === me.id && <span className="font-normal text-muted"> · זה אתם</span>}</div>
              <div className="truncate text-xs text-muted"><bdi dir="ltr">{m.email}</bdi></div>
            </div>
            <form action={changeMemberRole} className="col-start-2 sm:col-start-auto">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="user" value={m.id} />
              {m.id === me.id
                ? <span className="text-sm text-muted">{ORG_ROLE_LABEL[m.org_role]}</span>
                : <AutoSubmitSelect name="org_role" aria-label="תפקיד" defaultValue={m.org_role} className="input py-1.5 text-sm">
                    {roles.map((r) => <option key={r} value={r}>{ORG_ROLE_LABEL[r]}</option>)}
                  </AutoSubmitSelect>}
            </form>
            <div className="col-start-2 sm:col-start-auto">
              {m.id !== me.id && (
                <form action={removeMember}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="user" value={m.id} /><button className="text-xs text-muted underline hover:text-bad">הסרה</button></form>
              )}
            </div>
          </div>
        ))}
        {invites.map((i) => (
          <div key={`i${i.id}`} className="grid grid-cols-[36px_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[36px_1fr_160px_48px] bg-paper/50">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-line text-muted">@</div>
            <div className="min-w-0">
              <div className="truncate text-sm"><bdi dir="ltr">{i.email}</bdi></div>
              <div className="text-xs text-warn">הוזמנו · יצטרפו בכניסה הראשונה עם גוגל</div>
            </div>
            <div className="col-start-2 text-sm text-muted sm:col-start-auto">{ORG_ROLE_LABEL[i.org_role]}</div>
            <form action={cancelInvite} className="col-start-2 sm:col-start-auto"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={i.id} /><button className="text-xs text-muted underline hover:text-bad">ביטול</button></form>
          </div>
        ))}
      </section>
      <section className="card overflow-x-auto">
        <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">מה כל תפקיד יכול לעשות</h2>
        <table className="tbl min-w-[560px]">
          <thead><tr><th>הרשאה</th>{roles.map((r) => <th key={r} className="text-center">{ORG_ROLE_LABEL[r]}<div className="font-normal">{ORG_ROLE_HINT[kind][r]}</div></th>)}</tr></thead>
          <tbody>
            {perms.map(([k, label]) => (
              <tr key={k}><td>{label}</td>{roles.map((r) => <td key={r} className="text-center">{MATRIX[`${kind}:${r}`].includes(k as never) ? "✓" : "—"}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
