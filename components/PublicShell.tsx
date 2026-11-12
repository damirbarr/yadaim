import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * Frame for every public screen outside the landing page (sign-in, onboarding, reset, no-access, legal, offers):
 * the landing's white header, a light background, and the content. One look from the first page to the app.
 */
export function PublicShell({ children, actions, wide = false }: { children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fb_40%,#f7f6f2_100%)]">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className={`mx-auto flex h-16 items-center gap-3 px-4 md:h-20 md:px-8 ${wide ? "max-w-[1280px]" : "max-w-5xl"}`}>
          <Link href="/"><Logo /></Link>
          <div className="ms-auto flex items-center gap-2">{actions}<LanguageSwitcher className={actions ? "hidden sm:inline-flex" : ""} /></div>
        </div>
      </header>
      {/* With an extra action in the header, a phone has no room for both: the language row moves under it. */}
      {actions && <div className="flex justify-center px-4 pt-3 sm:hidden"><LanguageSwitcher /></div>}
      {children}
    </div>
  );
}
