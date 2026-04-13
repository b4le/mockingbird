import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PRIORITY_ORDER } from "@/lib/constants";
import type { Risk } from "@/types";

export function RiskSummary({ risks }: { risks: Risk[] }) {
  const openRisks = risks
    .filter((r) => r.status === "open")
    .sort((a, b) => {
      return PRIORITY_ORDER[a.severity] - PRIORITY_ORDER[b.severity];
    })
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Top Risks</CardTitle>
          <Link
            href="/actions"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {openRisks.map((risk) => (
          <div key={risk.id} className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{risk.title}</p>
            <PriorityBadge priority={risk.severity} />
          </div>
        ))}
        {openRisks.length === 0 && (
          <EmptyState message="No open risks" />
        )}
      </CardContent>
    </Card>
  );
}
