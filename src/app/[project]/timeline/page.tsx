import { getProjectBundle } from "@/lib/data";
import { TimelinePageClient } from "@/components/timeline/TimelinePageClient";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const { timeline, stakeholders, conversations, communications, actions, claims } =
    await getProjectBundle(project);

  return (
    <TimelinePageClient
      events={timeline}
      stakeholders={stakeholders}
      conversations={conversations}
      communications={communications}
      actions={actions}
      claims={claims}
    />
  );
}
