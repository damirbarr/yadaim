import Link from "next/link";
import { requireContractor } from "@/lib/auth";
import { count, getContractor } from "@/lib/queries";
import { todayISO } from "@/lib/domain";
import { can, ORG_ROLE_LABEL } from "@/lib/rbac";
import { logout } from "@/app/actions/auth";
import { Logo, Notice } from "@/components/ui";
import { BottomNav, TopNav, type NavItem } from "@/components/Nav";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { IList, ILogout, ISearch, IUsers } from "@/components/icons";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const { user, contractorId } = await requireContractor();
  const c = (await getContractor(contractorId))!;
  const n = await count(`SELECT COUNT(*)::int AS n FROM bookings WHERE contractor_id = ? AND status = 'approved' AND end_date >= ?`, contractorId, todayISO());
  const items: NavItem[] = [
    ...(can(user, "contractor.book") ? [{ href: "/c", label: "הזמנה חדשה", icon: <ISearch />, exact: true }] : []),
    { href: "/c/orders", label: "ההזמנות שלי", icon: <IList />, badge: n },
    { href: "/c/crews", label: "צוותים שמורים", icon: <IUsers /> },
    ...(can(user, "contractor.team.manage") ? [{ href: "/c/team", label: "צוות", icon: <IUsers /> }] : []),
  ];
  return (
    <div className="pb-24 md:pb-10">
      <ImpersonationBanner user={user} />
      <header className="blueprint sticky top-0 z-30 border-b-2 border-hazard">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/c"><Logo dark /></Link>
          <TopNav items={items} />
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/70 sm:inline">{user.name} · {c.company} · {ORG_ROLE_LABEL[user.org_role]}</span>
            <form action={logout}><button className="grid h-9 w-9 place-items-center rounded-[3px] text-white/70 hover:bg-white/10 hover:text-white" title="יציאה"><ILogout /></button></form>
          </div>
        </div>
      </header>
      {!c.verified && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <Notice tone="warn">החשבון ממתין לאימות מספר הרישום ברשם הקבלנים ({c.registry_no}). אפשר לחפש ולראות מחירים — שליחת הזמנה תיפתח אחרי האימות (בדרך כלל תוך יום עסקים).</Notice>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 pt-6">{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
