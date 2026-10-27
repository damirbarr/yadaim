import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { PageHead } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("admin.audit.title") };
}

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin("admin.audit");
  const { q } = await searchParams;
  const { t, fmt, intl } = await getI18n();
  // Actions and details are stored as machine words; a word without a translation is shown as stored.
  const tr = (key: string, fallback: string, params?: Record<string, string>) => {
    const out = t(key as MessageKey, params);
    return out === key ? fallback : out;
  };
  const word = (w: string) => tr(`admin.audit.words.${w}`, tr(`roles.kind.${w}`, tr(`roles.org.${w}`, fmt.trade(w))));
  const target = (s: string | null) => (s ?? "").replace(/\b(agency|contractor|booking|worker|user|campaign|document):(\d+)/g, (m, k, id) => tr(`admin.audit.target.${k}`, m, { id }));
  // Whole lowercase words only, so file extensions and email parts stay as they are.
  const details = (s: string | null) => (s ?? "").replace(/(?<![\w.@-])[a-z_]+(?![\w.@-])/g, word).replace(/\s*:\s*/g, " · ").replace(/=/g, ": ");
  /** Stored as UTC text → Israel local time "DD.MM HH:MM". */
  const time = new Intl.DateTimeFormat(intl, { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const rows = await all<{ id: number; action: string; target: string | null; details: string | null; created_at: string; actor: string | null; imp: string | null }>(
    `SELECT l.*, u.name AS actor, i.name AS imp FROM audit_log l LEFT JOIN users u ON u.id = l.actor_id LEFT JOIN users i ON i.id = l.impersonator_id
     ${q ? "WHERE l.action ILIKE ? OR l.target ILIKE ? OR u.name ILIKE ?" : ""} ORDER BY l.id DESC LIMIT 300`,
    ...(q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [])
  );
  return (
    <div className="space-y-4">
      <PageHead title={t("admin.audit.title")} sub={t("admin.audit.sub")} />
      <form><input name="q" defaultValue={q} placeholder={t("admin.audit.search")} className="input max-w-sm" /></form>
      <div className="card overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>{t("admin.audit.colTime")}</th><th>{t("admin.audit.colUser")}</th><th>{t("admin.audit.colAction")}</th><th>{t("admin.audit.colTarget")}</th><th>{t("admin.audit.colDetails")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num whitespace-nowrap text-xs text-muted">{time.format(new Date(r.created_at.replace(" ", "T") + "Z"))}</td>
                <td>{r.actor ?? "-"}{r.imp && <div className="text-xs text-warn">{t("admin.audit.actually", { name: r.imp })}</div>}</td>
                <td className="text-sm">{tr(`roles.audit.${r.action.replace(/\./g, "_")}`, r.action)}</td>
                <td className="text-xs">{target(r.target)}</td>
                <td className="text-xs text-muted" translate="no">{details(r.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
