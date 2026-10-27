// Role-based access control. Pure module (no server imports) so client components can use labels too.
//
// Every account has a kind (`role`): admin | agency | contractor | pending (signed in, not onboarded yet)
// and, inside its organisation, a permission level (`org_role`): owner | manager | viewer.
// Pages and server actions ask for a permission, never for a role directly: `can(user, "agency.workers.edit")`.

export type Role = "admin" | "agency" | "contractor" | "pending";
export type OrgRole = "owner" | "manager" | "viewer";

export const PERMISSIONS = {
  "agency.view": "צפייה בנתוני התאגיד",
  "agency.workers.edit": "הוספה ועריכה של עובדים ומסמכים, ייבוא אקסל",
  "agency.requests.manage": "אישור, דחייה ושיבוץ של בקשות",
  "agency.compliance.manage": "אישור מסמכים ושליחת בקשות חידוש",
  "agency.crm.manage": "ניהול מאגר הקבלנים",
  "agency.campaigns.send": "יצירה ושליחה של הצעות",
  "agency.billing.view": "צפייה בחשבון ובדוחות",
  "agency.settings.edit": "שינוי הגדרות ותמחור",
  "agency.team.manage": "הזמנה וניהול של משתמשים בתאגיד",
  "contractor.view": "צפייה בהזמנות",
  "contractor.book": "חיפוש ושליחת הזמנות, ביטול",
  "contractor.site": "צ׳ק־אין באתר ואישור שעות",
  "contractor.crews.edit": "ניהול צוותים שמורים",
  "contractor.team.manage": "הזמנה וניהול של משתמשים בחברה",
  "admin.orgs": "אימות והשעיה של תאגידים וקבלנים",
  "admin.users": "ניהול משתמשים ותפקידים",
  "admin.audit": "צפייה ביומן הפעולות",
  "admin.impersonate": "כניסה בתור משתמש (תמיכה)",
} as const;
export type Perm = keyof typeof PERMISSIONS;

const AGENCY_ALL = Object.keys(PERMISSIONS).filter((p) => p.startsWith("agency.")) as Perm[];
const CONTRACTOR_ALL = Object.keys(PERMISSIONS).filter((p) => p.startsWith("contractor.")) as Perm[];

export const MATRIX: Record<string, Perm[]> = {
  "agency:owner": AGENCY_ALL,
  "agency:manager": ["agency.view", "agency.workers.edit", "agency.requests.manage", "agency.compliance.manage", "agency.crm.manage", "agency.campaigns.send"],
  "agency:viewer": ["agency.view"],
  "contractor:owner": CONTRACTOR_ALL,
  "contractor:manager": ["contractor.view", "contractor.book", "contractor.site", "contractor.crews.edit"],
  "contractor:viewer": ["contractor.view"],
  "admin:owner": Object.keys(PERMISSIONS) as Perm[],
  "admin:manager": ["admin.orgs", "admin.users", "admin.audit"],
  "admin:viewer": ["admin.audit"],
};

export type Subject = { role: Role; org_role: OrgRole; disabled?: number | boolean };

export function permissionsOf(u: Subject | null | undefined): Perm[] {
  if (!u || u.disabled) return [];
  return MATRIX[`${u.role}:${u.org_role}`] ?? [];
}

export const can = (u: Subject | null | undefined, perm: Perm) => permissionsOf(u).includes(perm);

export const ROLE_LABEL: Record<Role, string> = { admin: "אדמין", agency: "תאגיד", contractor: "קבלן", pending: "ממתין לפרטים" };
export const ORG_ROLE_LABEL: Record<OrgRole, string> = { owner: "בעלים", manager: "מנהל", viewer: "צפייה בלבד" };
export const ORG_ROLE_HINT: Record<string, Record<OrgRole, string>> = {
  agency: { owner: "הכול, כולל חשבון, הגדרות וצוות", manager: "עובדים, בקשות, אישורים, מאגר ושיווק", viewer: "רק צפייה" },
  contractor: { owner: "הכול, כולל ניהול צוות", manager: "הזמנות, צ׳ק־אין באתר וצוותים שמורים", viewer: "רק צפייה בהזמנות" },
  admin: { owner: "כל יכולות האדמין", manager: "אימות ארגונים ומשתמשים", viewer: "יומן פעולות" },
};
