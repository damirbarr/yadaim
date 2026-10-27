import { requireContractor } from "@/lib/auth";
import { TeamPage } from "@/components/TeamPage";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("team.titleContractor") };
}

export default async function ContractorTeam() {
  const { user, contractorId } = await requireContractor("contractor.team.manage");
  return <TeamPage kind="contractor" orgId={contractorId} me={user} />;
}
