import { requireAgency } from "@/lib/auth";
import { getAgency } from "@/lib/queries";
import { SettingsForm } from "@/components/SettingsForm";
import { PageHead } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("market.settings.title") };
}

export default async function Settings() {
  const { agencyId } = await requireAgency("agency.settings.edit");
  const { t } = await getI18n();
  const a = (await getAgency(agencyId))!;
  return (
    <div className="max-w-3xl">
      <PageHead title={t("market.settings.title")} sub={t("market.settings.sub", { license: a.license_no, status: t(a.verified ? "market.settings.verified" : "market.settings.pending") })} />
      <SettingsForm a={a} />
    </div>
  );
}
