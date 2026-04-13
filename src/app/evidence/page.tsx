import { getClaims, getEvidence, getStakeholders } from "@/lib/data";
import { getDefaultProject } from "@/lib/projects";
import { EvidencePageClient } from "@/components/evidence/EvidencePageClient";

export default async function EvidencePage() {
  const project = getDefaultProject();
  const [claims, evidence, stakeholders] = await Promise.all([
    getClaims(project),
    getEvidence(project),
    getStakeholders(project),
  ]);

  return (
    <EvidencePageClient
      claims={claims}
      evidence={evidence}
      stakeholders={stakeholders}
    />
  );
}
