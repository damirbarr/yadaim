import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { count, getAgency } from "@/lib/queries";
import { addDays, todayISO } from "@/lib/domain";
import { can, type Perm } from "@/lib/rbac";
import { logout } from "@/app/actions/auth";
import { Logo, Notice } from "@/components/ui";
import { BottomNav, SideNav, type NavItem } from "@/components/Nav";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";
import type { Messages } from "@/messages";

type Key = keyof Messages["common"]["nav"]["agency"];
import { IBook, IHome, IInbox, ILogout, IMegaphone, IReceipt, ISettings, IShield, IUsers } from "@/components/icons";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const { user, agencyId } = await requireAgency();
  const a = (await getAgency(agencyId))!;
  const today = todayISO();
  const [requests, compliance, workers, contacts] = await Promise.all([
    count(`SELECT COUNT(*)::int AS n FROM bookings WHERE agency_id = ? AND status = 'requested' AND date >= ?`, agencyId, today),
    count(
      `SELECT COUNT(*)::int AS n FROM documents d JOIN workers w ON w.id = d.worker_id WHERE w.agency_id = ? AND w.active = 1 AND (d.status = 'pending' OR (d.status = 'verified' AND d.expires <= ?))`,
      agencyId, addDays(today, 14)
    ),
    count(`SELECT COUNT(*)::int AS n FROM workers WHERE agency_id = ? AND active = 1`, agencyId),
    count(`SELECT COUNT(*)::int AS n FROM crm_contacts WHERE agency_id = ? AND opted_out = 0`, agencyId),
  ]);
  const { t, } = await getI18n();
  const all: (NavItem & { perm: Perm; key: Key })[] = [
    { key: "today", href: "/a", label: "", icon: <IHome />, exact: true, perm: "agency.view" },
    { key: "requests", href: "/a/requests", label: "", icon: <IInbox />, badge: requests, perm: "agency.view" },
    { key: "compliance", href: "/a/compliance", label: "", icon: <IShield />, badge: compliance, perm: "agency.view" },
    { key: "workers", href: "/a/workers", label: "", icon: <IUsers />, badge: workers, perm: "agency.view" },
    { key: "contractors", href: "/a/contractors", label: "", icon: <IBook />, badge: contacts, perm: "agency.view" },
    { key: "campaigns", href: "/a/campaigns", label: "", icon: <IMegaphone />, perm: "agency.view" },
    { key: "billing", href: "/a/billing", label: "", icon: <IReceipt />, perm: "agency.billing.view" },
    { key: "team", href: "/a/team", label: "", icon: <IUsers />, perm: "agency.team.manage" },
    { key: "settings", href: "/a/settings", label: "", icon: <ISettings />, perm: "agency.settings.edit" },
  ];
  const items = all.filter((i) => can(user, i.perm)).map((i) => ({ ...i, label: t(`common.nav.agency.${i.key}`) }));
  const short = (i: (typeof items)[number]) => ({ ...i, label: t(`common.nav.agencyShort.${i.key}`) });
  const mobile = items.filter((i) => ["today", "requests", "compliance", "workers", "campaigns"].includes(i.key)).map(short);
  const extra = items.filter((i) => ["contractors", "billing", "team", "settings"].includes(i.key)).map(short);
  return (
    <>
      <ImpersonationBanner user={user} />
      {/* The navy sidebar sits on the start side: right in Hebrew/Arabic, left in English. */}
      <div className="md:grid md:min-h-dvh md:grid-cols-[248px_1fr] md:rtl:bg-[linear-gradient(to_left,var(--color-ink)_248px,transparent_248px)] md:ltr:bg-[linear-gradient(to_right,var(--color-ink)_248px,transparent_248px)]">
        <aside className="blueprint sticky top-0 hidden h-dvh md:flex md:flex-col">
          <div className="px-5 pb-5 pt-6"><Link href="/a"><Logo dark /></Link></div>
          <div className="mx-4 mb-5 border border-white/20 p-3 text-sm">
            <div className="font-display text-[17px] font-bold leading-tight">{a.name}</div>
            <div className="mt-1 text-[13px] text-white/60">{user.name} · {t(`roles.org.${user.org_role}`)}</div>
          </div>
          <div className="flex-1 overflow-y-auto"><SideNav items={items} /></div>
          <div className="space-y-2 p-4">
            <Link href={`/o/${a.slug}`} target="_blank" className="btn btn-sm w-full border border-white/30 text-white hover:bg-white/10">{t("common.publicPage")} <span className="flip-ltr">↗</span></Link>
            <div className="flex justify-center"><LanguageSwitcher dark /></div>
            <form action={logout}><button className="btn btn-sm w-full text-white/60 hover:text-white"><ILogout className="h-4 w-4 flip-ltr" />{t("common.logout")}</button></form>
          </div>
        </aside>
        <div className="min-w-0 pb-24 md:pb-10">
          <header className="blueprint sticky top-0 z-30 flex h-14 items-center justify-between px-4 md:hidden">
            <Logo dark />
            <div className="flex items-center gap-1">
              {extra.map((i) => <Link key={i.href} href={i.href} className="rounded-[3px] px-2 py-1 text-xs text-white/70">{i.label}</Link>)}
              <form action={logout}><button className="grid h-9 w-9 place-items-center text-white/70" aria-label={t("common.logout")}><ILogout className="flip-ltr" /></button></form>
            </div>
          </header>
          {!a.verified && <div className="px-4 pt-4 md:px-8"><Notice tone="warn">{t("common.agencyPending", { license: a.license_no })}</Notice></div>}
          {!!a.suspended && <div className="px-4 pt-4 md:px-8"><Notice tone="bad">{t("common.agencySuspended")}</Notice></div>}
          <div className="flex justify-center px-4 pt-3 md:hidden"><LanguageSwitcher /></div>
          <main className="px-4 pt-6 md:px-10 md:pt-9">{children}</main>
        </div>
        <BottomNav items={mobile} />
      </div>
    </>
  );
}
