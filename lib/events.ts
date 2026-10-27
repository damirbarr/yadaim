import { run } from "./db";
import type { I18n } from "./i18n/core";
import type { Messages } from "@/messages";

// The activity feed. One party's action is read by the other (a contractor's request by the agency), each in
// their own language, so an entry stores a message key from messages/<locale>/events.ts plus its parameters.
// Parameters named trade / date / city hold raw values (trade key, ISO date, Hebrew city) and are formatted on display.

export type EventMsg = keyof Messages["events"];
type Params = Record<string, string | number>;

export async function logEvent(kind: string, ids: { agency?: number | null; contractor?: number | null; booking?: number | null }, msg: EventMsg, params: Params = {}) {
  await run(`INSERT INTO events (agency_id, contractor_id, booking_id, kind, msg, params) VALUES (?,?,?,?,?,?)`,
    ids.agency ?? null, ids.contractor ?? null, ids.booking ?? null, kind, msg, JSON.stringify(params));
}

export function eventText(e: { msg: string | null; params: string | null; text: string | null }, { t, fmt }: I18n): string {
  if (!e.msg) return e.text ?? ""; // entries written before messages were keyed
  const p: Params = e.params ? JSON.parse(e.params) : {};
  const shown: Params = { ...p };
  if (typeof p.trade === "string") { shown.trade = fmt.trade(p.trade); shown.trades = fmt.trades(p.trade); }
  if (typeof p.date === "string") shown.date = fmt.date(p.date);
  if (typeof p.city === "string") shown.city = fmt.city(p.city);
  return t(`events.${e.msg}` as never, shown);
}
