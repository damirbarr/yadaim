import { requireAgency } from "@/lib/auth";
import { getAgency } from "@/lib/queries";
import { SettingsForm } from "@/components/SettingsForm";
import { PageHead } from "@/components/ui";

export const metadata = { title: "הגדרות" };

export default async function Settings() {
  const { agencyId } = await requireAgency("agency.settings.edit");
  const a = (await getAgency(agencyId))!;
  return (
    <div className="max-w-3xl">
      <PageHead title="הגדרות" sub={`היתר ${a.license_no} · ${a.verified ? "מאומת" : "ממתין לאימות"}`} />
      <SettingsForm a={a} />
    </div>
  );
}
