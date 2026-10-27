import { requireAgency } from "@/lib/auth";
import { WorkerForm } from "@/components/WorkerForm";
import { PageHead } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("agency.worker.newTitle") };
}

export default async function NewWorker() {
  await requireAgency("agency.workers.edit");
  const { t } = await getI18n();
  return (
    <div>
      <PageHead back="/a/workers" title={t("agency.worker.newTitle")} sub={t("agency.worker.newSub")} />
      <WorkerForm />
    </div>
  );
}
