import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, run } from "./db";
import { randomToken } from "./tokens";
import { can, type OrgRole, type Perm, type Role } from "./rbac";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  org_role: OrgRole;
  agency_id: number | null;
  contractor_id: number | null;
  avatar_url: string | null;
  disabled: number;
  /** Set when an admin is acting as this user (support / "view as"). */
  impersonator_id: number | null;
  impersonator_name: string | null;
  /** True when no one signed in and dev mode supplied a demo persona. */
  dev: boolean;
};

const SESSION = "yd_session";
const ADMIN_RETURN = "yd_admin_return";
export const DEV_PERSONA = "yd_dev_as";

/** Dev mode: no sign-in required. Off in production unless AUTH_DEV_BYPASS=1 is set explicitly (e.g. a demo deployment). */
export const devBypass = () =>
  process.env.AUTH_DEV_BYPASS ? process.env.AUTH_DEV_BYPASS === "1" : process.env.NODE_ENV !== "production";

export const googleEnabled = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const USER_COLS = `u.id, u.email, u.name, u.role, u.org_role, u.agency_id, u.contractor_id, u.avatar_url, u.disabled`;

async function sessionUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION)?.value;
  if (!token) return null;
  const row = await get<User>(
    `SELECT ${USER_COLS}, s.impersonator_id, i.name AS impersonator_name FROM sessions s
     JOIN users u ON u.id = s.user_id LEFT JOIN users i ON i.id = s.impersonator_id
     WHERE s.token = ? AND s.expires_at > now_txt() AND u.disabled = 0`,
    token
  );
  return row ? { ...row, dev: false } : null;
}

async function userById(id: number) {
  const u = await get<User>(`SELECT ${USER_COLS}, NULL::int AS impersonator_id, NULL::text AS impersonator_name FROM users u WHERE u.id = ? AND u.disabled = 0`, id);
  return u ? { ...u, dev: true } : null;
}

/**
 * Dev persona: the demo user picked in the dev toolbar. When a page belongs to another area
 * (e.g. the persona is a contractor and the URL is /a), the first demo owner of that area is used,
 * so every screen opens without signing in.
 */
async function devUser(area?: Role): Promise<User | null> {
  const picked = Number((await cookies()).get(DEV_PERSONA)?.value) || 0;
  const u = picked ? await userById(picked) : null;
  if (u && (!area || u.role === area || u.role === "pending")) return u;
  if (!area) return u;
  const fallback = await get<{ id: number }>(
    `SELECT id FROM users WHERE role = ? AND disabled = 0 ORDER BY (org_role = 'owner') DESC, id LIMIT 1`,
    area
  );
  return fallback ? userById(fallback.id) : null;
}

export async function currentUser(area?: Role): Promise<User | null> {
  return (await sessionUser()) ?? (devBypass() ? devUser(area) : null);
}

export async function startSession(userId: number, impersonatorId: number | null = null) {
  const token = randomToken();
  await run(`INSERT INTO sessions (token, user_id, impersonator_id, expires_at) VALUES (?, ?, ?, now_txt(interval '30 days'))`, token, userId, impersonatorId);
  await run(`UPDATE users SET last_login_at = now_txt() WHERE id = ?`, userId);
  (await cookies()).set(SESSION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: impersonatorId ? 60 * 60 * 2 : 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION)?.value;
  if (token) await run(`DELETE FROM sessions WHERE token = ?`, token);
  jar.delete(SESSION);
  jar.delete(DEV_PERSONA);
}

/** Admin "view as": keep the admin's session token aside and open a short session as the target user. */
export async function beginImpersonation(adminId: number, targetId: number) {
  const jar = await cookies();
  const own = jar.get(SESSION)?.value;
  if (own) jar.set(ADMIN_RETURN, own, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 2 });
  await startSession(targetId, adminId);
}

export async function endImpersonation() {
  const jar = await cookies();
  const token = jar.get(SESSION)?.value;
  if (token) await run(`DELETE FROM sessions WHERE token = ? AND impersonator_id IS NOT NULL`, token);
  const back = jar.get(ADMIN_RETURN)?.value;
  jar.delete(ADMIN_RETURN);
  if (back) jar.set(SESSION, back, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  else jar.delete(SESSION);
}

export const homeFor = (role: Role) => (role === "agency" ? "/a" : role === "contractor" ? "/c" : role === "admin" ? "/admin" : "/onboarding");

/** Gate for a whole area + an optional permission. Redirects instead of throwing so it works in pages and actions. */
export async function requireUser<R extends Role>(area: R, perm?: Perm): Promise<User & { role: R }> {
  const u = await currentUser(area);
  if (!u) redirect("/login");
  if (u.role === "pending" && area !== "pending") redirect("/onboarding");
  if (u.role !== area) redirect(homeFor(u.role));
  if (perm && !can(u, perm)) redirect(`/forbidden?p=${perm}`);
  return u as User & { role: R };
}

export async function requireAgency(perm: Perm = "agency.view") {
  const user = await requireUser("agency", perm);
  return { user, agencyId: user.agency_id! };
}

export async function requireContractor(perm: Perm = "contractor.view") {
  const user = await requireUser("contractor", perm);
  return { user, contractorId: user.contractor_id! };
}

export async function requireAdmin(perm: Perm = "admin.orgs") {
  return requireUser("admin", perm);
}
