"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode; badge?: number; exact?: boolean };

const isActive = (path: string, it: NavItem) => (it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/"));

export function TopNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={`relative px-3 py-2 text-[15px] font-semibold ${isActive(path, it) ? "text-white after:absolute after:inset-x-3 after:-bottom-[9px] after:h-[3px] after:bg-hazard" : "text-white/65 hover:text-white"}`}>
          {it.label}
          {!!it.badge && <span className="num ms-1.5 rounded-[2px] bg-hazard px-1.5 text-[11px] font-bold text-ink">{it.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-ink/15 bg-paper pb-[env(safe-area-inset-bottom)] md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={`relative grid place-items-center gap-0.5 py-2 text-[12px] font-semibold ${isActive(path, it) ? "text-ink" : "text-muted"}`}>
          <span className={`grid h-7 w-12 place-items-center rounded-[3px] ${isActive(path, it) ? "bg-ink text-hazard" : ""}`}>{it.icon}</span>
          {it.label}
          {!!it.badge && <span className="absolute top-1 left-1/2 ms-3 grid h-4 min-w-4 place-items-center rounded-[2px] bg-signal px-1 text-[10px] font-bold text-white">{it.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="grid gap-0.5">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={`relative flex items-center gap-3 px-4 py-2.5 text-[15px] font-semibold ${isActive(path, it) ? "bg-white/10 text-white before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:bg-hazard" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
          <span className={isActive(path, it) ? "text-hazard" : "opacity-70"}>{it.icon}</span>
          <span className="flex-1">{it.label}</span>
          {!!it.badge && <span className={`num rounded-[2px] px-1.5 text-[12px] font-bold ${isActive(path, it) ? "bg-hazard text-ink" : "bg-white/10 text-white"}`}>{it.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
