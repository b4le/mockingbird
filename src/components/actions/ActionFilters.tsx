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
        aria-expanded={open}
        aria-controls="action-filters"
        className="md:hidden"
      >
        {open ? "Hide Filters" : "Filters"}
      </Button>
      <div id="action-filters" className={`space-y-3 ${open ? "block" : "hidden md:block"}`}>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedStatus === null}
              onClick={() => onStatusChange(null)}
            >
              <Badge
                variant={selectedStatus === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={selectedStatus === s}
                onClick={() =>
                  onStatusChange(selectedStatus === s ? null : s)
                }
              >
                <Badge
                  variant={selectedStatus === s ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {s}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Priority
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by priority">
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedPriority === null}
              onClick={() => onPriorityChange(null)}
            >
              <Badge
                variant={selectedPriority === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={selectedPriority === p}
                onClick={() =>
                  onPriorityChange(selectedPriority === p ? null : p)
                }
              >
                <Badge
                  variant={selectedPriority === p ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {p}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Owner
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by owner">
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedOwner === null}
              onClick={() => onOwnerChange(null)}
            >
              <Badge
                variant={selectedOwner === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {stakeholders.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={selectedOwner === s.id}
                onClick={() =>
                  onOwnerChange(selectedOwner === s.id ? null : s.id)
                }
              >
                <Badge
                  variant={selectedOwner === s.id ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {s.name.split(" ")[0]}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
