import { requireAgency } from "@/lib/auth";
import { TeamPage } from "@/components/TeamPage";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("team.titleAgency") };
}

export default async function AgencyTeam() {
  const { user, agencyId } = await requireAgency("agency.team.manage");
  return <TeamPage kind="agency" orgId={agencyId} me={user} />;
}
