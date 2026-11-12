"use client";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import { createCampaign } from "@/app/actions/agency";
import { commonRun, offerGroupBody, offerSale, saleDay } from "@/app/a/campaigns/offer";
import { DEFAULT_OPTS, SALE_MAX, SALE_MIN, SALE_PCTS, validSalePct } from "@/lib/domain";
import { Notice } from "@/components/ui";
import { IWhatsapp } from "@/components/icons";

/** One possible date window of an offer: its last day, who is free through it, the ready-made text and the regular hourly price range. */
export type OfferOption = { to: string; workerCount: number; idleDays: number; cost: number; body: string; low: number; high: number };
/** A trade to offer, from its first free day. A regular offer has one window; an offer from the calendar has one per possible last day. */
export type OfferTrade = { trade: string; from: string; options: OfferOption[] };
/** A worker who can be offered by name: free days in the next two weeks, rating, all-in hourly price, crew name. */
export type OfferPerson = { id: number; name: string; trade: string; free: string[]; rating: number | null; hourly: number; crew: string | null };
/** One of the agency's crews, with every active member (free or not, so a busy member shows why the crew can't go). */
export type OfferCrew = { id: number; name: string; leader: number | null; members: OfferPerson[] };
type Target = "trade" | "crew" | "workers";

/** A contact as the builder needs it: first name, area, and 0 = can be sent to, 1 = opted out, 2 = messaged in the last 3 days. */
export type OfferContact = { first: string; region: string | null; s: 0 | 1 | 2 };

/** The offer on /a/campaigns: pick a trade (or, from the calendar, the dates), an optional sale price, areas
 *  (live count), check the message, send. Everything is chosen on one screen; the send button is the agency's approval. */
