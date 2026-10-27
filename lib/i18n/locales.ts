// The languages the UI speaks. To add one: add it here, copy messages/he/ to messages/<code>/, translate,
// and register it in messages/index.ts. TypeScript fails until every key is translated.

export const LOCALES = {
  he: { name: "עברית", dir: "rtl", intl: "he-IL" }, // i18n-data
  ar: { name: "العربية", dir: "rtl", intl: "ar-IL-u-nu-latn" }, // Western digits, as used in Israel // i18n-data
  en: { name: "English", dir: "ltr", intl: "en-IL" },
} as const;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "he";
export const LOCALE_COOKIE = "yd_lang";
export const isLocale = (v: unknown): v is Locale => typeof v === "string" && v in LOCALES;
