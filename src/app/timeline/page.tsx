import { getTimeline, getStakeholders, getConversations, getActions, getClaims } from "@/lib/data";
import { getDefaultProject } from "@/lib/projects";
import { TimelinePageClient } from "@/components/timeline/TimelinePageClient";

export default async function TimelinePage() {
  const project = getDefaultProject();
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
