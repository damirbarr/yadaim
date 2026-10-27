import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all, get } from "@/lib/db";
import { addDays, todayISO } from "@/lib/domain";
import { campaignPromotion } from "@/lib/promotions";
import { endPromotion } from "@/app/actions/agency";
import { appUrl } from "@/lib/wa";
import { PageHead } from "@/components/ui";
import { IPhone, IWhatsapp } from "@/components/icons";
import { WhatsappBubble } from "@/components/campaign/OfferBuilder";
import { RefreshOnReturn, WaLink } from "@/components/campaign/LiveRefresh";
import { getI18n } from "@/lib/i18n/server";
import { messages } from "@/messages";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("market.campaigns.title") };
}

// An offer keeps the name placeholder of the language it was written in; its opt-out line follows that language.
const LANGS = Object.values(messages).map((m) => m.market.campaigns);
const TOKENS = LANGS.map((m) => m.nameToken);

type Rec = { id: number; ref: string; sent_at: string | null; opened_at: string | null; booked_at: string | null; name: string; company: string | null; phone: string; city: string | null; opted_out: number; last_sent_at: string | null; recent: boolean };

export default async function Campaign({ params }: { params: Promise<{ id: string }> }) {
  const { user, agencyId } = await requireAgency();
  const { t, rich, fmt } = await getI18n();
  const send = can(user, "agency.campaigns.send");
  const c = (await get(`SELECT * FROM campaigns WHERE id = ? AND agency_id = ?`, Number((await params).id), agencyId)) as { id: number; trade: string; date_from: string; date_to: string; message: string; created_at: string } | undefined;
  if (!c) notFound();
  const promo = await campaignPromotion(c.id, agencyId);
  const promoLive = !!promo && !promo.ended_at && promo.date_to >= todayISO();
  const recs = (await all(
    `SELECT r.id, r.ref, r.sent_at, r.opened_at, r.booked_at, k.name, k.company, k.phone, k.city, k.opted_out, k.last_sent_at,
            (k.last_sent_at IS NOT NULL AND k.last_sent_at > now_txt(interval '-3 days')) AS recent
     FROM campaign_recipients r JOIN crm_contacts k ON k.id = r.contact_id WHERE r.campaign_id = ? ORDER BY k.name`
  , c.id)) as Rec[];
  // Each contractor sits in exactly one group, in the order the agency acts on them.
  // Not sent yet but opted out, or messaged by another offer in the last 3 days: the rules say wait (or never).
  const skip = (r: Rec) => !r.sent_at && (r.opted_out || r.recent);
  const booked = recs.filter((r) => r.booked_at);
  const viewed = recs.filter((r) => !r.booked_at && r.opened_at);
  const waiting = recs.filter((r) => !r.sent_at && !skip(r));
  const sentOnly = recs.filter((r) => r.sent_at && !r.opened_at && !r.booked_at);
  const skipped = recs.filter(skip);
  const sent = recs.filter((r) => r.sent_at).length;
  const sendable = sent + waiting.length;
  const next = waiting[0];
  const first = (next ?? recs[0])?.name.split(" ")[0] ?? t("market.campaigns.sampleName");
  const text = TOKENS.reduce((s, tok) => s.replaceAll(tok, first), c.message);

  const meta = (r: Rec) => [r.company, r.city && fmt.city(r.city)].filter(Boolean).join(" · ");
  const sendBtn = (r: Rec, again = false) => send && (
    <WaLink href={`/api/wa/${r.id}`} className="btn-ghost btn-sm min-h-10 shrink-0">
      <IWhatsapp className="h-4 w-4" />{again ? t("market.campaigns.detail.again") : t("market.campaigns.detail.send")}
    </WaLink>
  );
  const callBtn = (r: Rec) => (
    <a href={`tel:${r.phone}`} className="btn-ghost btn-sm min-h-10 shrink-0"><IPhone className="h-4 w-4" />{t("market.campaigns.detail.call")}</a>
  );
  // Long groups show their first rows; the rest open on demand so the page stays short on a phone.
  const LIMIT = 6;
  const group = (title: string, rows: Rec[], action: (r: Rec) => ReactNode, opts: { note?: ReactNode; tone?: string; status?: (r: Rec) => ReactNode } = {}) => {
    if (!rows.length) return null;
    const row = (r: Rec) => (
      <li key={r.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{r.name}</span>
          {(opts.status || meta(r)) && <span className="block truncate text-[13px] text-muted">{opts.status ? opts.status(r) : meta(r)}</span>}
        </span>
        {action(r)}
      </li>
    );
    return (
      <section className="sheet">
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line px-4 py-3">
          <h2 className={`text-[17px] font-bold ${opts.tone ?? "text-ink"}`}>{title} <span className="num font-normal text-muted">({rows.length})</span></h2>
          {opts.note && <span className="text-[13px] text-muted">{opts.note}</span>}
        </header>
        <ul className="divide-y divide-dashed divide-line">{rows.slice(0, LIMIT).map(row)}</ul>
        {rows.length > LIMIT && (
          <details className="group border-t border-dashed border-line">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-[14px] font-semibold text-ink underline group-open:hidden">{t("market.campaigns.detail.showAll", { n: rows.length })}</summary>
            <ul className="divide-y divide-dashed divide-line">{rows.slice(LIMIT).map(row)}</ul>
          </details>
        )}
      </section>
    );
  };

  return (
    <div className="max-w-3xl space-y-5">
      <RefreshOnReturn />
      <PageHead
        back="/a/campaigns"
        eyebrow={t("market.campaigns.detail.eyebrow", { date: fmt.date(c.created_at.slice(0, 10)) })}
        title={rich("market.campaigns.detail.title", { num: (x) => <span className="num" dir="ltr">{x}</span> }, { trades: fmt.trades(c.trade), from: fmt.date(c.date_from), to: fmt.date(c.date_to) })}
      />

      {promo && (
        <section className="sheet flex flex-wrap items-center gap-3 px-4 py-3" data-testid="campaign-sale">
          <span className={promoLive ? "chip-hazard" : "chip-muted"}>{t("market.campaigns.pastSale", { pct: promo.pct })}</span>
          <span className="min-w-0 flex-1 text-[14px]">
            {promoLive
              ? (promo.date_from === promo.date_to ? t("market.campaigns.sale.ruleDay", { date: fmt.date(promo.date_from) }) : t("market.campaigns.sale.rule", { from: fmt.date(promo.date_from), to: fmt.date(promo.date_to) }))
              : t("market.campaigns.detail.saleOver")}
          </span>
          {promoLive && send && (
            <form action={endPromotion}>
              <input type="hidden" name="id" value={promo.id} />
              <button className="btn-ghost btn-sm min-h-10">{t("market.campaigns.detail.endSale")}</button>
            </form>
          )}
        </section>
      )}

      {/* Where the agency is in sending, and the one button that moves it forward. */}
      <section className="blueprint rounded-[3px] p-5">
        <p className="text-[17px] text-white/85">{rich("market.campaigns.detail.progress", { b: (x) => <b className="font-display text-[28px] text-hazard">{x}</b> }, { sent, total: sendable })}</p>
        <div className="mt-3 h-1.5 w-full bg-white/15" aria-hidden>
          <div className="h-full bg-hazard" style={{ width: `${sendable ? Math.round((sent / sendable) * 100) : 0}%` }} />
        </div>
        {next ? (send ? (
          <div className="mt-4 space-y-2">
            <WaLink href={`/api/wa/${next.id}`} className="btn-hazard min-h-12 w-full text-[16px] sm:w-auto">
              <IWhatsapp className="h-5 w-5" />{t("market.campaigns.detail.next", { name: next.name })}
            </WaLink>
            <p className="text-[13px] text-white/70">{t("market.campaigns.detail.nextNote")}</p>
          </div>
        ) : <p className="mt-4 text-[13px] text-white/70">{t("market.campaigns.detail.viewOnly")}</p>
        ) : <p className="mt-4 font-semibold text-hazard">{t("market.campaigns.detail.allSent")}</p>}
        <div className="mt-5 grid grid-cols-3 gap-px border-t border-white/15 pt-4 text-center">
          {[
            [t("market.campaigns.detail.stats.sent"), sent],
            [t("market.campaigns.detail.stats.viewed"), booked.length + viewed.length],
            [t("market.campaigns.detail.stats.booked"), booked.length],
          ].map(([label, v], i) => (
            <div key={i}>
              <div className={`font-display text-[26px] font-bold leading-none num ${i === 2 ? "text-hazard" : "text-white"}`}>{v}</div>
              <div className="mt-1 text-[12px] text-white/70">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {group(t("market.campaigns.detail.groups.booked"), booked, callBtn, {
        tone: "text-ok",
        note: rich("market.campaigns.detail.groups.bookedNote", { link: (x) => <Link href="/a/requests" className="underline">{x}</Link> }),
      })}
      {group(t("market.campaigns.detail.groups.viewed"), viewed, callBtn, { note: t("market.campaigns.detail.groups.viewedNote") })}
      {group(t("market.campaigns.detail.groups.waiting"), waiting, (r) => sendBtn(r))}
      {group(t("market.campaigns.detail.groups.sent"), sentOnly, (r) => sendBtn(r, true))}
      {group(t("market.campaigns.detail.groups.skipped"), skipped, () => null, {
        status: (r) => r.opted_out ? t("market.campaigns.detail.optedOut") : t("market.campaigns.detail.recent", { date: fmt.date(addDays(r.last_sent_at!.slice(0, 10), 3)) }),
      })}

      <section className="sheet">
        <header className="border-b border-line px-4 py-3"><h2 className="text-[17px] font-bold text-ink">{t("market.campaigns.detail.message")}</h2></header>
        <div className="p-4"><WhatsappBubble stored text={text} link={appUrl("/r/k3m9qa")} footer={(LANGS.find((m) => c.message.includes(m.nameToken))?.offer.optOut) ?? t("market.campaigns.offer.optOut")} /></div>
      </section>
    </div>
  );
}
