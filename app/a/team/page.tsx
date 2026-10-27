import { requireAgency } from "@/lib/auth";
import { TeamPage } from "@/components/TeamPage";

export const metadata = { title: "צוות והרשאות" };

export default async function AgencyTeam() {
  const { user, agencyId } = await requireAgency("agency.team.manage");
  return <TeamPage kind="agency" orgId={agencyId} me={user} />;
}
