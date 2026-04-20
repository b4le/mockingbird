import {
  getActions,
  getClaims,
  getCommunications,
  getConversations,
  getStakeholders,
  getTimeline,
} from "@/lib/data";
import { TimelinePageClient } from "@/components/timeline/TimelinePageClient";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const [timeline, stakeholders, conversations, communications, actions, claims] =
    await Promise.all([
      getTimeline(project),
      getStakeholders(project),
      getConversations(project),
      getCommunications(project),
      getActions(project),
      getClaims(project),
    ]);

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
