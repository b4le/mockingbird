"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { StakeholderDetailDialog } from "@/components/shared/StakeholderDetailDialog";
import { CommunicationsFilters } from "./CommunicationsFilters";
import { CommunicationDetail } from "./CommunicationDetail";
import { buildStakeholderMap } from "@/lib/stakeholders";
import { resolveIds } from "@/lib/collections";
import { parseDate } from "@/lib/dates";
import {
  COMMUNICATION_CHANNEL_ICONS,
  COMMUNICATION_CHANNEL_LABELS,
} from "@/lib/constants";
import type {
  ActionItem,
  Claim,
  Communication,
  CommunicationChannel,
  Conversation,
  EvidenceItem,
  Risk,
  Stakeholder,
} from "@/types";

interface CommunicationsPageClientProps {
  communications: Communication[];
  stakeholders: Stakeholder[];
  conversations: Conversation[];
  actions: ActionItem[];
  claims: Claim[];
  evidence: EvidenceItem[];
  risks: Risk[];
}

export function CommunicationsPageClient({
  communications,
  stakeholders,
  conversations,
  actions,
  claims,
  evidence,
  risks,
}: CommunicationsPageClientProps) {
  const [selectedChannel, setSelectedChannel] =
    useState<CommunicationChannel | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogStakeholder, setDialogStakeholder] =
    useState<Stakeholder | null>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const stakeholderMap = useMemo(
    () => buildStakeholderMap(stakeholders),
    [stakeholders],
  );
  const conversationMap = useMemo(
    () => new Map(conversations.map((c) => [c.id, c])),
    [conversations],
  );
  const actionMap = useMemo(
    () => new Map(actions.map((a) => [a.id, a])),
    [actions],
  );
  const claimMap = useMemo(
    () => new Map(claims.map((c) => [c.id, c])),
    [claims],
  );
  const evidenceMap = useMemo(
    () => new Map(evidence.map((e) => [e.id, e])),
    [evidence],
  );
  const riskMap = useMemo(
    () => new Map(risks.map((r) => [r.id, r])),
    [risks],
  );

  const filtered = useMemo(() => {
    let result = [...communications].sort(
      (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime(),
    );
    if (selectedChannel) {
      result = result.filter((c) => c.channel === selectedChannel);
    }
    if (selectedParticipant) {
      result = result.filter((c) =>
        c.participantIds.includes(selectedParticipant),
      );
    }
    return result;
  }, [communications, selectedChannel, selectedParticipant]);

  const selected = useMemo(
    () => (selectedId ? communications.find((c) => c.id === selectedId) : null),
    [selectedId, communications],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  // Scroll detail panel into view on mobile when a thread is selected.
  useEffect(() => {
    if (selectedId && detailPanelRef.current) {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        detailPanelRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Communications</h1>
      <CommunicationsFilters
        stakeholders={stakeholders}
        selectedChannel={selectedChannel}
        selectedParticipant={selectedParticipant}
        onChannelChange={setSelectedChannel}
        onParticipantChange={setSelectedParticipant}
      />
      {filtered.length === 0 ? (
        <EmptyState message="No communications match the current filters" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            {filtered.map((comm) => {
              const isActive = selectedId === comm.id;
              const participants = resolveIds(
                comm.participantIds,
                stakeholderMap,
              );
              const extra =
                comm.participantIds.length - participants.length +
                (comm.externalParticipants?.length ?? 0);
              return (
                <Card
                  key={comm.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  aria-label={`Select communication: ${comm.subject}`}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    isActive ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleSelect(comm.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(comm.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <span
                        className="text-base leading-none"
                        role="img"
                        aria-label={COMMUNICATION_CHANNEL_LABELS[comm.channel]}
                      >
                        {COMMUNICATION_CHANNEL_ICONS[comm.channel]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight line-clamp-2">
                          {comm.subject}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {COMMUNICATION_CHANNEL_LABELS[comm.channel]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            <DateDisplay date={comm.date} />
                          </span>
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
                      {extra > 0 && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                          +{extra}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div
            ref={detailPanelRef}
            className="md:col-span-1 lg:col-span-2"
          >
            {selected ? (
              <CommunicationDetail
                communication={selected}
                stakeholderMap={stakeholderMap}
                conversationMap={conversationMap}
                actionMap={actionMap}
                claimMap={claimMap}
                evidenceMap={evidenceMap}
                riskMap={riskMap}
                onStakeholderClick={setDialogStakeholder}
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Select a communication to see the thread
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
