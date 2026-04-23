import type {
  Communication,
  CommunicationChannel,
  Conversation,
} from "@/types";
import {
  COMMUNICATION_CHANNEL_ICONS,
  COMMUNICATION_CHANNEL_LABELS,
  CONVERSATION_FALLBACK_ICON,
  CONVERSATION_FALLBACK_LABEL,
  CONVERSATION_MEDIUM_ICONS,
  CONVERSATION_MEDIUM_LABELS,
} from "@/lib/constants";
import { parseDate } from "@/lib/dates";

export type StakeholderActivityEntry =
  | {
      kind: "conversation";
      date: string;
      id: string;
      title: string;
      medium?: Conversation["medium"];
    }
  | {
      kind: "communication";
      date: string;
      id: string;
      subject: string;
      channel: CommunicationChannel;
    };

/**
 * Derive a per-stakeholder activity feed by unioning conversations and
 * communications they participated in, sorted most-recent first.
 *
 * Replaces the retired stored `stakeholder.contactLog` field.
 */
export function getStakeholderActivity(
  stakeholderId: string,
  conversations: Conversation[],
  communications: Communication[],
): StakeholderActivityEntry[] {
  const entries: StakeholderActivityEntry[] = [];

  for (const c of conversations) {
    if (c.participantIds.includes(stakeholderId)) {
      entries.push({
        kind: "conversation",
        date: c.date,
        id: c.id,
        title: c.title,
        medium: c.medium,
      });
    }
  }

  for (const m of communications) {
    if (m.participantIds.includes(stakeholderId)) {
      entries.push({
        kind: "communication",
        date: m.date,
        id: m.id,
        subject: m.subject,
        channel: m.channel,
      });
    }
  }

  entries.sort(
    (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime(),
  );

  return entries;
}

export interface SourceLabel {
  kind: "conversation" | "communication";
  id: string;
  /** Display string — `Conversation.title` or `Communication.subject`. */
  title: string;
  /** Emoji glyph from the matching medium/channel icon map. */
  icon: string;
  /** Human-readable medium/channel name for `aria-label` / screen readers. */
  ariaLabel: string;
}

/**
 * Resolve the polymorphic `sourceEntityId` + `sourceEntityType` pair from an
 * `ActionItem` or `EvidenceItem` to a display-ready label.
 *
 * Returns `null` if either input is `null` (the "no known source" case) or if
 * the referenced row is not found in its collection — callers should treat
 * the null return as "suppress the provenance chip" rather than as an error.
 * The zod schema's `sourceEntityBothOrNeither` refine guarantees the inputs
 * are either both null or both non-null; this helper defends against the
 * "both non-null but id resolves to nothing" drift case.
 *
 * Icon fallback mirrors `StakeholderDetailDialog`'s treatment of conversations
 * without a `medium`: a generic speech-balloon glyph.
 */
export function resolveSourceLabel(
  sourceEntityId: string | null,
  sourceEntityType: "conversation" | "communication" | null,
  conversations: Conversation[],
  communications: Communication[],
): SourceLabel | null {
  if (sourceEntityId === null || sourceEntityType === null) {
    return null;
  }

  if (sourceEntityType === "communication") {
    const comm = communications.find((c) => c.id === sourceEntityId);
    if (!comm) return null;
    return {
      kind: "communication",
      id: comm.id,
      title: comm.subject,
      icon: COMMUNICATION_CHANNEL_ICONS[comm.channel],
      ariaLabel: COMMUNICATION_CHANNEL_LABELS[comm.channel],
    };
  }

  const conv = conversations.find((c) => c.id === sourceEntityId);
  if (!conv) return null;
  return {
    kind: "conversation",
    id: conv.id,
    title: conv.title,
    icon: conv.medium
      ? CONVERSATION_MEDIUM_ICONS[conv.medium]
      : CONVERSATION_FALLBACK_ICON,
    ariaLabel: conv.medium
      ? CONVERSATION_MEDIUM_LABELS[conv.medium]
      : CONVERSATION_FALLBACK_LABEL,
  };
}
