import { notFound } from "next/navigation";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { displayName, getWorker, recentJobs, workerDocs, workerStats } from "@/lib/queries";
import { getI18n } from "@/lib/i18n/server";
import { setWorkerActive } from "@/app/actions/agency";
import { WorkerForm } from "@/components/WorkerForm";
import { Avatar, Notice, PageHead, Rating } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { agencyId } = await requireAgency();
  const w = await getWorker(Number((await params).id));
  return { title: w && w.agency_id === agencyId ? `${w.first_name} ${w.last_name}` : undefined };
}

export default async function WorkerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const edit = can(user, "agency.workers.edit");
  const w = (await getWorker(Number((await params).id)));
  if (!w || w.agency_id !== agencyId) notFound();
  const { saved } = await searchParams;
  const { t, fmt } = await getI18n();
  const docs = (await workerDocs(w.id));
  const st = (await workerStats([w.id])).get(w.id)!;
  const jobs = (await recentJobs(w.id, 8));
  return (
    <div className="space-y-5">
      <PageHead back="/a/workers" title={`${w.first_name} ${w.last_name}`} sub={`${fmt.trade(w.trade)} · ${t("agency.years", { n: w.years })}`}>
        {edit && <form action={setWorkerActive}>
          <input type="hidden" name="id" value={w.id} />
          <input type="hidden" name="active" value={w.active ? "0" : "1"} />
          <button className="btn-ghost">{w.active ? t("agency.worker.deactivate") : t("agency.worker.reactivate")}</button>
        </form>}
      </PageHead>
      {saved && <Notice tone="ok">{t("agency.worker.saved")}</Notice>}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <WorkerForm readOnly={!edit} w={w} docs={Object.fromEntries(docs.filter((d) => d.status === "verified").map((d) => [d.type, d]))} />
        <aside className="space-y-4">
          <div className="card space-y-3 p-5">
            <div className="flex items-center gap-3"><Avatar w={w} size={56} /><div><div className="font-bold">{displayName(w)}</div><Rating value={st.rating} count={st.jobs} /></div></div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-[3px] bg-paper p-2"><div className="text-xs text-muted">{t("agency.worker.arrival")}</div><b className="num">{st.arrival != null ? Math.round(st.arrival * 100) + "%" : "-"}</b></div>
              <div className="rounded-[3px] bg-paper p-2"><div className="text-xs text-muted">{t("agency.worker.match")}</div><b className="num">{st.match != null ? Math.round(st.match * 100) + "%" : "-"}</b></div>
            </div>
          </div>
          <div className="card">
            <h3 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{t("agency.worker.recentJobs")}</h3>
            {jobs.length ? jobs.map((j, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-line px-5 py-2 text-xs last:border-0">
                <span className="num text-muted">{fmt.date(j.date)}</span><span className="flex-1">{j.company}</span>{j.rating && <Rating value={j.rating} />}
              </div>
            )) : <p className="p-5 text-sm text-muted">{t("agency.worker.noJobs")}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
