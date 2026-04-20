import type {
  Communication,
  CommunicationChannel,
  Conversation,
} from "@/types";
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
