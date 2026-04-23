export type ActionStatus = 'todo' | 'in-progress' | 'blocked' | 'done';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed';
export type ClaimStatus = 'supported' | 'contested' | 'unverified';
export type ProjectStatus = 'on-track' | 'at-risk' | 'off-track' | 'paused' | 'completed';
export type EvidenceStrength = 'strong' | 'moderate' | 'weak' | 'circumstantial';
export type TimelineEventType =
  | 'conversation'
  | 'decision'
  | 'milestone'
  | 'document'
  | 'action'
  | 'risk-change'
  | 'communication';
export type CommunicationChannel = 'email' | 'slack' | 'signal' | 'whatsapp' | 'sms' | 'other';

// TODO(scale): extract to data/demo/external-contacts.json once a second project
// is added or the first duplicate ExternalParticipant (same name + organisation)
// appears across threads. Inline-only today is fine at demo scale.
// See handoff mockingbird-comms-backlog-2026-04-21.md WI-2.
export interface ExternalParticipant {
  name: string;
  email?: string;
  organisation?: string;
}

export type CommMessage =
  | { id: string; date: string; senderId: string; externalSender?: never; bodyPreview: string }
  | { id: string; date: string; senderId?: never; externalSender: ExternalParticipant; bodyPreview: string };

export interface CommAttachment {
  evidenceId?: string;
  name?: string;
  url?: string;
}

/**
 * Design note — polymorphic entity pointers (both-or-neither pairs):
 *
 * The three polymorphic-pointer pairs below —
 * `TimelineEvent.linkedEntityId` / `linkedEntityType`,
 * `ActionItem.sourceEntityId` / `sourceEntityType`, and
 * `EvidenceItem.sourceEntityId` / `sourceEntityType` — intentionally retain
 * their flat (two-field) shape rather than a discriminated-union
 * `{ id: string; type: K } | { id: null; type: null }` helper. The zod
 * schemas in `src/lib/schemas.ts` apply the `sourceEntityBothOrNeither`
 * refine on the flat shape, and the `_AssertActionItem` /
 * `_AssertEvidenceItem` / `_AssertTimelineEvent` bidirectional-assignability
 * checks hold the interfaces in lockstep with those schemas. Collapsing
 * the two fields into a discriminated-union helper would require rewriting
 * both the schemas and the refine — a larger change deliberately left out
 * of scope. Keep the shape flat until a concrete need forces the
 * migration.
 */

/**
 * A `Communication` is any written asynchronous artefact, regardless of
 * whether its content refers to synchronous interactions. An SMS arranging
 * a call is a Communication; the call itself is a Conversation. Use
 * `Communication.conversationIds` to link them.
 */
export interface Communication {
  id: string;
  channel: CommunicationChannel;
  date: string;
  subject: string;
  participantIds: string[];
  externalParticipants?: ExternalParticipant[];
  summary: string;
  messages: CommMessage[];
  attachments?: CommAttachment[];
  /** Linked actions: origin required, related extras OK. Required; empty array when none. */
  actionItemIds: string[];
  /** Linked claims: permissive semantics — no backref drift check today. Required; empty array when none. */
  claimIds: string[];
  /** Linked evidence: origin required, related extras OK. Required; empty array when none. */
  evidenceIds: string[];
  /** Linked risks: permissive semantics — no backref drift check today. Required; empty array when none. */
  riskIds: string[];
  /** Linked conversations: permissive semantics — no backref drift check today. Required; empty array when none. */
  conversationIds: string[];
  tags?: string[];
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  organisation: string;
  initials: string;
  colour: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  notes?: string;
}

export interface Conversation {
  id: string;
  date: string;
  title: string;
  participantIds: string[];
  summary: string;
  keyPoints: string[];
  decisions: string[];
  /** Linked actions: origin required, related extras OK. Required; empty array when none. */
  actionItemIds: string[];
  medium?: 'in-person' | 'video-call' | 'phone-call';
  transcript?: string;
  transcriptUrl?: string;
  transcriptId?: string;
  snippetIds?: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: ActionStatus;
  priority: Priority;
  ownerId: string;
  createdDate: string;
  dueDate: string | null;
  completedDate: string | null;
  tags: string[];
  /**
   * The conversation or communication where this action was first raised.
   * Single source of truth — the referenced entity MUST mirror this link
   * via its own `actionItemIds`. Both fields are null together or both
   * non-null together (enforced in the zod schema). Mirrors the
   * `TimelineEvent.linkedEntityId` / `linkedEntityType` pattern.
   */
  sourceEntityId: string | null;
  sourceEntityType: 'conversation' | 'communication' | null;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  status: RiskStatus;
  severity: Priority;
  likelihood: Priority;
  mitigationPlan: string;
  /** Linked actions: permissive semantics — no backref drift check today. */
  actionIds: string[];
  createdDate: string | null;
  updatedDate: string | null;
}

export interface Claim {
  id: string;
  assertion: string;
  category: string;
  status: ClaimStatus;
  /** Linked evidence (bidirectional pair with `EvidenceItem.claimIds`): permissive semantics — no backref drift check today. */
  evidenceIds: string[];
  raisedById: string;
  date: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceType: 'document' | 'conversation' | 'metric' | 'external';
  strength: EvidenceStrength;
  date: string | null;
  url: string | null;
  /** Linked claims (bidirectional pair with `Claim.evidenceIds`): permissive semantics — no backref drift check today. */
  claimIds: string[];
  /**
   * The conversation or communication where this evidence was first raised.
   * Single source of truth — the referenced entity MUST mirror this link
   * via its own `evidenceIds`. Both fields are null together or both
   * non-null together (enforced in the zod schema). Mirrors the
   * `TimelineEvent.linkedEntityId` / `linkedEntityType` pattern.
   */
  sourceEntityId: string | null;
  sourceEntityType: 'conversation' | 'communication' | null;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description: string;
  stakeholderIds: string[];
  linkedEntityId: string | null;
  linkedEntityType:
    | 'conversation'
    | 'action'
    | 'claim'
    | 'risk'
    | 'communication'
    | null;
}

export interface ProjectState {
  projectName: string;
  status: ProjectStatus;
  statusMessage: string;
  lastUpdated: string;
  metrics: { label: string; value: number; total: number | null; unit: string }[];
  phase: string;
  phaseProgress: number;
}

export interface SessionMeta {
  lastUpdated: string;
  dataVersion: string;
  generatedBy: string;
  notes: string;
}

export interface TranscriptCue {
  startMs: number;
  endMs: number;
  speaker: string;
  text: string;
}

export interface Transcript {
  id: string;
  date: string;
  category: string;
  conversationId: string | null;
  participants: string[];
  participantIds?: string[];
  durationSeconds: number | null;
  cueCount: number;
  hasCues: boolean;
  cues: TranscriptCue[];
  sourceFile: string;
}

export interface Snippet {
  id: string;
  clipId: string;
  category: string;
  sourceFile: string;
  audioFile: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  speaker: string;
  transcript: string;
  whatYoullHear: string;
  top20Rank: number | null;
  exhibitMapping: string[];
  evidenceIds?: string[];
  conversationId: string | null;
  communicationId?: string | null;
}
