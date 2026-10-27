import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { messages } from "@/messages";
import { makeI18n } from "./core";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locales";

/** The viewer's language: their saved choice (cookie), otherwise Hebrew. */
export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

/** Use in server components, server actions and route handlers: `const { t, fmt } = await getI18n();` */
export const getI18n = cache(async () => {
  const locale = await getLocale();
  return makeI18n(locale, messages[locale]);
});
