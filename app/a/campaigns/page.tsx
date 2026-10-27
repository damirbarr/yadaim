import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all, get } from "@/lib/db";
import { agencyReliability, displayName, getAgency, idleForecast, workerStats, getWorker } from "@/lib/queries";
import { IDLE_DAY_COST, REGIONS } from "@/lib/domain";
import { createCampaign } from "@/app/actions/agency";
import { Avatar, Empty, PageHead } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("market.campaigns.title") };
}

export default async function Campaigns({ searchParams }: { searchParams: Promise<{ trade?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const { t, rich, fmt, intl } = await getI18n();
  const send = can(user, "agency.campaigns.send");
  const sp = await searchParams;
  const a = (await getAgency(agencyId))!;
  const idle = (await idleForecast(agencyId, 10));
  const rel = (await agencyReliability(agencyId));
  const sel = idle.find((i) => i.trade === sp.trade) ?? idle[0];
  const past = (await all(
    `SELECT c.*, COUNT(r.id) AS total, COUNT(r.sent_at) AS sent, COUNT(r.opened_at) AS opened, COUNT(r.booked_at) AS booked
     FROM campaigns c LEFT JOIN campaign_recipients r ON r.campaign_id = c.id WHERE c.agency_id = ? GROUP BY c.id ORDER BY c.id DESC`
  , agencyId)) as { id: number; trade: string; date_from: string; date_to: string; status: string; created_at: string; total: number; sent: number; opened: number; booked: number }[];
  const eligible = ((await get(`SELECT COUNT(*) AS n FROM crm_contacts WHERE agency_id = ? AND opted_out = 0 AND (last_sent_at IS NULL OR last_sent_at <= now_txt(interval '-3 days'))`, agencyId)) as { n: number }).n;
  const token = t("market.campaigns.nameToken");
  let message = "", top: Awaited<ReturnType<typeof getWorker>>[] = [];
  if (sel) {
    const st = (await workerStats(sel.workerIds));
    const rated = sel.workerIds.map((id) => st.get(id)!.rating).filter((x): x is number => x != null);
    const avg = rated.length ? rated.reduce((x, y) => x + y, 0) / rated.length : 0;
    top = await Promise.all(sel.workerIds.sort((x, y) => (st.get(y)!.rating ?? 0) - (st.get(x)!.rating ?? 0)).slice(0, 4).map(getWorker));
    // The offer is written in the sender's language, one natural sentence at a time; trade names read mid-sentence.
    const lower = (s: string) => s.toLocaleLowerCase(intl);
    message = [
      t("market.campaigns.offer.intro", { n: sel.workerCount, name: token, trade: lower(fmt.trade(sel.trade)), trades: lower(fmt.trades(sel.trade)), from: fmt.date(sel.from), to: fmt.date(sel.to) }),
      avg ? t("market.campaigns.offer.docsRated", { avg: fmt.num(avg, 1) }) : t("market.campaigns.offer.docs"),
      a.min_days > 1 ? t("market.campaigns.offer.priceMin", { min: lower(fmt.minDays(a.min_days)) }) : t("market.campaigns.offer.priceOneDay"),
      t("market.campaigns.offer.cta"),
    ].join(" ");
  }
  return (
    <div className="space-y-6">
      <PageHead title={t("market.campaigns.heading")} sub={t("market.campaigns.sub")} />
      {idle.length === 0 ? <Empty title={t("market.campaigns.emptyTitle")}>{t("market.campaigns.emptyBody")}</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {idle.map((i) => (
            <Link key={i.trade} href={`/a/campaigns?trade=${i.trade}`} className={`card p-4 transition hover:border-ink ${sel?.trade === i.trade ? "border-ink ring-2 ring-ink" : ""}`}>
              <div className="text-sm text-muted">{fmt.trades(i.trade)}</div>
              <div className="font-display text-3xl font-bold num">{i.idleDays}</div>
              <div className="text-xs text-muted">{t("market.campaigns.idleDays", { n: i.idleDays })} · {t("market.campaigns.workers", { n: i.workerCount })}</div>
              <div className="mt-1 text-xs text-bad">{rich("market.campaigns.cost", { num: (c) => <span className="num">{c}</span> }, { cost: fmt.money(i.idleDays * IDLE_DAY_COST) })}</div>
            </Link>
          ))}
        </div>
      )}

      {sel && send && (
        <form action={createCampaign} className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <input type="hidden" name="trade" value={sel.trade} />
          <input type="hidden" name="from" value={sel.from} />
          <input type="hidden" name="to" value={sel.to} />
          <input type="hidden" name="idle" value={sel.idleDays} />
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[20px] font-bold text-ink">{t("market.campaigns.ready", { trades: fmt.trades(sel.trade) })}</h2>
              {a.auto_campaign ? <span className="chip-hazard">{t("market.campaigns.autoOn")}</span> : null}
            </div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-[3px] bg-paper p-3"><dt className="text-xs text-muted">{t("market.campaigns.what")}</dt><dd className="font-semibold">{t("market.campaigns.workers", { n: sel.workerCount })} · {t("market.campaigns.days", { n: sel.idleDays })}</dd><dd className="num text-xs text-muted">{fmt.date(sel.from)}–{fmt.date(sel.to)}</dd></div>
              <div className="rounded-[3px] bg-paper p-3"><dt className="text-xs text-muted">{t("market.campaigns.who")}</dt><dd className="font-semibold">{t("market.campaigns.contractorsN", { n: eligible })}</dd><dd className="text-xs text-muted">{t("market.campaigns.whoNote")}</dd></div>
              <div className="rounded-[3px] bg-paper p-3"><dt className="text-xs text-muted">{t("market.campaigns.channel")}</dt><dd className="font-semibold">{t("market.campaigns.whatsapp")}</dd><dd className="text-xs text-ok">✓ {t("market.campaigns.personalLink")}</dd></div>
            </dl>
            <div>
              <label className="label">{t("market.campaigns.messageLabel", { token })}</label>
              <textarea name="message" rows={4} className="input" defaultValue={message} />
            </div>
            <fieldset>
              <legend className="label">{t("market.campaigns.regions")}</legend>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <label key={r.key} className="chip-muted cursor-pointer px-3 py-1.5 has-[:checked]:bg-ink has-[:checked]:text-white">
                    <input type="checkbox" name="regions" value={r.key} defaultChecked={a.regions.split(",").includes(r.key)} className="sr-only" />{fmt.region(r.key)}
                  </label>
                ))}
              </div>
            </fieldset>
            <ul className="space-y-1 text-xs text-muted">
              <li>✓ {t("market.campaigns.rules.approval")}</li>
              <li>✓ {t("market.campaigns.rules.cap")}</li>
              <li>✓ {t("market.campaigns.rules.optOut")}</li>
            </ul>
            <button className="btn-hazard px-6">{t("market.campaigns.submit")}</button>
          </div>
          <aside className="card h-fit bg-[#e7ddd0] p-4">
            <div className="mb-2 text-xs text-muted">{t("market.campaigns.preview")}</div>
            <div className="rounded-[3px] rounded-ss-sm bg-white p-3 text-sm shadow-sm">
              <p>{message.replace(token, t("market.campaigns.sampleName"))}</p>
              <div className="mt-2 overflow-hidden rounded-[3px] border border-line">
                <div className="flex gap-1 bg-paper p-2">{top.map((w) => w && <div key={w.id} className="text-center text-[10px]"><Avatar w={w} size={48} /><div>{displayName(w)}</div></div>)}</div>
                <div className="p-2 text-xs"><b>{a.name}</b><div className="text-muted">{t("market.campaigns.previewCard", { score: rel.score, trades: fmt.trades(sel.trade) })}</div></div>
              </div>
              <div className="mt-2 text-xs text-info underline">{t("market.campaigns.previewLink")} <span className="inline-block flip-ltr">←</span></div>
            </div>
          </aside>
        </form>
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[20px] font-bold text-ink">{t("market.campaigns.past")}</h2>
          <div className="card overflow-x-auto">
            <table className="tbl min-w-[560px]">
              <thead><tr><th>{t("market.campaigns.cols.date")}</th><th>{t("market.campaigns.cols.trade")}</th><th>{t("market.campaigns.cols.range")}</th><th>{t("market.campaigns.cols.sent")}</th><th>{t("market.campaigns.cols.opened")}</th><th>{t("market.campaigns.cols.booked")}</th><th /></tr></thead>
              <tbody>
                {past.map((c) => (
                  <tr key={c.id}>
                    <td className="num">{fmt.date(c.created_at.slice(0, 10))}</td>
                    <td>{fmt.trades(c.trade)}</td>
                    <td className="num text-muted">{fmt.date(c.date_from)}–{fmt.date(c.date_to)}</td>
                    <td className="num">{c.sent}/{c.total}</td>
                    <td className="num">{c.opened}</td>
                    <td>{c.booked ? <span className="chip-ok num">{c.booked}</span> : <span className="num">0</span>}</td>
                    <td><Link href={`/a/campaigns/${c.id}`} className="text-xs underline">{t("market.campaigns.open")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
