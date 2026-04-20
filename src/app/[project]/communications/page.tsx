import {
  getActions,
  getClaims,
  getCommunications,
  getConversations,
  getEvidence,
  getRisks,
  getStakeholders,
} from "@/lib/data";
import { CommunicationsPageClient } from "@/components/communications/CommunicationsPageClient";

export default async function CommunicationsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const [
    communications,
    stakeholders,
    conversations,
    actions,
    claims,
    evidence,
    risks,
  ] = await Promise.all([
    getCommunications(project),
    getStakeholders(project),
    getConversations(project),
    getActions(project),
    getClaims(project),
    getEvidence(project),
    getRisks(project),
  ]);

  return (
    <CommunicationsPageClient
      communications={communications}
      stakeholders={stakeholders}
      conversations={conversations}
      actions={actions}
      claims={claims}
      evidence={evidence}
      risks={risks}
    />
  );
}
