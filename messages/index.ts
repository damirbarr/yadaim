import type { Plural } from "@/lib/i18n/core";
import type { Locale } from "@/lib/i18n/locales";
import he from "./he";
import ar from "./ar";
import en from "./en";

// Every language has exactly the keys of Hebrew (messages/he). A missing or extra key is a type error.
type Shape<T> = T extends Plural ? Plural : T extends string ? string : { [K in keyof T]: Shape<T[K]> };
export type Messages = Shape<typeof he>;

export const messages: Record<Locale, Messages> = { he, ar, en };
