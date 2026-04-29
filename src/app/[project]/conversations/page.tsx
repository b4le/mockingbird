import { getProjectBundle } from "@/lib/data";
import { ConversationsPageClient } from "@/components/conversations/ConversationsPageClient";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const {
    conversations,
    stakeholders,
    communications,
    actions,
    claims,
    transcripts,
  } = await getProjectBundle(project);

  return (
    <ConversationsPageClient
      conversations={conversations}
      stakeholders={stakeholders}
      communications={communications}
      actions={actions}
      claims={claims}
      transcripts={transcripts}
    />
  );
}
