import {
  getActions,
  getClaims,
  getCommunications,
  getConversations,
  getRisks,
  getStakeholders,
} from "@/lib/data";
import { ActionsPageClient } from "@/components/actions/ActionsPageClient";

export default async function ActionsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const [actions, risks, stakeholders, conversations, communications, claims] =
    await Promise.all([
      getActions(project),
      getRisks(project),
      getStakeholders(project),
      getConversations(project),
      getCommunications(project),
      getClaims(project),
    ]);

  return (
    <ActionsPageClient
      actions={actions}
      risks={risks}
      stakeholders={stakeholders}
      conversations={conversations}
      communications={communications}
      claims={claims}
    />
  );
}
