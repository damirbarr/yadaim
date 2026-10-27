import Link from "next/link";
import { currentUser, homeFor } from "@/lib/auth";
import { PERMISSIONS, type Perm } from "@/lib/rbac";
import { Logo } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("public.forbidden.title") };
}

export default async function Forbidden({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const u = await currentUser();
  const { t } = await getI18n();
  const perm = p && (PERMISSIONS as readonly string[]).includes(p) ? t(`roles.perms.${(p as Perm).replace(/\./g, "_")}` as MessageKey) : null;
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-5 px-4 text-center">
      <Logo className="justify-self-center" />
      <div className="sheet paper-grid space-y-2 border-t-[3px] border-t-signal p-8">
        <div className="eyebrow">{t("public.forbidden.eyebrow")}</div>
        <h1 className="text-[30px] font-bold text-ink">{t("public.forbidden.heading")}</h1>
        {perm && <p className="text-sm text-muted">{t("public.forbidden.needs", { perm })}</p>}
        {u && <p className="text-sm text-muted">{t("public.forbidden.yourRole", { role: t(`roles.org.${u.org_role}`) })}</p>}
        <Link href={u ? homeFor(u.role) : "/"} className="btn-primary mt-2">{t("common.back")}</Link>
      </div>
    </main>
  );
}
