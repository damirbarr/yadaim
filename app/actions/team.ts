"use server";
import { revalidatePath } from "next/cache";
import { all, get, run } from "@/lib/db";
import { requireAgency, requireContractor, type User } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { OrgRole } from "@/lib/rbac";
import type { FormState } from "./auth";
import { getI18n } from "@/lib/i18n/server";

const ORG_ROLES: OrgRole[] = ["owner", "manager", "viewer"];

async function org(kind: string): Promise<{ user: User; col: "agency_id" | "contractor_id"; id: number; role: "agency" | "contractor"; path: string }> {
  if (kind === "agency") {
    const { user, agencyId } = await requireAgency("agency.team.manage");
    return { user, col: "agency_id", id: agencyId, role: "agency", path: "/a/team" };
  }
  const { user, contractorId } = await requireContractor("contractor.team.manage");
  return { user, col: "contractor_id", id: contractorId, role: "contractor", path: "/c/team" };
}

/** Invite a colleague by email. They join this organisation with the chosen role on their first Google sign-in. */
export async function inviteMember(_: FormState, fd: FormData): Promise<FormState> {
  const o = await org(String(fd.get("kind")));
  const { t } = await getI18n();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const orgRole = String(fd.get("org_role")) as OrgRole;
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: t("team.errors.email") };
  if (!ORG_ROLES.includes(orgRole)) return { error: t("team.errors.role") };
  const existing = await get<{ id: number; role: string; agency_id: number | null; contractor_id: number | null }>(`SELECT id, role, agency_id, contractor_id FROM users WHERE email = ?`, email);
  if (existing && existing.role !== "pending") return { error: t("team.errors.otherOrg") };
  if (existing) {
    await run(`UPDATE users SET role = ?, org_role = ?, ${o.col} = ? WHERE id = ?`, o.role, orgRole, o.id, existing.id);
  } else {
    await run(`DELETE FROM invites WHERE lower(email) = ? AND ${o.col} = ? AND accepted_at IS NULL`, email, o.id);
    await run(`INSERT INTO invites (email, role, org_role, ${o.col}, invited_by) VALUES (?,?,?,?,?)`, email, o.role, orgRole, o.id, o.user.id);
  }
  await audit(o.user, "team.invite", email, orgRole);
  revalidatePath(o.path);
  // Isolate the address so it reads correctly inside right-to-left text.
  return { ok: t(existing ? "team.joined" : "team.sent", { email: `\u2068${email}\u2069` }) };
}

export async function changeMemberRole(fd: FormData) {
  const o = await org(String(fd.get("kind")));
  const uid = Number(fd.get("user"));
  const orgRole = String(fd.get("org_role")) as OrgRole;
  if (!ORG_ROLES.includes(orgRole)) return;
  if (uid === o.user.id && orgRole !== "owner") {
    const owners = await all(`SELECT id FROM users WHERE ${o.col} = ? AND org_role = 'owner' AND disabled = 0`, o.id);
    if (owners.length <= 1) return; // keep at least one owner
  }
  await run(`UPDATE users SET org_role = ? WHERE id = ? AND ${o.col} = ?`, orgRole, uid, o.id);
  await audit(o.user, "team.role", `user:${uid}`, orgRole);
  revalidatePath(o.path);
}

export async function removeMember(fd: FormData) {
  const o = await org(String(fd.get("kind")));
  const uid = Number(fd.get("user"));
  if (uid === o.user.id) return;
  await run(`UPDATE users SET role = 'pending', org_role = 'owner', ${o.col} = NULL WHERE id = ? AND ${o.col} = ?`, uid, o.id);
  await run(`DELETE FROM sessions WHERE user_id = ?`, uid);
  await audit(o.user, "team.remove", `user:${uid}`);
  revalidatePath(o.path);
}

export async function cancelInvite(fd: FormData) {
  const o = await org(String(fd.get("kind")));
  await run(`DELETE FROM invites WHERE id = ? AND ${o.col} = ? AND accepted_at IS NULL`, Number(fd.get("id")), o.id);
  revalidatePath(o.path);
}
