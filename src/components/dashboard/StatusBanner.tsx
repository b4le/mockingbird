import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectState } from "@/types";

export function StatusBanner({ state }: { state: ProjectState }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{state.projectName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {state.statusMessage}
            </p>
          </div>
          <StatusBadge type="project" status={state.status} />
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{state.phase}</span>
            <span className="font-medium">{state.phaseProgress}%</span>
          </div>
          <Progress value={state.phaseProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
