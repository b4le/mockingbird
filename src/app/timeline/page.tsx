import { getAllData } from "@/lib/data";
import { getDefaultProject } from "@/lib/projects";
import { TimelinePageClient } from "@/components/timeline/TimelinePageClient";

export default async function TimelinePage() {
  const project = getDefaultProject();
  const data = await getAllData(project);

  return (
    <TimelinePageClient
      events={data.timeline}
      stakeholders={data.stakeholders}
      conversations={data.conversations}
      actions={data.actions}
      claims={data.claims}
    />
  );
}
