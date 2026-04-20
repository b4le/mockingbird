import { getProjectBundle } from "@/lib/data";
import { EvidencePageClient } from "@/components/evidence/EvidencePageClient";

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const { claims, evidence, stakeholders } = await getProjectBundle(project);

  return (
    <EvidencePageClient
      claims={claims}
      evidence={evidence}
      stakeholders={stakeholders}
    />
  );
}
