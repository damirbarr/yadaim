"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, insert, run, tx } from "@/lib/db";
import { DEV_PERSONA, currentUser, devBypass, endImpersonation, endSession, homeFor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ALL_CITIES, REGIONS } from "@/lib/domain";
import type { Role } from "@/lib/rbac";

export type FormState = { error?: string; ok?: string } | undefined;

export async function logout() {
  await endSession();
  redirect("/");
}

/** Dev mode only: act as one of the demo users without signing in. */
export async function setDevPersona(fd: FormData) {
  if (!devBypass()) redirect("/login");
  const id = Number(fd.get("id"));
  const u = await get<{ id: number; role: Role }>(`SELECT id, role FROM users WHERE id = ?`, id);
  if (!u) redirect("/");
  await endSession();
  (await cookies()).set(DEV_PERSONA, String(u.id), { path: "/", sameSite: "lax", httpOnly: true });
  redirect(homeFor(u.role));
}

export async function stopImpersonation() {
  const u = await currentUser();
  if (u?.impersonator_id) await audit({ id: u.impersonator_id }, "impersonate.end", u.email);
  await endImpersonation();
  redirect("/admin/users");
}

const slugify = (s: string) => "a-" + Date.now().toString(36) + "-" + s.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/^-|-$/g, "").slice(0, 20);

/** First sign-in: the user chooses whether they are a contractor or an agency and registers the organisation. */
export async function completeOnboarding(_: FormState, fd: FormData): Promise<FormState> {
  const u = await currentUser("pending");
  if (!u) redirect("/login");
  if (u.role !== "pending") redirect(homeFor(u.role));
  const kind = String(fd.get("kind"));
  const name = String(fd.get("name") ?? "").trim();
  const company = String(fd.get("company") ?? "").trim();
  const number = String(fd.get("number") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  const city = String(fd.get("city") ?? "");
  if (!name || !company || !number || !phone) return { error: "יש למלא את כל השדות" };
  if (!ALL_CITIES.includes(city)) return { error: "יש לבחור עיר" };
  try {
    await tx(async () => {
      if (kind === "agency") {
        const regions = fd.getAll("regions").map(String).filter((r) => REGIONS.some((x) => x.key === r));
        if (!regions.length) throw new Error("יש לבחור לפחות אזור פעילות אחד");
        const aid = await insert(`INSERT INTO agencies (name, slug, license_no, city, regions, phone) VALUES (?,?,?,?,?,?)`, company, slugify(company), number, city, regions.join(","), phone);
        await run(`UPDATE users SET name = ?, role = 'agency', org_role = 'owner', agency_id = ? WHERE id = ?`, name, aid, u.id);
        await audit(u, "onboarding.agency", `agency:${aid}`, company);
      } else if (kind === "contractor") {
        const cid = await insert(
          `INSERT INTO contractors (company, registry_no, contact_name, phone, city, classification) VALUES (?,?,?,?,?,?)`,
          company, number, name, phone, city, String(fd.get("classification") ?? "") || null
        );
        await run(`UPDATE users SET name = ?, role = 'contractor', org_role = 'owner', contractor_id = ? WHERE id = ?`, name, cid, u.id);
        await audit(u, "onboarding.contractor", `contractor:${cid}`, company);
      } else throw new Error("בחרו קבלן או תאגיד");
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(kind === "agency" ? "/a/workers?welcome=1" : "/c");
}
