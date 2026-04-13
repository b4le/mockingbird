"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TimelineEventType, Stakeholder } from "@/types";

const EVENT_TYPES: TimelineEventType[] = [
  "conversation",
  "decision",
  "milestone",
  "document",
  "action",
  "risk-change",
];

interface TimelineFiltersProps {
  stakeholders: Stakeholder[];
  selectedTypes: Set<TimelineEventType>;
  selectedStakeholder: string | null;
  onTypesChange: (types: Set<TimelineEventType>) => void;
  onStakeholderChange: (id: string | null) => void;
}

export function TimelineFilters({
  stakeholders,
  selectedTypes,
  selectedStakeholder,
  onTypesChange,
  onStakeholderChange,
}: TimelineFiltersProps) {
  const [open, setOpen] = useState(false);

  function toggleType(type: TimelineEventType) {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    onTypesChange(next);
  }

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
            Event Type
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by event type">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={selectedTypes.has(type)}
                onClick={() => toggleType(type)}
              >
                <Badge
                  variant={selectedTypes.has(type) ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {type}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Stakeholder
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by stakeholder">
            <button
              type="button"
              aria-pressed={selectedStakeholder === null}
              onClick={() => onStakeholderChange(null)}
            >
              <Badge
                variant={selectedStakeholder === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {stakeholders.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={selectedStakeholder === s.id}
                onClick={() =>
                  onStakeholderChange(
                    selectedStakeholder === s.id ? null : s.id
                  )
                }
              >
                <Badge
                  variant={selectedStakeholder === s.id ? "default" : "outline"}
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
