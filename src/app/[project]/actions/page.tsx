import { getActions, getRisks, getStakeholders, getConversations, getClaims } from "@/lib/data";
import { ActionsPageClient } from "@/components/actions/ActionsPageClient";

export default async function ActionsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const [actions, risks, stakeholders, conversations, claims] = await Promise.all([
    getActions(project),
    getRisks(project),
    getStakeholders(project),
    getConversations(project),
    getClaims(project),
  ]);

  return (
    <ActionsPageClient
      actions={actions}
      risks={risks}
      stakeholders={stakeholders}
      conversations={conversations}
      claims={claims}
    />
  );
}
