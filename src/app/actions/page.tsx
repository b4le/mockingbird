import { getActions, getRisks, getStakeholders, getConversations, getClaims } from "@/lib/data";
import { getDefaultProject } from "@/lib/projects";
import { ActionsPageClient } from "@/components/actions/ActionsPageClient";

export default async function ActionsPage() {
  const project = getDefaultProject();
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
