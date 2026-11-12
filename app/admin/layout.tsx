import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getI18n } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/ui";
import { TopNav, type NavItem } from "@/components/Nav";
import { ILogout } from "@/components/icons";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin("admin.audit");
  const { t } = await getI18n();
  const items: NavItem[] = [
    ...(can(me, "admin.orgs") ? [{ href: "/admin", label: t("common.nav.admin.orgs"), icon: null, exact: true }] : []),
    ...(can(me, "admin.users") ? [{ href: "/admin/users", label: t("common.nav.admin.users"), icon: null }] : []),
    { href: "/admin/audit", label: t("common.nav.admin.audit"), icon: null },
  ];
  return (
    <div className="pb-10">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/admin"><Logo /></Link>
          <span className="chip-info">{t("common.nav.admin.badge")}</span>
          <TopNav items={items} />
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted lg:inline">{me.name}</span>
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <form action={logout}><button className="grid h-11 w-11 place-items-center rounded-[10px] text-muted hover:bg-cool hover:text-ink" title={t("common.logout")} aria-label={t("common.logout")}><ILogout className="flip-ltr" /></button></form>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 pb-2 md:hidden">
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {items.map((i) => <Link key={i.href} href={i.href} className="whitespace-nowrap rounded-[10px] px-3 py-2 text-[13px] font-semibold text-ink hover:bg-cool">{i.label}</Link>)}
          </nav>
          <LanguageSwitcher className="sm:hidden" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6">{children}</main>
    </div>
  );
}
