"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { StakeholderDetailDialog } from "@/components/shared/StakeholderDetailDialog";
import { CommunicationsFilters } from "./CommunicationsFilters";
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

interface CommunicationDetailProps {
  communication: Communication;
  stakeholderMap: Map<string, Stakeholder>;
  conversationMap: Map<string, Conversation>;
  actionMap: Map<string, ActionItem>;
  claimMap: Map<string, Claim>;
  evidenceMap: Map<string, EvidenceItem>;
  riskMap: Map<string, Risk>;
  onStakeholderClick: (s: Stakeholder) => void;
}

function CommunicationDetail({
  communication,
  stakeholderMap,
  conversationMap,
  actionMap,
  claimMap,
  evidenceMap,
  riskMap,
  onStakeholderClick,
}: CommunicationDetailProps) {
  const trackedParticipants = resolveIds(
    communication.participantIds,
    stakeholderMap,
  );

  const sortedMessages = useMemo(
    () =>
      [...communication.messages].sort(
        (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime(),
      ),
    [communication.messages],
  );

  const linkedActions = resolveIds(communication.actionItemIds, actionMap);
  const linkedClaims = resolveIds(communication.claimIds, claimMap);
  const linkedEvidence = resolveIds(communication.evidenceIds, evidenceMap);
  const linkedRisks = resolveIds(communication.riskIds, riskMap);
  const linkedConversations = resolveIds(
    communication.conversationIds,
    conversationMap,
  );

  const hasLinks =
    linkedActions.length +
      linkedClaims.length +
      linkedEvidence.length +
      linkedRisks.length +
      linkedConversations.length >
    0;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <div className="flex items-start gap-2">
            <span
              className="text-xl leading-none"
              role="img"
              aria-label={COMMUNICATION_CHANNEL_LABELS[communication.channel]}
            >
              {COMMUNICATION_CHANNEL_ICONS[communication.channel]}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold leading-tight">
                {communication.subject}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {COMMUNICATION_CHANNEL_LABELS[communication.channel]}
                </Badge>
                <span>&middot;</span>
                <DateDisplay date={communication.date} />
                <span>&middot;</span>
                <span>{communication.messages.length} messages</span>
              </div>
            </div>
          </div>
          {communication.tags && communication.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {communication.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Participants
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {trackedParticipants.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => onStakeholderClick(s)}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors hover:bg-accent/50"
              >
                <StakeholderAvatar stakeholder={s} size="sm" />
                <span>{s.name}</span>
              </button>
            ))}
            {communication.externalParticipants?.map((ext, i) => (
              <span
                key={ext.email ?? ext.name ?? `ext-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-2 py-1 text-xs text-muted-foreground"
              >
                <span role="img" aria-label="External">
                  🌐
                </span>
                <span>
                  {ext.name}
                  {ext.organisation ? ` (${ext.organisation})` : ""}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Summary
          </p>
          <p className="text-sm text-muted-foreground">
            {communication.summary}
          </p>
        </div>

        <Separator />

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Messages
          </p>
          <ol className="space-y-3">
            {sortedMessages.map((m, i) => {
              const sender = m.senderId ? stakeholderMap.get(m.senderId) : null;
              const label = sender
                ? sender.name
                : m.externalSender
                  ? `${m.externalSender.name}${
                      m.externalSender.organisation
                        ? ` (${m.externalSender.organisation})`
                        : ""
                    }`
                  : "";
              const key = `${m.date}-${
                m.senderId ??
                m.externalSender?.email ??
                m.externalSender?.name ??
                i
              }`;
              return (
                <li key={key} className="flex gap-2">
                  {sender ? (
                    <StakeholderAvatar
                      stakeholder={sender}
                      size="sm"
                      onClick={() => onStakeholderClick(sender)}
                    />
                  ) : (
                    <span
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed text-[10px] text-muted-foreground"
                      aria-label="External sender"
                    >
                      🌐
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        <DateDisplay date={m.date} />
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {m.bodyPreview}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {communication.attachments && communication.attachments.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Attachments ({communication.attachments.length})
              </p>
              <ul className="space-y-1.5 text-sm">
                {communication.attachments.map((att, i) => {
                  const ev = att.evidenceId
                    ? evidenceMap.get(att.evidenceId)
                    : null;
                  const label = att.name ?? ev?.title ?? "Attachment";
                  const key =
                    att.evidenceId ?? att.url ?? att.name ?? `att-${i}`;
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <span role="img" aria-label="Attachment">
                        📎
                      </span>
                      {att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {label}
                        </a>
                      ) : (
                        <span>{label}</span>
                      )}
                      {ev && (
                        <Badge variant="outline" className="text-xs">
                          Evidence
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        {hasLinks && (
          <>
            <Separator />
            <div className="space-y-3">
              {linkedConversations.length > 0 && (
                <LinkedList
                  label="Conversations"
                  items={linkedConversations.map((c) => ({
                    key: c.id,
                    text: c.title,
                  }))}
                />
              )}
              {linkedActions.length > 0 && (
                <LinkedList
                  label="Action items"
                  items={linkedActions.map((a) => ({
                    key: a.id,
                    text: a.title,
                  }))}
                />
              )}
              {linkedClaims.length > 0 && (
                <LinkedList
                  label="Claims"
                  items={linkedClaims.map((c) => ({
                    key: c.id,
                    text: c.assertion,
                  }))}
                />
              )}
              {linkedEvidence.length > 0 && (
                <LinkedList
                  label="Evidence"
                  items={linkedEvidence.map((e) => ({
                    key: e.id,
                    text: e.title,
                  }))}
                />
              )}
              {linkedRisks.length > 0 && (
                <LinkedList
                  label="Risks"
                  items={linkedRisks.map((r) => ({
                    key: r.id,
                    text: r.title,
                  }))}
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LinkedList({
  label,
  items,
}: {
  label: string;
  items: { key: string; text: string }[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.key} className="line-clamp-1">
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
