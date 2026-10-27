import "server-only";
import { get, insert, run, tx } from "./db";
import { audit } from "./audit";
import { isPlatformAdmin } from "./auth";

// Audit details are machine words (translated on /admin/audit via admin.audit.words and roles.*), never UI text.

/**
 * Map a verified Google identity to an app user.
 *   1. Existing user → refresh profile; admin follows ADMIN_EMAILS both ways (added → admin, removed → pending).
 *   2. Pending invite for this email → join that agency/contractor with the invited role.
 *   3. Email in ADMIN_EMAILS → admin.
 *   4. Otherwise → "pending": the user picks contractor or agency in /onboarding.
 */
export async function upsertFromIdentity(id: { email: string; name: string; avatar: string | null; subject: string }) {
  const email = id.email.trim().toLowerCase();
  const isAdmin = isPlatformAdmin(email);
  return tx(async () => {
    const existing = await get<{ id: number; role: string; disabled: number }>(`SELECT id, role, disabled FROM users WHERE email = ?`, email);
    if (existing) {
      if (existing.disabled) return { id: existing.id, disabled: true };
      await run(`UPDATE users SET name = COALESCE(NULLIF(name, ''), ?), avatar_url = ?, auth_subject = ? WHERE id = ?`, id.name, id.avatar, id.subject, existing.id);
      if (isAdmin && existing.role !== "admin") await run(`UPDATE users SET role = 'admin', org_role = 'owner' WHERE id = ?`, existing.id);
      if (!isAdmin && existing.role === "admin") {
        await run(`UPDATE users SET role = 'pending' WHERE id = ?`, existing.id);
        await audit({ id: existing.id }, "admin.revoked", email, "removed_from_admins");
        existing.role = "pending";
      }
      if (existing.role === "pending") await applyInvite(existing.id, email);
      return { id: existing.id, disabled: false };
    }
    const uid = await insert(
      `INSERT INTO users (email, name, role, org_role, avatar_url, auth_subject) VALUES (?,?,?,?,?,?)`,
      email, id.name || email.split("@")[0], isAdmin ? "admin" : "pending", "owner", id.avatar, id.subject
    );
    if (!isAdmin) await applyInvite(uid, email);
    await audit({ id: uid }, "user.created", email, isAdmin ? "admin:admin_emails" : null);
    return { id: uid, disabled: false };
  });
}

async function applyInvite(userId: number, email: string) {
  const inv = await get<{ id: number; role: string; org_role: string; agency_id: number | null; contractor_id: number | null }>(
    `SELECT * FROM invites WHERE lower(email) = ? AND accepted_at IS NULL ORDER BY id DESC LIMIT 1`, email
  );
  if (!inv) return;
  await run(`UPDATE users SET role = ?, org_role = ?, agency_id = ?, contractor_id = ? WHERE id = ?`, inv.role, inv.org_role, inv.agency_id, inv.contractor_id, userId);
  await run(`UPDATE invites SET accepted_at = now_txt() WHERE id = ?`, inv.id);
  await audit({ id: userId }, "invite.accepted", email, `${inv.role}:${inv.org_role}`);
}
