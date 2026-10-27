"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { get, run } from "@/lib/db";
import { beginImpersonation, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { OrgRole, Role } from "@/lib/rbac";
import type { FormState } from "./auth";

export async function setVerified(fd: FormData) {
  const me = await requireAdmin("admin.orgs");
  const kind = fd.get("kind") === "agency" ? "agency" : "contractor";
  const id = Number(fd.get("id"));
  const v = fd.get("v") === "1" ? 1 : 0;
  await run(`UPDATE ${kind === "agency" ? "agencies" : "contractors"} SET verified = ? WHERE id = ?`, v, id);
  await audit(me, v ? "org.verify" : "org.unverify", `${kind}:${id}`);
  revalidatePath("/admin");
}

export async function setSuspended(fd: FormData) {
  const me = await requireAdmin("admin.orgs");
  const id = Number(fd.get("id"));
  const v = fd.get("v") === "1" ? 1 : 0;
  await run(`UPDATE agencies SET suspended = ? WHERE id = ?`, v, id);
  await audit(me, v ? "org.suspend" : "org.unsuspend", `agency:${id}`);
  revalidatePath("/admin");
}

const ROLES: Role[] = ["admin", "agency", "contractor", "pending"];
const ORG_ROLES: OrgRole[] = ["owner", "manager", "viewer"];

/** Change a user's account kind, organisation and permission level. */
export async function updateUser(fd: FormData) {
  const me = await requireAdmin("admin.users");
  const id = Number(fd.get("id"));
  const role = String(fd.get("role")) as Role;
  const orgRole = String(fd.get("org_role")) as OrgRole;
  if (!ROLES.includes(role) || !ORG_ROLES.includes(orgRole)) return;
  if (id === me.id && role !== "admin") return; // don't lock yourself out
  // org select values are "a:<agencyId>" or "c:<contractorId>"
  const [kind, raw] = String(fd.get("org") ?? "").split(":");
  const agencyId = role === "agency" && kind === "a" ? Number(raw) : null;
  const contractorId = role === "contractor" && kind === "c" ? Number(raw) : null;
  if ((role === "agency" && !agencyId) || (role === "contractor" && !contractorId)) return;
  await run(`UPDATE users SET role = ?, org_role = ?, agency_id = ?, contractor_id = ? WHERE id = ?`, role, orgRole, agencyId, contractorId, id);
  const org = agencyId ?? contractorId;
  await audit(me, "user.update", `user:${id}`, `${role}:${orgRole}${org ? ` org=${org}` : ""}`);
  revalidatePath("/admin/users");
}

export async function setDisabled(fd: FormData) {
  const me = await requireAdmin("admin.users");
  const id = Number(fd.get("id"));
  if (id === me.id) return;
  const v = fd.get("v") === "1" ? 1 : 0;
  await run(`UPDATE users SET disabled = ? WHERE id = ?`, v, id);
  if (v) await run(`DELETE FROM sessions WHERE user_id = ?`, id);
  await audit(me, v ? "user.disable" : "user.enable", `user:${id}`);
  revalidatePath("/admin/users");
}

/** Pre-register someone (e.g. another admin, or the owner of a newly signed agency). Applied on first Google sign-in. */
export async function adminInvite(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin("admin.users");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = String(fd.get("role")) as Role;
  const orgRole = String(fd.get("org_role")) as OrgRole;
  const org = Number(fd.get("org")) || null;
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "אימייל לא תקין" };
  if (!["admin", "agency", "contractor"].includes(role) || !ORG_ROLES.includes(orgRole)) return { error: "תפקיד לא תקין" };
  if (role !== "admin" && !org) return { error: "בחרו ארגון" };
  const u = await get<{ id: number }>(`SELECT id FROM users WHERE email = ?`, email);
  if (u) {
    await run(`UPDATE users SET role = ?, org_role = ?, agency_id = ?, contractor_id = ? WHERE id = ?`, role, orgRole, role === "agency" ? org : null, role === "contractor" ? org : null, u.id);
  } else {
    await run(`INSERT INTO invites (email, role, org_role, agency_id, contractor_id, invited_by) VALUES (?,?,?,?,?,?)`, email, role, orgRole, role === "agency" ? org : null, role === "contractor" ? org : null, me.id);
  }
  await audit(me, "admin.invite", email, `${role}:${orgRole}`);
  revalidatePath("/admin/users");
  return { ok: u ? "המשתמש עודכן" : "ההזמנה נשמרה — תופעל בכניסה הראשונה עם גוגל" };
}

/** Support "view as": open the app exactly as this user sees it. Logged, time-limited, reversible from the banner. */
export async function impersonate(fd: FormData) {
  const me = await requireAdmin("admin.impersonate");
  const id = Number(fd.get("id"));
  const target = await get<{ id: number; email: string; role: Role }>(`SELECT id, email, role FROM users WHERE id = ? AND disabled = 0`, id);
  if (!target || target.id === me.id) return;
  await audit(me, "impersonate.start", target.email);
  await beginImpersonation(me.id, target.id);
  redirect(target.role === "agency" ? "/a" : target.role === "contractor" ? "/c" : target.role === "pending" ? "/onboarding" : "/admin");
}
