import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all, get, insert, run, tx } from "@/lib/db";
import { busyWorkers, displayName, docCheck, docsFor, workerStats, type Worker } from "@/lib/queries";
import { countryLabel, diffDays, DOC_TYPES, todayISO, trade, TRADES } from "@/lib/domain";
import { importWorkers } from "@/app/actions/agency";
import { ImportForm } from "@/components/ImportForm";
import { Avatar, Notice, PageHead, Rating } from "@/components/ui";
import { IPlus } from "@/components/icons";

export const metadata = { title: "העובדים שלי" };

export default async function Workers({ searchParams }: { searchParams: Promise<{ trade?: string; show?: string; welcome?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const edit = can(user, "agency.workers.edit");
  const sp = await searchParams;
  const today = todayISO();
  const everyone = await all<Worker>(`SELECT * FROM workers WHERE agency_id = ? ORDER BY active DESC, trade, first_name`, agencyId);
  const list = everyone.filter((w) => (sp.show === "inactive" ? !w.active : w.active) && (!sp.trade || w.trade === sp.trade));
  const docs = (await docsFor(list.map((w) => w.id)));
  const stats = (await workerStats(list.map((w) => w.id)));
  const busyToday = (await busyWorkers(today, today));
  const needsAttention = list.filter((w) => !docCheck(docs.get(w.id)!, w.trade, today).ok).length;
  return (
    <div className="space-y-5">
      <PageHead title="העובדים שלי" sub={`${everyone.filter((w) => w.active).length} עובדים פעילים · ${needsAttention} דורשים טיפול באישורים`}>
        {edit && <Link href="/a/workers/new" className="btn-primary"><IPlus className="h-4 w-4" />הוספת עובד</Link>}
      </PageHead>
      {sp.welcome && <Notice tone="ok">ברוכים הבאים! הצעד הראשון: העלו את קובץ האקסל של העובדים — המערכת תבנה פרופיל לכל עובד עם תאריכי התוקף. אפשר להתחיל מהתבנית.</Notice>}
      {edit && <ImportForm action={importWorkers} title="העלו קובץ אקסל של העובדים" hint="המערכת מזהה שמות, מקצועות, ארץ ותאריכי תוקף (אשרה, ביטוח, בטיחות, גובה) ובונה פרופיל לכל עובד." templates={[{ label: "הורדת תבנית אקסל", href: "/templates/workers.xlsx" }]} />}
      <div className="flex flex-wrap gap-1.5">
        <Link href="/a/workers" className={!sp.trade && sp.show !== "inactive" ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>הכול</Link>
        {TRADES.map((t) => <Link key={t.key} href={`/a/workers?trade=${t.key}`} className={sp.trade === t.key ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{t.plural} · {everyone.filter((w) => w.active && w.trade === t.key).length}</Link>)}
        <Link href="/a/workers?show=inactive" className={sp.show === "inactive" ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>לא פעילים</Link>
      </div>
      {/* Phone: one row per worker with a single documents status; the full grid needs a wide screen. */}
      <div className="card divide-y divide-dashed divide-line sm:hidden">
        {list.map((w) => {
          const check = docCheck(docs.get(w.id)!, w.trade, today);
          return (
            <Link key={w.id} href={`/a/workers/${w.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-paper">
              <Avatar w={w} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{displayName(w)}</div>
                <div className="truncate text-xs text-muted">{trade(w.trade).label} · {w.years} שנים · {countryLabel(w.country)}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {check.ok ? <span className="chip-ok">✓ אישורים</span> : <span className="chip-bad">חסר אישור</span>}
                {busyToday.has(w.id) ? <span className="chip-ok">באתר</span> : <span className="chip-muted">פנוי</span>}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="card hidden overflow-x-auto sm:block">
        <table className="tbl min-w-[860px]">
          <thead><tr><th>עובד</th><th>מקצוע</th><th>ותק</th><th>ארץ</th>{DOC_TYPES.filter((d) => d.key !== "passport").map((d) => <th key={d.key}>{d.short}</th>)}<th>דירוג</th><th>היום</th></tr></thead>
          <tbody>
            {list.map((w) => {
              const ds = docs.get(w.id)!;
              return (
                <tr key={w.id} className="hover:bg-paper">
                  <td><Link href={`/a/workers/${w.id}`} className="flex items-center gap-2 font-medium hover:underline"><Avatar w={w} size={30} />{displayName(w)}</Link></td>
                  <td>{trade(w.trade).label}</td>
                  <td className="num">{w.years}</td>
                  <td className="text-muted">{countryLabel(w.country)}</td>
                  {DOC_TYPES.filter((d) => d.key !== "passport").map((d) => {
                    const doc = ds.find((x) => x.type === d.key && x.status === "verified");
                    const needed = d.key !== "heights" || trade(w.trade).heights;
                    if (!doc) return <td key={d.key}>{needed ? <span className="chip-bad">חסר</span> : <span className="text-muted">—</span>}</td>;
                    const left = doc.expires ? diffDays(today, doc.expires) : 999;
                    return <td key={d.key}>{left < 0 ? <span className="chip-bad">✕ פג</span> : left <= 14 ? <span className="chip-warn">! {left} י׳</span> : left <= 60 ? <span className="chip-info">{left} י׳</span> : <span className="chip-ok">✓</span>}</td>;
                  })}
                  <td><Rating value={stats.get(w.id)!.rating} /></td>
                  <td>{busyToday.has(w.id) ? <span className="chip-ok">באתר</span> : <span className="chip-muted">פנוי</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
