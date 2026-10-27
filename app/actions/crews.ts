"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, get, insert, run, tx } from "@/lib/db";
import { requireAgency } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getI18n } from "@/lib/i18n/server";
import type { FormState } from "./auth";

const marks = (n: number) => Array(n).fill("?").join(",");

/** Create or edit a crew: name, members (at least two, active, not in another crew) and an optional leader among them. */
export async function saveAgencyCrew(_: FormState, fd: FormData): Promise<FormState> {
  const { user, agencyId } = await requireAgency("agency.workers.edit");
  const { t } = await getI18n();
  const id = Number(fd.get("id")) || 0;
  if (id && !(await get(`SELECT id FROM agency_crews WHERE id = ? AND agency_id = ?`, id, agencyId))) return { error: t("crews.errors.notFound") };
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (!name) return { error: t("crews.errors.name") };
  const members = [...new Set(fd.getAll("w").map(Number).filter(Boolean))];
  if (members.length < 2) return { error: t("crews.errors.members") };
  const leader = Number(fd.get("leader")) || null;
  if (leader && !members.includes(leader)) return { error: t("crews.errors.leader") };

  // Members come from the form, so each one is re-checked against the caller's agency.
  const ok = await all<{ id: number }>(
    `SELECT id FROM workers WHERE agency_id = ? AND active = 1 AND (crew_id IS NULL OR crew_id = ?) AND id IN (${marks(members.length)})`,
    agencyId, id, ...members
  );
  if (ok.length !== members.length) return { error: t("crews.errors.taken") };

  const crewId = await tx(async () => {
    const cid = id
      ? (await run(`UPDATE agency_crews SET name = ?, leader_worker_id = ? WHERE id = ? AND agency_id = ?`, name, leader, id, agencyId), id)
      : await insert(`INSERT INTO agency_crews (agency_id, name, leader_worker_id) VALUES (?,?,?)`, agencyId, name, leader);
    await run(`UPDATE workers SET crew_id = NULL WHERE crew_id = ? AND agency_id = ? AND id NOT IN (${marks(members.length)})`, cid, agencyId, ...members);
    await run(`UPDATE workers SET crew_id = ? WHERE agency_id = ? AND id IN (${marks(members.length)})`, cid, agencyId, ...members);
    return cid;
  });
  if (!id) await audit(user, "crew.create", `crew:${crewId}`, `${members.length} workers`);
  revalidatePath("/a", "layout");
  redirect(`/a/crews?saved=${crewId}`);
}

/** Dissolve a crew. The workers stay; they're just no longer grouped. */
export async function dissolveCrew(fd: FormData) {
  const { user, agencyId } = await requireAgency("agency.workers.edit");
  const id = Number(fd.get("id"));
  const c = await get<{ id: number; name: string }>(`SELECT id, name FROM agency_crews WHERE id = ? AND agency_id = ?`, id, agencyId);
  if (!c) throw new Error("not found");
  await tx(async () => {
    await run(`UPDATE workers SET crew_id = NULL WHERE crew_id = ? AND agency_id = ?`, c.id, agencyId);
    await run(`DELETE FROM agency_crews WHERE id = ? AND agency_id = ?`, c.id, agencyId);
  });
  await audit(user, "crew.delete", `crew:${c.id}`, c.name);
  revalidatePath("/a", "layout");
  redirect("/a/crews?dissolved=1");
}
