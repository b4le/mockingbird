"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import type { Risk, ActionItem } from "@/types";

interface RiskRegisterProps {
  risks: Risk[];
  actions: ActionItem[];
}

export function RiskRegister({ risks, actions }: RiskRegisterProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const actionMap = new Map(actions.map((a) => [a.id, a]));

  return (
    <div className="space-y-3">
      {risks.map((risk) => {
        const expanded = expandedId === risk.id;
        const linkedActions = risk.actionIds
          .map((id) => actionMap.get(id))
          .filter(Boolean) as ActionItem[];

        return (
          <Card
            key={risk.id}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            className="cursor-pointer"
            onClick={() => setExpandedId(expanded ? null : risk.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpandedId(expanded ? null : risk.id);
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{risk.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={risk.severity} />
                    <StatusBadge type="risk" status={risk.status} />
                    <span className="text-xs text-muted-foreground">
                      Likelihood: {risk.likelihood}
                    </span>
                  </div>
                </div>
              </div>
              {expanded && (
                <div className="mt-3 space-y-3 border-t pt-3 text-sm">
                  <p className="text-muted-foreground">{risk.description}</p>
                  <div>
                    <p className="font-medium">Mitigation Plan</p>
                    <p className="mt-1 text-muted-foreground">
                      {risk.mitigationPlan}
                    </p>
                  </div>
                  {linkedActions.length > 0 && (
                    <div>
                      <p className="font-medium">
                        Linked Actions ({linkedActions.length})
                      </p>
                      <ul className="mt-1 space-y-1">
                        {linkedActions.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-2 text-muted-foreground"
                          >
                            <StatusBadge type="action" status={a.status} />
                            <span>{a.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated: <DateDisplay date={risk.updatedDate} />
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {risks.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No risks registered
        </p>
      )}
    </div>
  );
}
