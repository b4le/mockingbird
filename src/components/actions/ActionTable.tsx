"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import type { ActionItem, ActionStatus, Priority, Stakeholder } from "@/types";

type SortKey = "priority" | "dueDate" | "status";

const priorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const statusOrder: Record<ActionStatus, number> = {
  blocked: 0,
  "in-progress": 1,
  todo: 2,
  done: 3,
};

interface ActionTableProps {
  actions: ActionItem[];
  stakeholders: Stakeholder[];
  statusFilter: ActionStatus | null;
  priorityFilter: Priority | null;
  ownerFilter: string | null;
  onStakeholderClick: (s: Stakeholder) => void;
}

function isOverdue(action: ActionItem): boolean {
  if (action.status === "done" || !action.dueDate) return false;
  return new Date(action.dueDate) < new Date();
}

export function ActionTable({
  actions,
  stakeholders,
  statusFilter,
  priorityFilter,
  ownerFilter,
  onStakeholderClick,
}: ActionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const stakeholderMap = new Map(stakeholders.map((s) => [s.id, s]));

  const filtered = useMemo(() => {
    let result = actions;
    if (statusFilter) result = result.filter((a) => a.status === statusFilter);
    if (priorityFilter)
      result = result.filter((a) => a.priority === priorityFilter);
    if (ownerFilter) result = result.filter((a) => a.ownerId === ownerFilter);

    return result.sort((a, b) => {
      switch (sortKey) {
        case "priority":
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case "status":
          return statusOrder[a.status] - statusOrder[b.status];
        case "dueDate": {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return aDate - bDate;
        }
        default:
          return 0;
      }
    });
  }, [actions, statusFilter, priorityFilter, ownerFilter, sortKey]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        Sort by:
        {(["priority", "dueDate", "status"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            aria-pressed={sortKey === key}
            className={`rounded px-2 py-0.5 ${
              sortKey === key
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            {key === "dueDate" ? "due date" : key}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-2 pr-3">Status</th>
              <th scope="col" className="pb-2 pr-3">Title</th>
              <th scope="col" className="pb-2 pr-3">Priority</th>
              <th scope="col" className="pb-2 pr-3">Owner</th>
              <th scope="col" className="pb-2 pr-3">Due</th>
              <th scope="col" className="pb-2">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((action) => {
              const owner = stakeholderMap.get(action.ownerId);
              const overdue = isOverdue(action);
              return (
                <tr
                  key={action.id}
                  className={`border-b ${overdue ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}
                >
                  <td className="py-2 pr-3">
                    <StatusBadge type="action" status={action.status} />
                  </td>
                  <td className="py-2 pr-3 font-medium">{action.title}</td>
                  <td className="py-2 pr-3">
                    <PriorityBadge priority={action.priority} />
                  </td>
                  <td className="py-2 pr-3">
                    {owner && (
                      <div className="flex items-center gap-1.5">
                        <StakeholderAvatar
                          stakeholder={owner}
                          size="sm"
                          onClick={() => onStakeholderClick(owner)}
                        />
                        <span className="text-muted-foreground">
                          {owner.name.split(" ")[0]}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className={`py-2 pr-3 ${overdue ? "font-medium text-red-600 dark:text-red-400" : ""}`}>
                    {action.dueDate ? (
                      <DateDisplay date={action.dueDate} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {action.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((action) => {
          const owner = stakeholderMap.get(action.ownerId);
          const overdue = isOverdue(action);
          return (
            <Card
              key={action.id}
              className={overdue ? "border-red-200 dark:border-red-900/50" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{action.title}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge type="action" status={action.status} />
                  <PriorityBadge priority={action.priority} />
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  {owner && (
                    <div className="flex items-center gap-1.5">
                      <StakeholderAvatar
                        stakeholder={owner}
                        size="sm"
                        onClick={() => onStakeholderClick(owner)}
                      />
                      <span className="text-muted-foreground">
                        {owner.name.split(" ")[0]}
                      </span>
                    </div>
                  )}
                  {action.dueDate && (
                    <span
                      className={
                        overdue
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }
                    >
                      <DateDisplay date={action.dueDate} />
                    </span>
                  )}
                </div>
                {action.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {action.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No actions match the current filters
        </p>
      )}
    </div>
  );
}
