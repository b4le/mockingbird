import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjectState } from "@/types";

const cardLinks: Record<string, string> = {
  "Actions Complete": "/actions",
  "Risks Open": "/actions",
  "Days to Launch": "/timeline",
  "Beta Users Active": "/timeline",
};

export function SummaryCards({ metrics }: { metrics: ProjectState["metrics"] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((m) => (
        <Link key={m.label} href={cardLinks[m.label] ?? "/"}>
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-bold">
                {m.value}
                {m.total !== null && (
                  <span className="text-base font-normal text-muted-foreground">
                    /{m.total}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{m.unit}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
