"use client";
import { setLocale } from "@/app/actions/i18n";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

/** One tap switches the whole app. Each name is written in its own language, so anyone can find theirs. */
export function LanguageSwitcher({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const { locale, t } = useI18n();
  // A caller that sets its own display (e.g. "hidden sm:inline-flex") decides visibility; otherwise inline-flex.
  const display = /(^|\s)(hidden|block|flex|inline-flex|grid)(\s|$)/.test(className) ? "" : "inline-flex";
  return (
    <form action={setLocale} className={`${display} items-center gap-0.5 ${className}`} aria-label={t("common.language")}>
      {(Object.keys(LOCALES) as Locale[]).map((l) => (
        <button key={l} name="locale" value={l} lang={l} dir={LOCALES[l].dir} aria-pressed={l === locale}
          className={`min-h-8 rounded-[3px] px-2 text-[13px] font-semibold ${l === locale ? (dark ? "bg-white/15 text-white" : "bg-ink text-white") : dark ? "text-white/60 hover:text-white" : "text-muted hover:text-ink"}`}>
          {LOCALES[l].name}
        </button>
      ))}
    </form>
  );
}
