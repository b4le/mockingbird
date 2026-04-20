"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import {
  COMMUNICATION_CHANNEL_LABELS,
  TIMELINE_TYPE_ICONS,
  TIMELINE_TYPE_LABELS,
} from "@/lib/constants";
import type {
  TimelineEvent,
  Stakeholder,
  Conversation,
  Communication,
} from "@/types";

interface TimelineEntryProps {
  event: TimelineEvent;
  stakeholderMap: Map<string, Stakeholder>;
  conversations: Conversation[];
  communications: Communication[];
  onStakeholderClick: (s: Stakeholder) => void;
}

export function TimelineEntry({
  event,
  stakeholderMap,
  conversations,
  communications,
  onStakeholderClick,
}: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const isConversation =
    event.type === "conversation" &&
    event.linkedEntityType === "conversation" &&
    event.linkedEntityId;
  const linkedConversation = isConversation
    ? conversations.find((c) => c.id === event.linkedEntityId)
    : null;
  const isCommunication =
    event.type === "communication" &&
    event.linkedEntityType === "communication" &&
    event.linkedEntityId;
  const linkedCommunication = isCommunication
    ? communications.find((c) => c.id === event.linkedEntityId)
    : null;
  const isExpandable = Boolean(linkedConversation || linkedCommunication);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="mt-0.5 text-base" role="img" aria-label={TIMELINE_TYPE_LABELS[event.type] ?? event.type}>{TIMELINE_TYPE_ICONS[event.type] ?? "📌"}</span>
        <div className="flex-1 w-px bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <div
          className={`${isExpandable ? "cursor-pointer" : ""}`}
          {...(isExpandable
            ? {
                role: "button",
                tabIndex: 0,
                "aria-expanded": expanded,
                onClick: () => setExpanded(!expanded),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded(!expanded);
                  }
                },
              }
            : {})}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium leading-tight">{event.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            </div>
            {isExpandable && (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            )}
          </div>
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
                    <li key={`${kp}-${i}`}>{kp}</li>
                  ))}
                </ul>
              </div>
            )}
            {linkedConversation.decisions.length > 0 && (
              <div>
                <p className="font-medium">Decisions</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  {linkedConversation.decisions.map((d, i) => (
                    <li key={`${d}-${i}`}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {expanded && linkedCommunication && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <p className="font-medium">{linkedCommunication.subject}</p>
              <span className="text-xs text-muted-foreground">
                {COMMUNICATION_CHANNEL_LABELS[linkedCommunication.channel]}
              </span>
            </div>
            <p className="mb-2 text-muted-foreground">
              {linkedCommunication.summary}
            </p>
            {linkedCommunication.messages.length > 0 && (
              <div>
                <p className="font-medium">Messages</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {linkedCommunication.messages.slice(0, 2).map((m) => {
                    const sender = m.senderId
                      ? stakeholderMap.get(m.senderId)
                      : null;
                    const label = sender
                      ? sender.name
                      : m.externalSender
                        ? `${m.externalSender.name}${
                            m.externalSender.organisation
                              ? ` (${m.externalSender.organisation})`
                              : ""
                          }`
                        : "";
                    return (
                      <li key={m.id}>
                        <span className="font-medium text-foreground">
                          {label}
                        </span>
                        {label && ": "}
                        {m.bodyPreview}
                      </li>
                    );
                  })}
                </ul>
                {linkedCommunication.messages.length > 2 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    +{linkedCommunication.messages.length - 2} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
