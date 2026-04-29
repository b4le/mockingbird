"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { AudioReferenceIndicator } from "@/components/shared/AudioReferenceIndicator";
import { StakeholderDetailDialog } from "@/components/shared/StakeholderDetailDialog";
import { ConversationsFilters } from "./ConversationsFilters";
import { ConversationDetail } from "./ConversationDetail";
import { buildStakeholderMap } from "@/lib/stakeholders";
import { resolveIds } from "@/lib/collections";
import { parseDate } from "@/lib/dates";
import {
  CONVERSATION_FALLBACK_ICON,
  CONVERSATION_FALLBACK_LABEL,
  CONVERSATION_MEDIUM_ICONS,
  CONVERSATION_MEDIUM_LABELS,
} from "@/lib/constants";
import type {
  ActionItem,
  Claim,
  Communication,
  Conversation,
  Stakeholder,
} from "@/types";

type Medium = NonNullable<Conversation["medium"]>;

interface ConversationsPageClientProps {
  conversations: Conversation[];
  stakeholders: Stakeholder[];
  communications: Communication[];
  actions: ActionItem[];
  claims: Claim[];
}

// Conversations may have a null date. Sort nulls to the bottom; otherwise sort
// newest-first by the underlying timestamp.
function compareConversationsByDateDesc(
  a: Conversation,
  b: Conversation,
): number {
  if (a.date === null && b.date === null) return 0;
  if (a.date === null) return 1;
  if (b.date === null) return -1;
  return parseDate(b.date).getTime() - parseDate(a.date).getTime();
}

export function ConversationsPageClient({
  conversations,
  stakeholders,
  communications,
  actions,
  claims,
}: ConversationsPageClientProps) {
  const [selectedMedium, setSelectedMedium] = useState<Medium | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    string | null
  >(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [dialogStakeholder, setDialogStakeholder] =
    useState<Stakeholder | null>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const stakeholderMap = useMemo(
    () => buildStakeholderMap(stakeholders),
    [stakeholders],
  );
  const actionMap = useMemo(
    () => new Map(actions.map((a) => [a.id, a])),
    [actions],
  );

  const filtered = useMemo(() => {
    let result = [...conversations].sort(compareConversationsByDateDesc);
    if (selectedMedium) {
      result = result.filter((c) => c.medium === selectedMedium);
    }
    if (selectedParticipantId) {
      result = result.filter((c) =>
        c.participantIds.includes(selectedParticipantId),
      );
    }
    return result;
  }, [conversations, selectedMedium, selectedParticipantId]);

  const selected = useMemo(
    () =>
      selectedConversationId
        ? conversations.find((c) => c.id === selectedConversationId)
        : null,
    [selectedConversationId, conversations],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedConversationId((prev) => (prev === id ? null : id));
  }, []);

  // Scroll detail panel into view on mobile when a conversation is selected.
  useEffect(() => {
    if (selectedConversationId && detailPanelRef.current) {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        detailPanelRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }, [selectedConversationId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Conversations</h1>
      <ConversationsFilters
        stakeholders={stakeholders}
        selectedMedium={selectedMedium}
        selectedParticipant={selectedParticipantId}
        onMediumChange={setSelectedMedium}
        onParticipantChange={setSelectedParticipantId}
      />
      {filtered.length === 0 ? (
        <EmptyState message="No conversations match the current filters" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            {filtered.map((conv) => {
              const isActive = selectedConversationId === conv.id;
              const participants = resolveIds(
                conv.participantIds,
                stakeholderMap,
              );
              const extra = conv.participantIds.length - participants.length;
              const mediumIcon = conv.medium
                ? CONVERSATION_MEDIUM_ICONS[conv.medium]
                : CONVERSATION_FALLBACK_ICON;
              const mediumLabel = conv.medium
                ? CONVERSATION_MEDIUM_LABELS[conv.medium]
                : CONVERSATION_FALLBACK_LABEL;
              return (
                <Card
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  aria-label={`Select conversation: ${conv.title}`}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    isActive ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleSelect(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(conv.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <span
                        className="text-base leading-none"
                        role="img"
                        aria-label={mediumLabel}
                      >
                        {mediumIcon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-tight">
                          {conv.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {mediumLabel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            <DateDisplay date={conv.date} />
                          </span>
                          {conv.audioReference && <AudioReferenceIndicator />}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex -space-x-1">
                      {participants.slice(0, 4).map((s) => (
                        <StakeholderAvatar
                          key={s.id}
                          stakeholder={s}
                          size="sm"
                          onClick={() => setDialogStakeholder(s)}
                        />
                      ))}
                      {(participants.length > 4 || extra > 0) && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                          +{Math.max(participants.length - 4, 0) + extra}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div ref={detailPanelRef} className="md:col-span-1 lg:col-span-2">
            {selected ? (
              <ConversationDetail
                conversation={selected}
                stakeholderMap={stakeholderMap}
                actionMap={actionMap}
                onStakeholderClick={setDialogStakeholder}
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Select a conversation to see the details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <StakeholderDetailDialog
        stakeholder={dialogStakeholder}
        open={!!dialogStakeholder}
        onOpenChange={(open) => !open && setDialogStakeholder(null)}
        conversations={conversations}
        communications={communications}
        actions={actions}
        claims={claims}
      />
    </div>
  );
}
