import { getProjectBundle } from "@/lib/data";
import { CommunicationsPageClient } from "@/components/communications/CommunicationsPageClient";

export default async function CommunicationsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const {
    communications,
    stakeholders,
    conversations,
    actions,
    claims,
    evidence,
    risks,
  } = await getProjectBundle(project);

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
