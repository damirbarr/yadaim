"use client";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import { createCampaign } from "@/app/actions/agency";
import { Notice } from "@/components/ui";
import { IWhatsapp } from "@/components/icons";

export type OfferTrade = { trade: string; workerCount: number; idleDays: number; cost: number; body: string };
/** A contact as the builder needs it: first name, area, and 0 = can be sent to, 1 = opted out, 2 = messaged in the last 3 days. */
export type OfferContact = { first: string; region: string | null; s: 0 | 1 | 2 };

/** The three-step offer on /a/campaigns: pick a trade, pick areas (live count), check the message, send.
 *  Everything is chosen on one screen; the send button is the agency's approval. */
export function OfferBuilder({ trades, initialTrade, regions, defaultRegions, contacts, tail, sampleLink, canSend }: {
  trades: OfferTrade[]; initialTrade: string; regions: string[]; defaultRegions: string[]; contacts: OfferContact[]; tail: string; sampleLink: string; canSend: boolean;
}) {
  const { t, rich, fmt, intl } = useI18n();
  const token = t("market.campaigns.nameToken");
  const [trade, setTrade] = useState(initialTrade);
  const [areas, setAreas] = useState<string[]>(defaultRegions.length ? defaultRegions : regions);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const sel = trades.find((x) => x.trade === trade) ?? trades[0];
  const original = sel.body;
  const body = edits[sel.trade] ?? original;

  // Same rule as the server: contacts without a known area are always included.
  const inArea = useMemo(() => (areas.length ? contacts.filter((c) => !c.region || areas.includes(c.region)) : []), [contacts, areas]);
  const reach = inArea.filter((c) => c.s === 0);
  const optedOut = inArea.filter((c) => c.s === 1).length;
  const recent = inArea.filter((c) => c.s === 2).length;
  const first = reach[0]?.first ?? t("market.campaigns.sampleName");
  const preview = `${body.replaceAll(token, first)} ${tail}`;
  const lower = (s: string) => s.toLocaleLowerCase(intl);
  const b = (c: ReactNode) => <b className="font-bold text-ink">{c}</b>;

  return (
    <form action={createCampaign} className="max-w-3xl space-y-4">
      <input type="hidden" name="message" value={body} />

      <Step n={1} title={t("market.campaigns.steps.trade")} note={t("market.campaigns.steps.tradeNote")}>
        <div role="radiogroup" className="divide-y divide-dashed divide-line">
          {trades.map((x) => (
            <label key={x.trade} className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-paper ${x.trade === sel.trade ? "bg-hazard-soft" : ""}`}>
              <input type="radio" name="trade" value={x.trade} checked={x.trade === sel.trade} onChange={() => { setTrade(x.trade); setEditing(false); }} className="peer sr-only" />
              <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${x.trade === sel.trade ? "border-ink" : "border-line"} peer-focus-visible:ring-2 peer-focus-visible:ring-hazard`}>
                {x.trade === sel.trade && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px]">{rich("market.campaigns.free", { b }, { n: x.workerCount, trade: lower(fmt.trade(x.trade)), trades: lower(fmt.trades(x.trade)) })}</span>
                <span className="block text-[13px] text-muted">{t("market.campaigns.idle", { n: x.idleDays, cost: fmt.money(x.cost) })}</span>
              </span>
            </label>
          ))}
        </div>
      </Step>

      <Step n={2} title={t("market.campaigns.steps.regions")} note={t("market.campaigns.steps.regionsNote")}>
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

      <Step n={3} title={t("market.campaigns.steps.message")} note={t("market.campaigns.steps.messageNote")}>
        <div className="space-y-3 p-4">
          <WhatsappBubble text={preview} link={sampleLink} footer={t("market.campaigns.offer.optOut")} />
          {canSend && (editing ? (
            <div className="space-y-2">
              <textarea rows={5} className="input" value={body} onChange={(e) => setEdits({ ...edits, [sel.trade]: e.target.value })} aria-label={t("market.campaigns.edit")} />
              <p className="text-[13px] text-muted">{t("market.campaigns.editHint", { token })}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost btn-sm min-h-10" onClick={() => setEditing(false)}>{t("market.campaigns.editDone")}</button>
                {body !== original && <button type="button" className="btn btn-sm min-h-10 text-muted underline" onClick={() => setEdits({ ...edits, [sel.trade]: original })}>{t("market.campaigns.reset")}</button>}
              </div>
            </div>
          ) : (
            <button type="button" className="btn-ghost btn-sm min-h-10" onClick={() => setEditing(true)}>{t("market.campaigns.edit")}</button>
          ))}
        </div>
      </Step>

      {canSend ? (
        <div className="space-y-2 pt-1">
          <Submit n={reach.length} disabled={!reach.length || !body.trim()} />
          <p className="text-[13px] text-muted">{t("market.campaigns.submitNote")}</p>
        </div>
      ) : (
        <Notice>{t("market.campaigns.viewOnly")}</Notice>
      )}
    </form>
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
