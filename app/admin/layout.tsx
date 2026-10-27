import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { can, ORG_ROLE_LABEL } from "@/lib/rbac";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/ui";
import { TopNav, type NavItem } from "@/components/Nav";
import { ILogout } from "@/components/icons";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin("admin.audit");
  const items: NavItem[] = [
    ...(can(me, "admin.orgs") ? [{ href: "/admin", label: "ארגונים", icon: null, exact: true }] : []),
    ...(can(me, "admin.users") ? [{ href: "/admin/users", label: "משתמשים והרשאות", icon: null }] : []),
    { href: "/admin/audit", label: "יומן פעולות", icon: null },
  ];
  return (
    <div className="pb-10">
      <header className="blueprint sticky top-0 z-30 border-b-2 border-hazard">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/admin"><Logo dark /></Link>
          <span className="chip-hazard">אדמין</span>
          <TopNav items={items} />
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/70 sm:inline">{me.name} · {ORG_ROLE_LABEL[me.org_role]}</span>
            <form action={logout}><button className="grid h-9 w-9 place-items-center rounded-[3px] text-white/70 hover:bg-white/10" title="יציאה"><ILogout /></button></form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {items.map((i) => <Link key={i.href} href={i.href} className="whitespace-nowrap rounded-[3px] px-3 py-1 text-xs text-white/80">{i.label}</Link>)}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6">{children}</main>
    </div>
  );
}
