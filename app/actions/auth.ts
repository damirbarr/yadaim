"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, insert, run, tx } from "@/lib/db";
import { DEV_PERSONA, currentUser, devBypass, endImpersonation, endSession, googleEnabled, homeFor } from "@/lib/auth";
import { finishLogin } from "@/lib/login";
import { supabaseAuth } from "@/lib/supabase";
import { appUrl } from "@/lib/wa";
import { audit } from "@/lib/audit";
import { ALL_CITIES, REGIONS } from "@/lib/domain";
import type { Role } from "@/lib/rbac";
import { getI18n } from "@/lib/i18n/server";

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
  const { t } = await getI18n();
  if (!name || !company || !number || !phone) return { error: t("public.onboarding.errors.fillAll") };
  if (!ALL_CITIES.includes(city)) return { error: t("public.onboarding.errors.city") };
  try {
    await tx(async () => {
      if (kind === "agency") {
        const regions = fd.getAll("regions").map(String).filter((r) => REGIONS.some((x) => x.key === r));
        if (!regions.length) throw new Error(t("public.onboarding.errors.regions"));
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
      } else throw new Error(t("public.onboarding.errors.kind"));
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(kind === "agency" ? "/a/workers?welcome=1" : "/c");
}

// ── Email + password (Supabase Auth). The address must be confirmed by email before the first sign-in, which is
// what makes ADMIN_EMAILS and invites safe to match by email. Errors are shown in the form; success redirects.
const PASSWORD_MIN = 8;

export async function passwordSignIn(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getI18n();
  if (!googleEnabled()) return { error: t("public.login.noGoogle") };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: t("public.login.pw.bad") };
  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: /confirm/i.test(error?.message ?? "") ? t("public.login.pw.unconfirmed") : t("public.login.pw.bad") };
  await sb.auth.signOut({ scope: "local" }).catch(() => {});
  return finishLogin(data.user, "password");
}

export async function passwordSignUp(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getI18n();
  if (!googleEnabled()) return { error: t("public.login.noGoogle") };
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t("public.login.pw.fill") };
  if (password.length < PASSWORD_MIN) return { error: t("public.login.pw.short", { n: PASSWORD_MIN }) };
  const intent = String(fd.get("intent") ?? "");
  if (intent === "contractor" || intent === "agency") (await cookies()).set("yd_intent", intent, { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true });
  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: appUrl("/auth/confirm"), data: { full_name: name } } });
  if (error) return { error: /rate|too many/i.test(error.message) ? t("public.login.pw.rate") : /password/i.test(error.message) ? t("public.login.pw.short", { n: PASSWORD_MIN }) : t("public.login.pw.failed") };
  // With email confirmation off in Supabase a session comes back at once; normally the confirmation email finishes it.
  if (data.session && data.user) {
    await sb.auth.signOut({ scope: "local" }).catch(() => {});
    return finishLogin(data.user, "password");
  }
  // The same answer whether or not the address already had an account, so the form doesn't reveal who is registered.
  return { ok: t("public.login.pw.checkEmail", { email }) };
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getI18n();
  if (!googleEnabled()) return { error: t("public.login.noGoogle") };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t("public.login.pw.fill") };
  const sb = await supabaseAuth();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl("/auth/confirm?next=reset") });
  if (error && /rate|too many/i.test(error.message)) return { error: t("public.login.pw.rate") };
  return { ok: t("public.login.pw.resetSent", { email }) };
}

/** Second step of a reset: /auth/confirm left a short Supabase session; set the password and sign in. */
export async function setNewPassword(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const password = String(fd.get("password") ?? "");
  if (password.length < PASSWORD_MIN) return { error: t("public.login.pw.short", { n: PASSWORD_MIN }) };
  const sb = await supabaseAuth();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: t("public.login.errors.reset_expired") };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: /same|different/i.test(error.message) ? t("public.login.pw.samePassword") : t("public.login.pw.failed") };
  await sb.auth.signOut({ scope: "local" }).catch(() => {});
  return finishLogin(user, "password");
}
