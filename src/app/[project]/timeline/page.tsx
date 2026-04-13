import { getTimeline, getStakeholders, getConversations, getActions, getClaims } from "@/lib/data";
import { TimelinePageClient } from "@/components/timeline/TimelinePageClient";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const [timeline, stakeholders, conversations, actions, claims] = await Promise.all([
    getTimeline(project),
    getStakeholders(project),
    getConversations(project),
    getActions(project),
    getClaims(project),
  ]);

  return (
    <TimelinePageClient
      events={timeline}
      stakeholders={stakeholders}
      conversations={conversations}
      actions={actions}
      claims={claims}
    />
  );
}
