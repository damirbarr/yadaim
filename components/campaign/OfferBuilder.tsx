"use client";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import { createCampaign } from "@/app/actions/agency";
import { offerSale, saleDay } from "@/app/a/campaigns/offer";
import { DEFAULT_OPTS, SALE_MAX, SALE_MIN, SALE_PCTS, validSalePct } from "@/lib/domain";
import { Notice } from "@/components/ui";
import { IWhatsapp } from "@/components/icons";

/** One possible date window of an offer: its last day, who is free through it, the ready-made text and the regular hourly price range. */
export type OfferOption = { to: string; workerCount: number; idleDays: number; cost: number; body: string; low: number; high: number };
/** A trade to offer, from its first free day. A regular offer has one window; an offer from the calendar has one per possible last day. */
export type OfferTrade = { trade: string; from: string; options: OfferOption[] };
/** A contact as the builder needs it: first name, area, and 0 = can be sent to, 1 = opted out, 2 = messaged in the last 3 days. */
export type OfferContact = { first: string; region: string | null; s: 0 | 1 | 2 };

/** The offer on /a/campaigns: pick a trade (or, from the calendar, the dates), an optional sale price, areas
 *  (live count), check the message, send. Everything is chosen on one screen; the send button is the agency's approval. */
export function OfferBuilder({ trades, initialTrade, dated = false, minDays, initialPct = 0, regions, defaultRegions, contacts, tail, sampleLink, canSend }: {
  trades: OfferTrade[]; initialTrade: string; dated?: boolean; minDays: number; initialPct?: number; regions: string[]; defaultRegions: string[]; contacts: OfferContact[]; tail: string; sampleLink: string; canSend: boolean;
}) {
  const { t, rich, fmt, intl } = useI18n();
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
  const opt = sel.options.find((o) => o.to === to) ?? sel.options[0];
  const key = `${sel.trade}:${opt.to}`;
  const original = opt.body;
  const body = edits[key] ?? original;
  const pct = choice === "custom" ? Number(custom) : Number(choice);
  const pctOk = pct === 0 || validSalePct(pct);
  const sale = pct > 0 && pctOk ? { pct, from: sel.from, to: opt.to, low: opt.low, high: opt.high } : null;

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
      {dated && <><input type="hidden" name="trade" value={sel.trade} /><input type="hidden" name="from" value={sel.from} /><input type="hidden" name="to" value={opt.to} /></>}

      {dated ? (
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
        <Step n={1} title={t("market.campaigns.steps.trade")} note={t("market.campaigns.steps.tradeNote")}>
          <div role="radiogroup" className="divide-y divide-dashed divide-line">
            {trades.map((x) => {
              const o = x.options[0];
              return (
                <label key={x.trade} className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-paper ${x.trade === sel.trade ? "bg-hazard-soft" : ""}`}>
                  <input type="radio" name="trade" value={x.trade} checked={x.trade === sel.trade} onChange={() => { setTrade(x.trade); setEditing(false); }} className="peer sr-only" />
                  <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${x.trade === sel.trade ? "border-ink" : "border-line"} peer-focus-visible:ring-2 peer-focus-visible:ring-hazard`}>
                    {x.trade === sel.trade && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px]">{rich("market.campaigns.free", { b }, { n: o.workerCount, trade: lower(fmt.trade(x.trade)), trades: lower(fmt.trades(x.trade)) })}</span>
                    <span className="block text-[13px] text-muted">{t("market.campaigns.idle", { n: o.idleDays, cost: fmt.money(o.cost) })}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Step>
      )}

      <Step n={2} title={t("market.campaigns.steps.sale")} note={t("market.campaigns.steps.saleNote")}>
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
          <Submit n={reach.length} disabled={!reach.length || !body.trim() || !pctOk} />
          <p className="text-[13px] text-muted">{t("market.campaigns.submitNote")}</p>
        </div>
      ) : (
        <Notice>{t("market.campaigns.viewOnly")}</Notice>
      )}
    </form>
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
