"use client";

import { useState, useMemo } from "react";
import { TimelineFilters } from "./TimelineFilters";
import { TimelineEntry } from "./TimelineEntry";
import { StakeholderDetailDialog } from "@/components/shared/StakeholderDetailDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { parseDate } from "@/lib/dates";
import type {
  TimelineEvent,
  TimelineEventType,
  Stakeholder,
  Conversation,
  ActionItem,
  Claim,
} from "@/types";

interface TimelinePageClientProps {
  events: TimelineEvent[];
  stakeholders: Stakeholder[];
  conversations: Conversation[];
  actions: ActionItem[];
  claims: Claim[];
}

export function TimelinePageClient({
  events,
  stakeholders,
  conversations,
  actions,
  claims,
}: TimelinePageClientProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<TimelineEventType>>(
    new Set()
  );
  const [selectedStakeholder, setSelectedStakeholder] = useState<string | null>(
    null
  );
  const [dialogStakeholder, setDialogStakeholder] =
    useState<Stakeholder | null>(null);

  const filtered = useMemo(() => {
    let result = [...events].sort(
      (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
    );
    if (selectedTypes.size > 0) {
      result = result.filter((e) => selectedTypes.has(e.type));
    }
    if (selectedStakeholder) {
      result = result.filter((e) =>
        e.stakeholderIds.includes(selectedStakeholder)
      );
    }
    return result;
  }, [events, selectedTypes, selectedStakeholder]);

  const grouped = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const event of filtered) {
      const day = event.date.slice(0, 10);
      if (!groups[day]) groups[day] = [];
      groups[day].push(event);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timeline</h1>
      </div>
      <TimelineFilters
        stakeholders={stakeholders}
        selectedTypes={selectedTypes}
        selectedStakeholder={selectedStakeholder}
        onTypesChange={setSelectedTypes}
        onStakeholderChange={setSelectedStakeholder}
      />
      {filtered.length === 0 ? (
        <EmptyState message="No events match the current filters" />
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, dayEvents]) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {parseDate(date).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <div>
                {dayEvents.map((event) => (
                  <TimelineEntry
                    key={event.id}
                    event={event}
                    stakeholders={stakeholders}
                    conversations={conversations}
                    onStakeholderClick={setDialogStakeholder}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <StakeholderDetailDialog
        stakeholder={dialogStakeholder}
        open={!!dialogStakeholder}
        onOpenChange={(open) => !open && setDialogStakeholder(null)}
        conversations={conversations}
        actions={actions}
        claims={claims}
      />
    </div>
  );
}
