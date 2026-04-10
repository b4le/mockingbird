import { getAllData } from "@/lib/data";
import { getDefaultProject } from "@/lib/projects";
import { EvidencePageClient } from "@/components/evidence/EvidencePageClient";

export default async function EvidencePage() {
  const project = getDefaultProject();
  const data = await getAllData(project);

  return (
    <EvidencePageClient
      claims={data.claims}
      evidence={data.evidence}
      stakeholders={data.stakeholders}
    />
  );
}
