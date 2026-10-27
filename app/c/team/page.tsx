import { requireContractor } from "@/lib/auth";
import { TeamPage } from "@/components/TeamPage";

export const metadata = { title: "צוות" };

export default async function ContractorTeam() {
  const { user, contractorId } = await requireContractor("contractor.team.manage");
  return <TeamPage kind="contractor" orgId={contractorId} me={user} />;
}
