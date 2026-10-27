// Role-based access control. Pure module (no server imports) so client components can check permissions too.
//
// Every account has a kind (`role`): admin | agency | contractor | pending (signed in, not onboarded yet)
// and, inside its organisation, a permission level (`org_role`): owner | manager | viewer.
// Pages and server actions ask for a permission, never for a role directly: `can(user, "agency.workers.edit")`.

export type Role = "admin" | "agency" | "contractor" | "pending";
export type OrgRole = "owner" | "manager" | "viewer";

// Names and descriptions shown to users live in messages/<locale>/roles.ts (`perms`, `hint`).
export const PERMISSIONS = [
  "agency.view",
  "agency.workers.edit",
  "agency.requests.manage",
  "agency.compliance.manage",
  "agency.crm.manage",
  "agency.campaigns.send",
  "agency.billing.view",
  "agency.settings.edit",
  "agency.team.manage",
  "contractor.view",
  "contractor.book",
  "contractor.site",
  "contractor.crews.edit",
  "contractor.team.manage",
  "admin.orgs",
  "admin.users",
  "admin.audit",
  "admin.impersonate",
] as const;
export type Perm = (typeof PERMISSIONS)[number];

const AGENCY_ALL = PERMISSIONS.filter((p) => p.startsWith("agency."));
const CONTRACTOR_ALL = PERMISSIONS.filter((p) => p.startsWith("contractor."));

export const MATRIX: Record<string, Perm[]> = {
  "agency:owner": AGENCY_ALL,
  "agency:manager": ["agency.view", "agency.workers.edit", "agency.requests.manage", "agency.compliance.manage", "agency.crm.manage", "agency.campaigns.send"],
  "agency:viewer": ["agency.view"],
  "contractor:owner": CONTRACTOR_ALL,
  "contractor:manager": ["contractor.view", "contractor.book", "contractor.site", "contractor.crews.edit"],
  "contractor:viewer": ["contractor.view"],
  "admin:owner": [...PERMISSIONS],
  "admin:manager": ["admin.orgs", "admin.users", "admin.audit"],
  "admin:viewer": ["admin.audit"],
};

export type Subject = { role: Role; org_role: OrgRole; disabled?: number | boolean };

export function permissionsOf(u: Subject | null | undefined): Perm[] {
  if (!u || u.disabled) return [];
  return MATRIX[`${u.role}:${u.org_role}`] ?? [];
}

export const can = (u: Subject | null | undefined, perm: Perm) => permissionsOf(u).includes(perm);
