import { getProjectBundle } from "@/lib/data";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RiskSummary } from "@/components/dashboard/RiskSummary";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const { timeline, stakeholders, risks, state } =
    await getProjectBundle(project);

  return (
    <div className="space-y-6">
      <StatusBanner state={state} />
      <SummaryCards metrics={state.metrics} project={project} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity events={timeline} stakeholders={stakeholders} />
        <RiskSummary risks={risks} project={project} />
      </div>
    </div>
  );
}
