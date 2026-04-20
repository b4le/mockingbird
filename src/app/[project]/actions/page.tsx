import { getProjectBundle } from "@/lib/data";
import { ActionsPageClient } from "@/components/actions/ActionsPageClient";

export default async function ActionsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const { actions, risks, stakeholders, conversations, communications, claims } =
    await getProjectBundle(project);

  return (
    <ActionsPageClient
      actions={actions}
      risks={risks}
      stakeholders={stakeholders}
      conversations={conversations}
      communications={communications}
      claims={claims}
    />
  );
}
