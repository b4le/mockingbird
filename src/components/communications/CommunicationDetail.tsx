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
  CommAttachment,
  Communication,
  Conversation,
  EvidenceItem,
  Risk,
  Stakeholder,
} from "@/types";

/**
 * Format human-readable byte size, e.g. 128_595 → "126 KB", 41_768 → "41 KB",
 * 1_234_567 → "1.2 MB". Uses base-1024 (binary) units to match what users
 * see in operating-system file managers. Returns `null` for missing or
 * non-finite sizes so the caller can elide the metadata span entirely.
 */
function formatBytes(bytes: number | undefined): string | null {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

/**
 * Format the secondary metadata line for an attachment: size and MIME-derived
 * extension (uppercased). Returns `null` when no secondary metadata is
 * available so the caller can omit the empty span.
 *
 * Examples:
 *   { mime: "application/pdf", size: 128595 } → "PDF · 126 KB"
 *   { size: 1024 }                            → "1 KB"
 *   { mime: "application/pdf" }               → "PDF"
 *   {}                                        → null
 */
function formatAttachmentMeta(att: CommAttachment): string | null {
  const sizeStr = formatBytes(att.size);
  // Derive a short type tag from MIME — prefer the subtype after `/`,
  // strip vendor prefixes (`vnd.`, `x-`), and uppercase. Falls back to
  // the filename extension if MIME is missing.
  const typeTag = mimeToTag(att.mime) ?? extToTag(att.filename ?? att.name);
  const parts = [typeTag, sizeStr].filter((s): s is string => Boolean(s));
  return parts.length ? parts.join(" · ") : null;
}

function mimeToTag(mime: string | undefined): string | null {
  if (!mime) return null;
  const slash = mime.indexOf("/");
  if (slash === -1) return mime.toUpperCase();
  const subtype = mime.slice(slash + 1).replace(/^(vnd\.|x-)/, "");
  // Take the segment before any `+` (e.g. `vnd.openxmlformats.../+xml`).
  const head = subtype.split("+")[0] ?? subtype;
  // Trim long vendor paths like `openxmlformats-officedocument.wordprocessingml.document`.
  const last = head.split(".").pop() ?? head;
  return last.toUpperCase();
}

function extToTag(name: string | undefined): string | null {
  if (!name) return null;
  const dot = name.lastIndexOf(".");
  if (dot === -1 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toUpperCase();
}

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
                    {/*
                     * Privileged messages have their `attachments` redacted
                     * by the producer (empty array or absent), so the length
                     * guard below is sufficient — no UI-side privilege
                     * handling needed.
                     */}
                    {m.attachments && m.attachments.length > 0 && (
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {m.attachments.map((att, i) => {
                          const ev = att.evidenceId
                            ? evidenceMap.get(att.evidenceId)
                            : null;
                          const label =
                            att.filename ?? att.name ?? ev?.title ?? "Attachment";
                          const key =
                            att.evidenceId ??
                            att.url ??
                            att.path ??
                            att.filename ??
                            att.name ??
                            `att-${m.id}-${i}`;
                          const meta = formatAttachmentMeta(att);
                          return (
                            <li key={key} className="flex items-center gap-2">
                              <span
                                role="img"
                                aria-label={
                                  att.mime
                                    ? `Attachment (${att.mime})`
                                    : "Attachment"
                                }
                              >
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
                              {meta && (
                                <span className="text-xs text-muted-foreground">
                                  {meta}
                                </span>
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
                    )}
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
                  // Display label preference: producer-emitted `filename`,
                  // then legacy `name`, then linked Evidence title, then a
                  // generic fallback.
                  const label =
                    att.filename ?? att.name ?? ev?.title ?? "Attachment";
                  const key =
                    att.evidenceId ??
                    att.url ??
                    att.path ??
                    att.filename ??
                    att.name ??
                    `att-${i}`;
                  // `path` is project-relative inside the producer repo
                  // (e.g. `local-state/emails/attachments/...`). It is NOT
                  // a fetchable URL — only `url` (when present) is.
                  const meta = formatAttachmentMeta(att);
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <span
                        role="img"
                        aria-label={
                          att.mime
                            ? `Attachment (${att.mime})`
                            : "Attachment"
                        }
                      >
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
                      {meta && (
                        <span className="text-xs text-muted-foreground">
                          {meta}
                        </span>
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
