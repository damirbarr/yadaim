import { run } from "./db";

type Actor = { id: number; impersonator_id?: number | null } | null | undefined;

/** Append to the admin audit trail (who did what, and whether an admin was acting on their behalf). */
export async function audit(actor: Actor, action: string, target?: string | null, details?: string | null) {
  await run(
    `INSERT INTO audit_log (actor_id, impersonator_id, action, target, details) VALUES (?,?,?,?,?)`,
    actor?.id ?? null, actor?.impersonator_id ?? null, action, target ?? null, details ?? null
  );
}
