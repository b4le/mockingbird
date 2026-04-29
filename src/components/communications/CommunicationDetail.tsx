"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { AudioReferencePlayer } from "@/components/shared/AudioReferencePlayer";
import { AudioReferenceIndicator } from "@/components/shared/AudioReferenceIndicator";
import { LinkedEntityList } from "./LinkedEntityList";
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
  Conversation,
  EvidenceItem,
  Risk,
  Stakeholder,
} from "@/types";

interface CommunicationDetailProps {
  communication: Communication;
  stakeholderMap: ReadonlyMap<string, Stakeholder>;
  conversationMap: ReadonlyMap<string, Conversation>;
  actionMap: ReadonlyMap<string, ActionItem>;
  claimMap: ReadonlyMap<string, Claim>;
  evidenceMap: ReadonlyMap<string, EvidenceItem>;
  riskMap: ReadonlyMap<string, Risk>;
  onStakeholderClick: (s: Stakeholder) => void;
}

export function CommunicationDetail({
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
            {sortedMessages.map((m) => {
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
              return (
                <li key={m.id} className="flex gap-2">
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
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Conversations
                  </p>
                  <ul className="space-y-2 text-sm">
                    {linkedConversations.map((c) => (
                      <li key={c.id} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="line-clamp-1">{c.title}</span>
                          {/*
                           * Discoverability cue: chip-level "has recording"
                           * indicator. The compact player below provides
                           * the actual affordance.
                           */}
                          {c.audioReference && <AudioReferenceIndicator />}
                        </div>
                        {c.audioReference && (
                          <AudioReferencePlayer
                            audioReference={c.audioReference}
                            variant="compact"
                            className="ml-0"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <LinkedEntityList
                label="Action items"
                items={linkedActions.map((a) => ({
                  key: a.id,
                  text: a.title,
                }))}
              />
              <LinkedEntityList
                label="Claims"
                items={linkedClaims.map((c) => ({
                  key: c.id,
                  text: c.assertion,
                }))}
              />
              <LinkedEntityList
                label="Evidence"
                items={linkedEvidence.map((e) => ({
                  key: e.id,
                  text: e.title,
                }))}
              />
              <LinkedEntityList
                label="Risks"
                items={linkedRisks.map((r) => ({
                  key: r.id,
                  text: r.title,
                }))}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
