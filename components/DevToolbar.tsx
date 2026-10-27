import { all } from "@/lib/db";
import { currentUser, devBypass } from "@/lib/auth";
import type { OrgRole, Role } from "@/lib/rbac";
import { setDevPersona } from "@/app/actions/auth";
import { getI18n } from "@/lib/i18n/server";

/** Floating persona switcher, rendered only in dev mode (no sign-in needed there). */
export async function DevToolbar() {
  if (!devBypass()) return null;
  const me = await currentUser();
  const { t } = await getI18n();
  const kind = (r: Role) => t(`roles.kind.${r}`);
  const users = await all<{ id: number; name: string; role: Role; org_role: OrgRole; org: string | null }>(
    `SELECT u.id, u.name, u.role, u.org_role, COALESCE(a.name, c.company) AS org FROM users u
     LEFT JOIN agencies a ON a.id = u.agency_id LEFT JOIN contractors c ON c.id = u.contractor_id
     WHERE u.disabled = 0 ORDER BY CASE u.role WHEN 'contractor' THEN 0 WHEN 'agency' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, u.id LIMIT 40`
  );
  return (
    <details className="fixed end-2 top-16 z-[60] w-72 text-sm md:bottom-4 md:end-16 md:top-auto">
      <summary className="ms-auto flex w-fit cursor-pointer list-none items-center gap-2 rounded-[3px] border-b-2 border-hazard bg-ink px-3 py-1.5 text-xs font-bold text-white shadow-lg">
        <span className="h-2 w-2 bg-hazard" />{t("public.dev.badge", { who: me ? t("public.dev.me", { name: me.name, role: kind(me.role) }) : t("public.dev.byArea") })}
      </summary>
      <div className="mt-2 max-h-[60vh] overflow-auto rounded-[3px] border border-line bg-white p-2 shadow-2xl">
        <p className="px-2 pb-2 text-xs text-muted">{t("public.dev.help")}</p>
        {users.map((u) => (
          <form key={u.id} action={setDevPersona}>
            <input type="hidden" name="id" value={u.id} />
            <button className={`flex w-full items-center justify-between gap-2 rounded-[3px] px-2 py-1.5 text-start hover:bg-paper ${me?.id === u.id ? "bg-hazard-soft" : ""}`}>
              <span className="truncate">{u.name}<span className="text-muted"> · {u.org ?? kind(u.role)}</span></span>
              <span className="chip-muted shrink-0">{u.role === "pending" ? t("public.dev.newUser") : `${kind(u.role)} · ${t(`roles.org.${u.org_role}`)}`}</span>
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}