export function OfferBuilder({ trades, initialTrade, dated = false, minDays, initialPct = 0, regions, defaultRegions, contacts, tail, sampleLink, canSend, days = [], people = [], crews = [], initialTarget = "trade", initialCrew = null }: {
  trades: OfferTrade[]; initialTrade: string; dated?: boolean; minDays: number; initialPct?: number; regions: string[]; defaultRegions: string[]; contacts: OfferContact[]; tail: string; sampleLink: string; canSend: boolean;
  days?: string[]; people?: OfferPerson[]; crews?: OfferCrew[]; initialTarget?: Target; initialCrew?: number | null;
}) {
  const i18n = useI18n();
  const { t, rich, fmt, intl } = i18n;
  const [target, setTarget] = useState<Target>(dated ? "trade" : initialTarget);
  const [crewId, setCrewId] = useState<number | null>(crews.find((c) => c.id === initialCrew)?.id ?? crews.find((c) => commonRun(days, c.members.map((m) => m.free)))?.id ?? crews[0]?.id ?? null);
  const [picked, setPicked] = useState<number[]>([]);
  const token = t("market.campaigns.nameToken");
  const [trade, setTrade] = useState(initialTrade);
  const [to, setTo] = useState<string | null>(null);
  const [areas, setAreas] = useState<string[]>(defaultRegions.length ? defaultRegions : regions);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  // Sale: "0" = none, a quick percentage, or "custom" with its own field.
  const [choice, setChoice] = useState(String(initialPct));
  const [custom, setCustom] = useState("");
  const sel = trades.find((x) => x.trade === trade) ?? trades[0];
  const opt = sel ? sel.options.find((o) => o.to === to) ?? sel.options[0] : null;
  // A crew or picked workers: the days they are all free (the server recomputes this when the offer is sent).
  const crew = crews.find((c) => c.id === crewId) ?? null;
  const group = target === "crew" ? crew?.members ?? [] : target === "workers" ? people.filter((p) => picked.includes(p.id)) : [];
  const run = target === "trade" ? null : commonRun(days, group.map((p) => p.free));
  const groupOk = !!run && run.workDays >= minDays;
  const rated = group.map((p) => p.rating).filter((x): x is number => x != null);
  const groupAvg = rated.length ? rated.reduce((x, y) => x + y, 0) / rated.length : 0;
  const key = target === "trade" ? `${sel?.trade}:${opt?.to}` : target === "crew" ? `crew:${crewId}` : `workers:${[...picked].sort((x, y) => x - y).join(",")}`;
  const original = target === "trade" ? opt?.body ?? "" : run ? offerGroupBody(i18n, { kind: target, crew: crew?.name, people: group, from: run.from, to: run.to }, groupAvg) : "";
  const body = edits[key] ?? original;
  // Sale prices are per trade (lib/promotions), so they belong to the offer by trade only.
  const pct = target !== "trade" ? 0 : choice === "custom" ? Number(custom) : Number(choice);
  const pctOk = pct === 0 || validSalePct(pct);
  const sale = sel && opt && pct > 0 && pctOk ? { pct, from: sel.from, to: opt.to, low: opt.low, high: opt.high } : null;
  const ready = target === "trade" ? !!opt : groupOk;

  // Same rule as the server: contacts without a known area are always included.
  const inArea = useMemo(() => (areas.length ? contacts.filter((c) => !c.region || areas.includes(c.region)) : []), [contacts, areas]);
  const reach = inArea.filter((c) => c.s === 0);
  const optedOut = inArea.filter((c) => c.s === 1).length;
  const recent = inArea.filter((c) => c.s === 2).length;
  const first = reach[0]?.first ?? t("market.campaigns.sampleName");
  const preview = [body.replaceAll(token, first), sale && offerSale({ t, fmt }, sale), tail].filter(Boolean).join(" ");
  const lower = (s: string) => s.toLocaleLowerCase(intl);
  const b = (c: ReactNode) => <b className="font-bold text-ink">{c}</b>;

  return (
    <form action={createCampaign} className="max-w-3xl space-y-4">
      <input type="hidden" name="message" value={body} />
      <input type="hidden" name="pct" value={sale ? sale.pct : 0} />
      <input type="hidden" name="target" value={target} />
      {target === "crew" && crewId != null && <input type="hidden" name="crew_id" value={crewId} />}
      {target === "workers" && <input type="hidden" name="worker_ids" value={picked.join(",")} />}
      {dated && sel && opt && <><input type="hidden" name="trade" value={sel.trade} /><input type="hidden" name="from" value={sel.from} /><input type="hidden" name="to" value={opt.to} /></>}

      {dated && sel && opt ? (
        <Step n={1} title={t("market.campaigns.steps.dates")} note={t("market.campaigns.steps.datesNote")}>
          <div className="space-y-3 p-4">
            <p className="text-[16px]">{rich("market.campaigns.datedFree", { b }, { n: sel.options[0].workerCount, trade: lower(fmt.trade(sel.trade)), trades: lower(fmt.trades(sel.trade)), date: fmt.date(sel.from) })}</p>
            <div>
              <div className="label">{t("market.campaigns.until")}</div>
              <div role="radiogroup" aria-label={t("market.campaigns.until")} className="flex flex-wrap gap-2" data-testid="offer-until">
                {sel.options.map((o) => {
                  const on = o.to === opt.to;
                  return (
                    <label key={o.to} className={`inline-flex min-h-12 cursor-pointer flex-col justify-center rounded-[3px] border px-3 py-1 leading-tight transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
                      <input type="radio" name="until" value={o.to} checked={on} onChange={() => { setTo(o.to); setEditing(false); }} className="sr-only" />
                      <span className="num text-[15px] font-bold">{fmt.date(o.to)}</span>
                      <span className={`text-[12px] ${on ? "text-hazard" : "text-muted"}`}>{t("market.campaigns.untilFree", { n: o.workerCount })}</span>
                    </label>
                  );
                })}
              </div>
              {minDays > 1 && <p className="mt-2 text-[13px] text-muted">{t("market.campaigns.untilMin", { min: lower(fmt.minDays(minDays)) })}</p>}
            </div>
            <Link href="/a/campaigns" className="inline-block text-[13px] font-semibold text-ink underline">{t("market.campaigns.allTradesLink")}</Link>
          </div>
        </Step>
      ) : (
        <Step n={1} title={t("market.campaigns.target.label")} note={target === "trade" ? t("market.campaigns.steps.tradeNote") : target === "crew" ? t("market.campaigns.pick.crewNote") : t("market.campaigns.pick.workersNote")}>
          <div role="radiogroup" aria-label={t("market.campaigns.target.label")} className="flex flex-wrap gap-2 border-b border-line p-3" data-testid="offer-target">
            {(["trade", "crew", "workers"] as const).map((v) => {
              const on = target === v;
              return (
                <label key={v} className={`inline-flex min-h-10 cursor-pointer items-center rounded-[3px] border px-3.5 text-[15px] font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-ink"}`}>
                  <input type="radio" name="target_choice" value={v} checked={on} onChange={() => { setTarget(v); setEditing(false); }} className="sr-only" />
                  {t(`market.campaigns.target.${v}`)}
                </label>
              );
            })}
          </div>

          {target === "trade" && (trades.length === 0 ? <p className="p-4 text-[15px] text-muted">{t("market.campaigns.emptyBody")}</p> : (
            <div role="radiogroup" className="divide-y divide-dashed divide-line">
              {trades.map((x) => {
                const o = x.options[0];
                const on = x.trade === sel?.trade;
                return (
                  <label key={x.trade} className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-paper ${on ? "bg-hazard-soft" : ""}`}>
                    <input type="radio" name="trade" value={x.trade} checked={on} onChange={() => { setTrade(x.trade); setEditing(false); }} className="peer sr-only" />
                    <Dot on={on} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px]">{rich("market.campaigns.free", { b }, { n: o.workerCount, trade: lower(fmt.trade(x.trade)), trades: lower(fmt.trades(x.trade)) })}</span>
                      <span className="block text-[13px] text-muted">{t("market.campaigns.idle", { n: o.idleDays, cost: fmt.money(o.cost) })}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          ))}

          {target === "crew" && (crews.length === 0 ? (
            <div className="p-4"><Notice tone="info">{rich("market.campaigns.pick.noCrews", { link: (c) => <Link href="/a/crews" className="font-bold underline">{c}</Link> })}</Notice></div>
          ) : (
            <div role="radiogroup" className="divide-y divide-dashed divide-line" data-testid="offer-crews">
              {crews.map((c) => {
                const on = c.id === crewId;
                const r = commonRun(days, c.members.map((m) => m.free));
                return (
                  <label key={c.id} className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-paper ${on ? "bg-hazard-soft" : ""}`}>
                    <input type="radio" name="crew_choice" value={c.id} checked={on} onChange={() => { setCrewId(c.id); setEditing(false); }} className="peer sr-only" />
                    <Dot on={on} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold text-ink">{c.name} <span className="text-[13px] font-normal text-muted">· {t("market.campaigns.pick.members", { n: c.members.length })}</span></span>
                      <span className="block truncate text-[13px] text-muted">{c.members.map((m) => `${m.name} (${lower(fmt.trade(m.trade))})`).join(", ")}</span>
                      <Together run={r} minDays={minDays} empty={t("market.campaigns.pick.crewNone")} />
                    </span>
                  </label>
                );
              })}
            </div>
          ))}

          {target === "workers" && (
            <div>
              <div className="max-h-[420px] divide-y divide-dashed divide-line overflow-y-auto" data-testid="offer-workers">
                {people.map((p) => {
                  const on = picked.includes(p.id);
                  return (
                    <label key={p.id} className={`flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-paper ${on ? "bg-hazard-soft" : ""}`}>
                      <input type="checkbox" checked={on} onChange={() => { setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id]); setEditing(false); }} className="h-5 w-5 shrink-0 accent-ink" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px]"><b className="text-ink">{p.name}</b> · {fmt.trade(p.trade)}{p.crew ? <span className="text-muted"> · {t("market.campaigns.pick.inCrew", { crew: p.crew })}</span> : null}</span>
                        <span className="block text-[13px] text-muted">{t("market.campaigns.pick.freeDays", { n: p.free.length })}{p.rating != null ? <> · <span className="num">★ {fmt.num(p.rating, 1)}</span></> : null}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="border-t border-line px-4 py-3 text-[15px]">
                <span className="font-semibold text-ink">{t("market.campaigns.pick.picked", { n: picked.length })}</span>
                {picked.length > 0 && <Together run={run} minDays={minDays} empty={t("market.campaigns.pick.noCommon")} />}
              </div>
            </div>
          )}
        </Step>
      )}

      <Step n={2} title={t("market.campaigns.steps.sale")} note={t("market.campaigns.steps.saleNote")}>
        {target !== "trade" ? <p className="p-4 text-[14px] text-muted">{t("market.campaigns.pick.saleTradeOnly")}</p> : (
        <div className="space-y-3 p-4" data-testid="offer-sale">
          <div role="radiogroup" aria-label={t("market.campaigns.steps.sale")} className="flex flex-wrap gap-2">
            {[["0", t("market.campaigns.sale.none")], ...SALE_PCTS.map((p) => [String(p), `${p}%`]), ["custom", t("market.campaigns.sale.custom")]].map(([v, label]) => {
              const on = choice === v;
              return (
                <label key={v} className={`inline-flex min-h-10 cursor-pointer items-center rounded-[3px] border px-3.5 text-[15px] font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-ink"}`}>
                  <input type="radio" name="sale_choice" value={v} checked={on} onChange={() => setChoice(v)} className="sr-only" />
                  <span className={v !== "0" && v !== "custom" ? "num" : undefined}>{label}</span>
                </label>
              );
            })}
          </div>
          {choice === "custom" && (
            <div>
              <label className="label" htmlFor="sale-pct">{t("market.campaigns.sale.customLabel", { min: SALE_MIN, max: SALE_MAX })}</label>
              <div className="flex items-center gap-2">
                <input id="sale-pct" className="input w-28" inputMode="numeric" autoFocus value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                <span className="font-semibold text-muted">%</span>
              </div>
              {custom !== "" && !pctOk && <p className="mt-1 text-[13px] font-semibold text-bad">{t("market.campaigns.sale.badPct", { min: SALE_MIN, max: SALE_MAX })}</p>}
            </div>
          )}
          {sale && <SalePrice sale={sale} />}
        </div>
        )}
      </Step>

      <Step n={3} title={t("market.campaigns.steps.regions")} note={t("market.campaigns.steps.regionsNote")}>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => {
              const on = areas.includes(r);
              return (
                <label key={r} className={`inline-flex min-h-10 cursor-pointer items-center rounded-[3px] border px-3.5 text-[15px] font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-ink"}`}>
                  <input type="checkbox" name="regions" value={r} checked={on} onChange={() => setAreas(on ? areas.filter((x) => x !== r) : [...areas, r])} className="sr-only" />
                  {fmt.region(r)}
                </label>
              );
            })}
          </div>
          {contacts.length === 0 ? (
            <Notice tone="warn">{rich("market.campaigns.noContacts", { link: (c) => <Link href="/a/contractors" className="font-bold underline">{c}</Link> })}</Notice>
          ) : areas.length === 0 ? (
            <p className="text-[15px] font-semibold text-bad">{t("market.campaigns.pickRegion")}</p>
          ) : (
            <div>
              <p className="text-[17px]">{rich("market.campaigns.reach", { b }, { n: reach.length })}</p>
              {(optedOut > 0 || recent > 0) && (
                <ul className="mt-1 space-y-0.5 text-[13px] text-muted">
                  {optedOut > 0 && <li>{t("market.campaigns.skipOptOut", { n: optedOut })}</li>}
                  {recent > 0 && <li>{t("market.campaigns.skipRecent", { n: recent })}</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      </Step>

      <Step n={4} title={t("market.campaigns.steps.message")} note={t("market.campaigns.steps.messageNote")}>
        <div className="space-y-3 p-4">
          <WhatsappBubble text={preview} link={sampleLink} footer={t("market.campaigns.offer.optOut")} />
          {canSend && (editing ? (
            <div className="space-y-2">
              <textarea rows={5} className="input" value={body} onChange={(e) => setEdits({ ...edits, [key]: e.target.value })} aria-label={t("market.campaigns.edit")} />
              <p className="text-[13px] text-muted">{t("market.campaigns.editHint", { token })}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost btn-sm min-h-10" onClick={() => setEditing(false)}>{t("market.campaigns.editDone")}</button>
                {body !== original && <button type="button" className="btn btn-sm min-h-10 text-muted underline" onClick={() => setEdits({ ...edits, [key]: original })}>{t("market.campaigns.reset")}</button>}
              </div>
            </div>
          ) : (
            <button type="button" className="btn-ghost btn-sm min-h-10" onClick={() => setEditing(true)}>{t("market.campaigns.edit")}</button>
          ))}
        </div>
      </Step>

      {canSend ? (
        <div className="space-y-2 pt-1">
          <Submit n={reach.length} disabled={!ready || !reach.length || !body.trim() || !pctOk} />
          <p className="text-[13px] text-muted">{t("market.campaigns.submitNote")}</p>
        </div>
      ) : (
        <Notice>{t("market.campaigns.viewOnly")}</Notice>
      )}
    </form>
  );
}

/** The radio dot used in the lists of step 1. */
function Dot({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? "border-ink" : "border-line"} peer-focus-visible:ring-2 peer-focus-visible:ring-hazard`}>
      {on && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
    </span>
  );
}

/** "Free together 03.11–07.11 · 5 work days", or why the group can't be offered. */
function Together({ run, minDays, empty }: { run: { from: string; to: string; workDays: number } | null; minDays: number; empty: string }) {
  const { t, rich, fmt, intl } = useI18n();
  const num = (c: ReactNode) => <span className="num" dir="ltr">{c}</span>;
  if (!run) return <span className="block text-[13px] font-semibold text-bad">{empty}</span>;
  const days = t("market.campaigns.days", { n: run.workDays });
  if (run.workDays < minDays) return <span className="block text-[13px] font-semibold text-warn">{t("market.campaigns.pick.tooShort", { days, min: fmt.minDays(minDays).toLocaleLowerCase(intl) })}</span>;
  return (
    <span className="block text-[13px] font-semibold text-ok">
      {run.from === run.to ? rich("market.campaigns.pick.togetherDay", { num }, { from: fmt.date(run.from) }) : rich("market.campaigns.pick.together", { num }, { from: fmt.date(run.from), to: fmt.date(run.to), days })}
    </span>
  );
}

/** Regular price struck through, the sale price beside it, and the rule that decides which bookings get it. */
function SalePrice({ sale }: { sale: { pct: number; from: string; to: string; low: number; high: number } }) {
  const { t, rich, fmt } = useI18n();
  const { was, now } = saleDay(sale);
  const same = sale.low === sale.high;
  return (
    <div className="rounded-[3px] border border-line bg-hazard-soft p-3" data-testid="sale-price">
      <p className="text-[22px] font-bold leading-tight text-ink">
        {rich(same ? "market.campaigns.sale.price" : "market.campaigns.sale.priceFrom", {
          was: (c) => <s className="num text-[17px] font-semibold text-muted">{c}</s>,
          now: (c) => <b className="num">{c}</b>,
        }, { was: fmt.money(was), now: fmt.money(now) })}
      </p>
      <p className="text-[13px] text-muted">{same ? t("market.campaigns.sale.unit", { hours: DEFAULT_OPTS.hours }) : t("market.campaigns.sale.unitFrom", { hours: DEFAULT_OPTS.hours, pct: sale.pct })}</p>
      <p className="mt-2 text-[14px]">{sale.from === sale.to ? t("market.campaigns.sale.ruleDay", { date: fmt.date(sale.from) }) : t("market.campaigns.sale.rule", { from: fmt.date(sale.from), to: fmt.date(sale.to) })}</p>
    </div>
  );
}

/** A numbered step: navy square with the number, serif title, muted note, then its content on a white sheet. */
function Step({ n, title, note, children }: { n: number; title: string; note: string; children: ReactNode }) {
  return (
    <section className="sheet overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="blueprint grid h-8 w-8 shrink-0 place-items-center rounded-[3px] font-display text-[17px] font-bold text-hazard num">{n}</span>
        <div className="min-w-0">
          <h2 className="text-[18px] font-bold leading-tight text-ink">{title}</h2>
          <p className="text-[13px] text-muted">{note}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Submit({ n, disabled }: { n: number; disabled: boolean }) {
  const { t } = useI18n();
  const { pending } = useFormStatus();
  return (
    <button disabled={disabled || pending} className="btn-primary min-h-12 w-full px-6 text-[16px] sm:w-auto">
      <IWhatsapp className="h-5 w-5" />
      {pending ? t("market.campaigns.submitting") : t("market.campaigns.submit", { n })}
    </button>
  );
}

/** The message as a contractor sees it: a WhatsApp bubble with the text, the personal link and the opt-out line. */
export function WhatsappBubble({ text, link, footer, stored = false }: { text: string; link: string; footer: string; stored?: boolean }) {
  return (
    <div className="rounded-[3px] bg-[#e7ddd0] p-3 sm:p-4">
      <div className="max-w-md rounded-[3px] bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-text shadow-[0_1px_0_rgba(14,42,68,.12)]">
        <p dir="auto" translate={stored ? "no" : undefined} className="whitespace-pre-line">{text}</p>
        <p className="mt-1 break-all"><span dir="ltr" translate="no" className="text-info underline">{link}</span></p>
        <p dir="auto" className="mt-3 text-[13px] text-muted">{footer}</p>
      </div>
    </div>
  );
}
