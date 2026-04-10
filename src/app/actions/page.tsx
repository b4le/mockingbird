import { getAllData } from "@/lib/data";
import { getDefaultProject } from "@/lib/projects";
import { ActionsPageClient } from "@/components/actions/ActionsPageClient";

export default async function ActionsPage() {
  const project = getDefaultProject();
  const data = await getAllData(project);

  return (
    <ActionsPageClient
      actions={data.actions}
      risks={data.risks}
      stakeholders={data.stakeholders}
      conversations={data.conversations}
      claims={data.claims}
    />
  );
}
