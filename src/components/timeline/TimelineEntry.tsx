"use client";

import { useState } from "react";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import type { TimelineEvent, Stakeholder, Conversation } from "@/types";

const typeIcons: Record<string, string> = {
  conversation: "💬",
  decision: "⚖️",
  milestone: "🎯",
  document: "📄",
  action: "✅",
  "risk-change": "⚠️",
};

interface TimelineEntryProps {
  event: TimelineEvent;
  stakeholders: Stakeholder[];
  conversations: Conversation[];
  onStakeholderClick: (s: Stakeholder) => void;
}

export function TimelineEntry({
  event,
  stakeholders,
  conversations,
  onStakeholderClick,
}: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const stakeholderMap = new Map(stakeholders.map((s) => [s.id, s]));
  const isConversation = event.type === "conversation" && event.linkedEntityId;
  const linkedConversation = isConversation
    ? conversations.find((c) => c.id === event.linkedEntityId)
    : null;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="mt-0.5 text-base">{typeIcons[event.type] ?? "📌"}</span>
        <div className="flex-1 w-px bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <div
          className={`${isConversation ? "cursor-pointer" : ""}`}
          onClick={() => isConversation && setExpanded(!expanded)}
        >
          <p className="text-sm font-medium leading-tight">{event.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <DateDisplay date={event.date} />
          <div className="flex -space-x-1">
            {event.stakeholderIds.slice(0, 3).map((id) => {
              const s = stakeholderMap.get(id);
              return s ? (
                <StakeholderAvatar
                  key={id}
                  stakeholder={s}
                  size="sm"
                  onClick={() => onStakeholderClick(s)}
                />
              ) : null;
            })}
            {event.stakeholderIds.length > 3 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                +{event.stakeholderIds.length - 3}
              </span>
            )}
          </div>
        </div>
        {expanded && linkedConversation && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm">
            {linkedConversation.keyPoints.length > 0 && (
              <div className="mb-2">
                <p className="font-medium">Key Points</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  {linkedConversation.keyPoints.map((kp, i) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              </div>
            )}
            {linkedConversation.decisions.length > 0 && (
              <div>
                <p className="font-medium">Decisions</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  {linkedConversation.decisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
