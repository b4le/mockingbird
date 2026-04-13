import { getTimeline, getStakeholders, getRisks, getProjectState } from "@/lib/data";
import { getDefaultProject } from "@/lib/projects";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RiskSummary } from "@/components/dashboard/RiskSummary";

export default async function DashboardPage() {
  const project = getDefaultProject();
  const [timeline, stakeholders, risks, projectState] = await Promise.all([
    getTimeline(project),
    getStakeholders(project),
    getRisks(project),
    getProjectState(project),
  ]);

  return (
    <div className="space-y-6">
      <StatusBanner state={projectState} />
      <SummaryCards metrics={projectState.metrics} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity
          events={timeline}
          stakeholders={stakeholders}
        />
        <RiskSummary risks={risks} />
      </div>
    </div>
  );
}
