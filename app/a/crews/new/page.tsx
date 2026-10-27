import { requireAgency } from "@/lib/auth";
import { all } from "@/lib/db";
import { displayName, type Worker } from "@/lib/queries";
import { getI18n } from "@/lib/i18n/server";
import { PageHead } from "@/components/ui";
import { CrewForm } from "../CrewForm";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("crews.newTitle") };
}

export default async function NewCrew() {
  const { agencyId } = await requireAgency("agency.workers.edit");
  const { t } = await getI18n();
  // Only active workers who aren't already in a crew: a worker belongs to one crew at a time.
  const pool = await all<Worker>(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND crew_id IS NULL ORDER BY trade, first_name`, agencyId);
  return (
    <div>
      <PageHead back="/a/crews" title={t("crews.newTitle")} sub={t("crews.newSub")} />
      <CrewForm cands={pool.map((w) => ({ id: w.id, name: displayName(w), trade: w.trade, years: w.years, photo: w.photo, country: w.country }))} />
    </div>
  );
}
