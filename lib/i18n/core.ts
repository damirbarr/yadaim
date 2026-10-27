import { createElement, Fragment, type ReactNode } from "react";
import { LOCALES, type Locale } from "./locales";
import type { Messages } from "@/messages";

// Translation and formatting, the same on the server and in the browser.
//   t("agency.workers.title")                     → string
//   t("agency.workers.count", { n: 5 })           → "{n}" placeholders filled; plural objects pick a form by n
//   rich("public.demo", { link: (c) => <Link>{c}</Link> })  → <link>…</link> tags in the message become elements
//   fmt.money(1200), fmt.date(iso), fmt.trade("formwork") …  → locale-aware values

/** A message that changes with a number. `other` is required; add the forms the language needs. */
export type Plural = { other: string; zero?: string; one?: string; two?: string; few?: string; many?: string; __plural: true };
export const plural = (forms: Omit<Plural, "__plural">) => ({ ...forms, __plural: true }) as Plural;

type Params = Record<string, string | number>;
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string | Plural ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;

function lookup(messages: Messages, key: string): string | Plural | undefined {
  let v: unknown = messages;
  for (const part of key.split(".")) v = (v as Record<string, unknown> | undefined)?.[part];
  return v as string | Plural | undefined;
}

export function makeI18n(locale: Locale, messages: Messages) {
  const L = LOCALES[locale];
  const rules = new Intl.PluralRules(L.intl);
  // Numbers are formatted for the locale (1,200), except identifiers: a booking is "#1021", not "#1,021".
  const fill = (s: string, p?: Params) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(typeof p[k] === "number" && !/(^id$|Id$|^ref$)/.test(k) ? num(p[k] as number) : p[k]) : m)) : s);
  const num = (n: number, digits = 0) => n.toLocaleString(L.intl, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  function t(key: MessageKey, params?: Params): string {
    const v = lookup(messages, key);
    if (v == null) return key; // a missing key shows itself, so it's easy to spot
    if (typeof v === "string") return fill(v, params);
    const n = Number(params?.n ?? params?.count ?? 0);
    const form = (n === 0 && v.zero) || v[rules.select(n) as keyof Plural] || v.other;
    return fill(form as string, params);
  }

  /** Like t(), but <tag>text</tag> in the message is rendered with the matching function. */
  function rich(key: MessageKey, tags: Record<string, (chunk: ReactNode) => ReactNode>, params?: Params): ReactNode {
    const parts = t(key, params).split(/(<(\w+)>[\s\S]*?<\/\2>)/g);
    const out: ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      const m = parts[i].match(/^<(\w+)>([\s\S]*)<\/\1>$/);
      if (m && tags[m[1]]) { out.push(createElement(Fragment, { key: i }, tags[m[1]](m[2]))); i++; }
      else if (parts[i]) out.push(parts[i]);
    }
    return createElement(Fragment, null, ...out);
  }

  const d = messages.domain;
  const day = (iso: string) => new Date(iso + "T12:00:00Z");
  const fmt = {
    num,
    money: (n: number, digits = 0) => `₪${num(n, digits)}`,
    /** 27.10 */
    date: (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`,
    /** 27.10.2026 */
    fullDate: (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`,
    /** For "{from} – {to}" messages: wraps the whole range in one left-to-right isolate, so 28.10–10.11 keeps its
     *  order inside Hebrew/Arabic text (a lone number needs nothing; see .num in globals.css). */
    range: (from: string, to: string) => ({ from: `\u2066${from}`, to: `${to}\u2069` }),
    /** 10.2026 */
    month: (iso: string) => `${iso.slice(5, 7)}.${iso.slice(0, 4)}`,
    weekday: (iso: string) => new Intl.DateTimeFormat(L.intl, { weekday: "long", timeZone: "UTC" }).format(day(iso)),
    /** "יום רביעי 28.10" / "Wednesday 28.10" */
    prettyDate: (iso: string) => `${fmt.weekday(iso)} ${fmt.date(iso)}`,
    /** today / tomorrow / yesterday, otherwise prettyDate */
    relDay: (iso: string, today: string) => {
      const diff = Math.round((day(iso).getTime() - day(today).getTime()) / 86400000);
      return diff === 0 ? d.today : diff === 1 ? d.tomorrow : diff === -1 ? d.yesterday : fmt.prettyDate(iso);
    },
    trade: (k: string) => d.trades[k as keyof typeof d.trades]?.one ?? k,
    trades: (k: string) => d.trades[k as keyof typeof d.trades]?.many ?? k,
    region: (k: string) => d.regions[k as keyof typeof d.regions] ?? k,
    /** City names are stored in Hebrew; unknown ones are shown as entered. */
    city: (name: string | null | undefined) => (name ? (d.cities as Record<string, string>)[name] ?? name : ""),
    country: (code: string) => d.countries[code as keyof typeof d.countries] ?? code,
    doc: (k: string) => d.docs[k as keyof typeof d.docs]?.name ?? k,
    docShort: (k: string) => d.docs[k as keyof typeof d.docs]?.short ?? k,
    phase: (k: string) => d.phases[k as keyof typeof d.phases] ?? k,
    minDays: (v: number) => d.minDays[String(v) as keyof typeof d.minDays] ?? String(v),
    tag: (k: string) => (d.workTags as Record<string, string>)[k] ?? k,
  };

  return { locale, dir: L.dir, intl: L.intl, t, rich, fmt };
}

export type I18n = ReturnType<typeof makeI18n>;
