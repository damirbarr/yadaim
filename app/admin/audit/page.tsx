import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { PageHead } from "@/components/ui";
import { ORG_ROLE_LABEL, ROLE_LABEL } from "@/lib/rbac";

const ACTIONS: Record<string, string> = {
  login: "כניסה למערכת", "user.created": "משתמש חדש", "invite.accepted": "הזמנה הופעלה", "onboarding.agency": "הרשמת תאגיד",
  "onboarding.contractor": "הרשמת קבלן", "org.verify": "אימות ארגון", "org.unverify": "ביטול אימות", "org.suspend": "השעיית תאגיד",
  "org.unsuspend": "ביטול השעיה", "user.update": "שינוי הרשאות משתמש", "user.disable": "השבתת משתמש", "user.enable": "הפעלת משתמש",
  "admin.invite": "הוספת משתמש ע״י אדמין", "admin.revoked": "הסרת הרשאת אדמין", "impersonate.start": "כניסה בתור משתמש", "impersonate.end": "סיום כניסה בתור",
  "team.invite": "הזמנה לצוות", "team.role": "שינוי תפקיד בצוות", "team.remove": "הסרה מהצוות", "booking.create": "הזמנת עובדים",
  "booking.approve": "אישור הזמנה", "booking.reject": "דחיית הזמנה", "worker.create": "הוספת עובד", "workers.import": "ייבוא עובדים מאקסל",
  "document.review": "בדיקת מסמך", "campaign.create": "יצירת הצעה לקבלנים", "agency.settings": "שינוי הגדרות תאגיד",
};
const KINDS: Record<string, string> = { agency: "תאגיד", contractor: "קבלן", booking: "הזמנה", worker: "עובד", user: "משתמש", campaign: "הצעה", document: "מסמך" };
const WORDS: Record<string, string> = { ...ROLE_LABEL, ...ORG_ROLE_LABEL, google: "גוגל", approve: "אושר", reject: "נדחה", workers: "עובדים", added: "נוספו", skipped: "דולגו" };
const heTarget = (t: string | null) => (t ?? "").replace(/\b(agency|contractor|booking|worker|user|campaign|document):(\d+)/g, (_, k, n) => `${KINDS[k]} #${n}`);
const heDetails = (d: string | null) => (d ?? "").replace(/[a-z_]+/g, (w) => WORDS[w as keyof typeof WORDS] ?? w).replace(/:/g, " · ");
/** Stored as UTC text → Israel local time "DD.MM HH:MM". */
const ilTime = (utc: string) => new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(utc.replace(" ", "T") + "Z"));

export const metadata = { title: "יומן פעולות" };

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin("admin.audit");
  const { q } = await searchParams;
  const rows = await all<{ id: number; action: string; target: string | null; details: string | null; created_at: string; actor: string | null; imp: string | null }>(
    `SELECT l.*, u.name AS actor, i.name AS imp FROM audit_log l LEFT JOIN users u ON u.id = l.actor_id LEFT JOIN users i ON i.id = l.impersonator_id
     ${q ? "WHERE l.action ILIKE ? OR l.target ILIKE ? OR u.name ILIKE ?" : ""} ORDER BY l.id DESC LIMIT 300`,
    ...(q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [])
  );
  return (
    <div className="space-y-4">
      <PageHead title="יומן פעולות" sub="כניסות, שינויי הרשאות, אימותים, ייבוא, אישור הזמנות וכניסות “בתור” — כולל מי ביצע בפועל." />
      <form><input name="q" defaultValue={q} placeholder="סינון לפי שם משתמש" className="input max-w-sm" /></form>
      <div className="card overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>זמן</th><th>משתמש</th><th>פעולה</th><th>יעד</th><th>פרטים</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num whitespace-nowrap text-xs text-muted">{ilTime(r.created_at)}</td>
                <td>{r.actor ?? "—"}{r.imp && <div className="text-xs text-warn">בפועל: {r.imp}</div>}</td>
                <td className="text-sm">{ACTIONS[r.action] ?? r.action}</td>
                <td className="text-xs">{heTarget(r.target)}</td>
                <td className="text-xs text-muted">{heDetails(r.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
