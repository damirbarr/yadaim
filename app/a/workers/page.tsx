import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all } from "@/lib/db";
import { busyWorkers, displayName, docCheck, docsFor, workerStats } from "@/lib/queries";
import { diffDays, DOC_TYPES, todayISO, trade, TRADES } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { crewNames, type CrewWorker } from "@/lib/crews";
import { importWorkers } from "@/app/actions/agency";
import { ImportForm } from "@/components/ImportForm";
import { Avatar, Notice, PageHead, Rating } from "@/components/ui";
import { IPlus } from "@/components/icons";
import { Availability } from "@/components/Availability";
import { workerAvailability } from "@/lib/calendar";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("agency.workersPage.title") };
}

export default async function Workers({ searchParams }: { searchParams: Promise<{ trade?: string; show?: string; welcome?: string; crew?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const edit = can(user, "agency.workers.edit");
  const sp = await searchParams;
  const { t, fmt } = await getI18n();
  const today = todayISO();
  const everyone = await all<CrewWorker>(`SELECT * FROM workers WHERE agency_id = ? ORDER BY active DESC, trade, first_name`, agencyId);
  const crews = await crewNames(agencyId);
  const crewFilter = Number(sp.crew) || 0;
  const list = everyone.filter((w) => (sp.show === "inactive" ? !w.active : w.active) && (!sp.trade || w.trade === sp.trade) && (!crewFilter || w.crew_id === crewFilter));
  const docs = (await docsFor(list.map((w) => w.id)));
  const stats = (await workerStats(list.map((w) => w.id)));
  const busyToday = (await busyWorkers(today, today));
  const avail = await workerAvailability(list.map((w) => w.id), today);
  const needsAttention = list.filter((w) => !docCheck(docs.get(w.id)!, w.trade, today).ok).length;
  return (
    <div className="space-y-5">
      <PageHead title={t("agency.workersPage.title")} sub={`${t("agency.workersPage.active", { n: everyone.filter((w) => w.active).length })} · ${t("agency.workersPage.attention", { n: needsAttention })}`}>
        {edit && <Link href="/a/workers/new" className="btn-primary"><IPlus className="h-4 w-4" />{t("agency.workersPage.add")}</Link>}
      </PageHead>
      {sp.welcome && <Notice tone="ok">{t("agency.workersPage.welcome")}</Notice>}
      {edit && <ImportForm action={importWorkers} title={t("agency.workersPage.importTitle")} hint={t("agency.workersPage.importHint")} templates={[{ label: t("agency.workersPage.template"), href: "/templates/workers.xlsx" }]} />}
      <div className="flex flex-wrap gap-1.5">
        <Link href="/a/workers" className={!sp.trade && sp.show !== "inactive" && !crewFilter ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{t("agency.workersPage.all")}</Link>
        {TRADES.map((tr) => <Link key={tr.key} href={`/a/workers?trade=${tr.key}`} className={sp.trade === tr.key ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{t("agency.workersPage.tradeChip", { trades: fmt.trades(tr.key), n: everyone.filter((w) => w.active && w.trade === tr.key).length })}</Link>)}
        <Link href="/a/workers?show=inactive" className={sp.show === "inactive" ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{t("agency.workersPage.inactive")}</Link>
        {crewFilter > 0 && crews.has(crewFilter) && <Link href="/a/workers" className="chip-hazard px-3 py-1.5">{t("crews.workers.filtered", { name: crews.get(crewFilter)! })} ✕</Link>}
        <Link href="/a/crews" className="chip-muted border border-dashed border-ink/30 px-3 py-1.5" data-testid="workers-crews-link">{t("crews.workers.link", { n: crews.size })}</Link>
      </div>
      {/* Phone: one row per worker with a single documents status. The full grid needs a wide screen. */}
      <div className="card divide-y divide-dashed divide-line sm:hidden">
        {list.map((w) => {
          const check = docCheck(docs.get(w.id)!, w.trade, today);
          return (
            <Link key={w.id} href={`/a/workers/${w.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-paper">
              <Avatar w={w} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 font-semibold">{displayName(w)}{w.crew_id && crews.has(w.crew_id) && <span className="chip-info max-w-[9rem] truncate font-normal">{crews.get(w.crew_id)}</span>}</div>
                <div className="truncate text-xs text-muted">{fmt.trade(w.trade)} · {t("agency.years", { n: w.years })} · {fmt.country(w.country)}</div>
                <Availability a={avail.get(w.id)} className="mt-1" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {check.ok ? <span className="chip-ok">{t("agency.workersPage.docsOk")}</span> : <span className="chip-bad">{t("agency.workersPage.docsMissing")}</span>}
                {busyToday.has(w.id) ? <span className="chip-ok">{t("agency.workersPage.onSite")}</span> : <span className="chip-muted">{t("agency.workersPage.free")}</span>}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="card hidden overflow-x-auto sm:block">
        <table className="tbl min-w-[860px]">
          <thead><tr><th>{t("agency.workersPage.colWorker")}</th><th>{t("agency.workersPage.colTrade")}</th><th>{t("agency.workersPage.colYears")}</th><th>{t("agency.workersPage.colCountry")}</th>{DOC_TYPES.filter((d) => d.key !== "passport").map((d) => <th key={d.key}>{fmt.docShort(d.key)}</th>)}<th>{t("calendar.availability.title")}</th><th>{t("agency.workersPage.colRating")}</th><th>{t("agency.workersPage.colToday")}</th></tr></thead>
          <tbody>
            {list.map((w) => {
              const ds = docs.get(w.id)!;
              return (
                <tr key={w.id} className="hover:bg-paper">
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/a/workers/${w.id}`} className="flex items-center gap-2 font-medium hover:underline"><Avatar w={w} size={30} />{displayName(w)}</Link>
                      {w.crew_id && crews.has(w.crew_id) && <Link href={`/a/workers?crew=${w.crew_id}`} className="chip-info max-w-[10rem] truncate hover:underline" title={t("crews.workers.chipTitle")}>{crews.get(w.crew_id)}</Link>}
                    </div>
                  </td>
                  <td>{fmt.trade(w.trade)}</td>
                  <td className="num">{w.years}</td>
                  <td className="text-muted">{fmt.country(w.country)}</td>
                  {DOC_TYPES.filter((d) => d.key !== "passport").map((d) => {
                    const doc = ds.find((x) => x.type === d.key && x.status === "verified");
                    const needed = d.key !== "heights" || trade(w.trade).heights;
                    if (!doc) return <td key={d.key}>{needed ? <span className="chip-bad">{t("agency.workersPage.missing")}</span> : <span className="text-muted">-</span>}</td>;
                    const left = doc.expires ? diffDays(today, doc.expires) : 999;
                    return <td key={d.key}>{left < 0 ? <span className="chip-bad">{t("agency.workersPage.expired")}</span> : left <= 14 ? <span className="chip-warn">! {t("agency.workersPage.daysLeft", { n: left })}</span> : left <= 60 ? <span className="chip-info">{t("agency.workersPage.daysLeft", { n: left })}</span> : <span className="chip-ok">✓</span>}</td>;
                  })}
                  <td><Availability a={avail.get(w.id)} /></td>
                  <td><Rating value={stats.get(w.id)!.rating} /></td>
                  <td>{busyToday.has(w.id) ? <span className="chip-ok">{t("agency.workersPage.onSite")}</span> : <span className="chip-muted">{t("agency.workersPage.free")}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
