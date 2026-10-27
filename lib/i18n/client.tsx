"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Messages } from "@/messages";
import { makeI18n } from "./core";
import type { Locale } from "./locales";

const Ctx = createContext<ReturnType<typeof makeI18n> | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const value = useMemo(() => makeI18n(locale, messages), [locale, messages]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Use in client components: `const { t, fmt } = useI18n();` */
export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside I18nProvider");
  return v;
}
