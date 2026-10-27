import { notFound } from "next/navigation";
import { requireAgency } from "@/lib/auth";
import { all } from "@/lib/db";
import { getCrew } from "@/lib/crews";
import { displayName, type Worker } from "@/lib/queries";
import { getI18n } from "@/lib/i18n/server";
import { dissolveCrew } from "@/app/actions/crews";
import { PageHead } from "@/components/ui";
import { CrewForm } from "../CrewForm";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("crews.editTitle") };
}

export default async function EditCrew({ params }: { params: Promise<{ id: string }> }) {
  const { agencyId } = await requireAgency("agency.workers.edit");
  const { t } = await getI18n();
  const crew = await getCrew(agencyId, Number((await params).id));
  if (!crew) notFound();
  const pool = await all<Worker>(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND (crew_id IS NULL OR crew_id = ?) ORDER BY trade, first_name`, agencyId, crew.id);
  return (
    <div className="space-y-5">
      <PageHead back="/a/crews" eyebrow={t("crews.editTitle")} title={crew.name} sub={t("crews.editSub")} />
      <CrewForm
        crew={{ id: crew.id, name: crew.name, leader: crew.leader_worker_id, members: crew.members.map((m) => m.id) }}
        cands={pool.map((w) => ({ id: w.id, name: displayName(w), trade: w.trade, years: w.years, photo: w.photo, country: w.country }))}
      />
      <form action={dissolveCrew} className="sheet flex flex-wrap items-center justify-between gap-3 p-4">
        <input type="hidden" name="id" value={crew.id} />
        <p className="text-sm text-muted">{t("crews.dissolveHint")}</p>
        <button className="btn-ghost btn-sm text-bad">{t("crews.dissolve")}</button>
      </form>
    </div>
  );
}
