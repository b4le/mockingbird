"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionStatus, Priority, Stakeholder } from "@/types";

const STATUSES: ActionStatus[] = ["todo", "in-progress", "blocked", "done"];
const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

interface ActionFiltersProps {
  stakeholders: Stakeholder[];
  selectedStatus: ActionStatus | null;
  selectedPriority: Priority | null;
  selectedOwner: string | null;
  onStatusChange: (status: ActionStatus | null) => void;
  onPriorityChange: (priority: Priority | null) => void;
  onOwnerChange: (owner: string | null) => void;
}

export function ActionFilters({
  stakeholders,
  selectedStatus,
  selectedPriority,
  selectedOwner,
  onStatusChange,
  onPriorityChange,
  onOwnerChange,
}: ActionFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="md:hidden"
      >
        {open ? "Hide Filters" : "Filters"}
      </Button>
      <div className={`space-y-3 ${open ? "block" : "hidden md:block"}`}>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedStatus === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onStatusChange(null)}
            >
              All
            </Badge>
            {STATUSES.map((s) => (
              <Badge
                key={s}
                variant={selectedStatus === s ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  onStatusChange(selectedStatus === s ? null : s)
                }
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Priority
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedPriority === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onPriorityChange(null)}
            >
              All
            </Badge>
            {PRIORITIES.map((p) => (
              <Badge
                key={p}
                variant={selectedPriority === p ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  onPriorityChange(selectedPriority === p ? null : p)
                }
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Owner
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedOwner === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onOwnerChange(null)}
            >
              All
            </Badge>
            {stakeholders.map((s) => (
              <Badge
                key={s.id}
                variant={selectedOwner === s.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  onOwnerChange(selectedOwner === s.id ? null : s.id)
                }
              >
                {s.name.split(" ")[0]}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
