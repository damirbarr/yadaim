import Link from "next/link";
import { requireContractor } from "@/lib/auth";
import { count, getContractor } from "@/lib/queries";
import { todayISO } from "@/lib/domain";
import { can } from "@/lib/rbac";
import { logout } from "@/app/actions/auth";
import { Logo, Notice } from "@/components/ui";
import { BottomNav, TopNav, type NavItem } from "@/components/Nav";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";
import { IList, ILogout, ISearch, IUsers } from "@/components/icons";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const { user, contractorId } = await requireContractor();
  const c = (await getContractor(contractorId))!;
  const n = await count(`SELECT COUNT(*)::int AS n FROM bookings WHERE contractor_id = ? AND status = 'approved' AND end_date >= ?`, contractorId, todayISO());
  const { t } = await getI18n();
  const items: NavItem[] = [
    ...(can(user, "contractor.book") ? [{ href: "/c", label: t("common.nav.contractor.search"), icon: <ISearch />, exact: true }] : []),
    { href: "/c/orders", label: t("common.nav.contractor.orders"), icon: <IList />, badge: n },
    { href: "/c/crews", label: t("common.nav.contractor.crews"), icon: <IUsers /> },
    ...(can(user, "contractor.team.manage") ? [{ href: "/c/team", label: t("common.nav.contractor.team"), icon: <IUsers /> }] : []),
  ];
  return (
    <div className="pb-24 md:pb-10">
      <ImpersonationBanner user={user} />
      <header className="blueprint sticky top-0 z-30 border-b-2 border-hazard">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/c"><Logo dark /></Link>
          <TopNav items={items} />
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/70 lg:inline">{user.name} · {c.company} · {t(`roles.org.${user.org_role}`)}</span>
            <LanguageSwitcher dark className="hidden sm:inline-flex" />
            <form action={logout}><button className="grid h-9 w-9 place-items-center rounded-[3px] text-white/70 hover:bg-white/10 hover:text-white" title={t("common.logout")} aria-label={t("common.logout")}><ILogout className="flip-ltr" /></button></form>
          </div>
        </div>
      </header>
      {!c.verified && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <Notice tone="warn">{t("common.contractorPending", { registry: c.registry_no })}</Notice>
        </div>
      )}
      <div className="flex justify-center px-4 pt-3 sm:hidden"><LanguageSwitcher /></div>
      <main className="mx-auto max-w-6xl px-4 pt-6">{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
