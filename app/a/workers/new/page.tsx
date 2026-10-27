import { requireAgency } from "@/lib/auth";
import { WorkerForm } from "@/components/WorkerForm";
import { PageHead } from "@/components/ui";

export const metadata = { title: "עובד חדש" };

export default async function NewWorker() {
  await requireAgency("agency.workers.edit");
  return (
    <div>
      <PageHead back="/a/workers" title="עובד חדש" sub="פרופיל אחד — ממנו נבנה הכרטיס שהקבלן רואה, ההתראות על תוקף והדף האישי של העובד." />
      <WorkerForm />
    </div>
  );
}
