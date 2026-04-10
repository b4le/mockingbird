import { getAllData } from "@/lib/data";
import { getDefaultProject } from "@/lib/projects";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RiskSummary } from "@/components/dashboard/RiskSummary";

export default async function DashboardPage() {
  const project = getDefaultProject();
  const data = await getAllData(project);

  return (
    <div className="space-y-6">
      <StatusBanner state={data.projectState} />
      <SummaryCards metrics={data.projectState.metrics} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity
          events={data.timeline}
          stakeholders={data.stakeholders}
        />
        <RiskSummary risks={data.risks} />
      </div>
    </div>
  );
}
