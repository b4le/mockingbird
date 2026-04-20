import { z } from "zod";

import type {
  ActionItem,
  Claim,
  Communication,
  Conversation,
  EvidenceItem,
  ProjectState,
  Risk,
  SessionMeta,
  Stakeholder,
  TimelineEvent,
} from "@/types";

/**
 * Zod schemas for the ten project-level JSON entities loaded at build time
 * by `src/lib/data.ts`. Kept deliberately close to the TypeScript interfaces
 * in `src/types/index.ts` — the compile-time `satisfies` checks at the bottom
 * of this file ensure each inferred schema stays structurally compatible with
 * its matching interface. If you update an interface, update the schema (and
 * vice versa) and the assertion will fail loudly at build time until they
 * match again.
 */

// ---------------------------------------------------------------------------
// Shared enums / literal unions
// ---------------------------------------------------------------------------

const ActionStatusSchema = z.enum([
  "todo",
  "in-progress",
  "blocked",
  "done",
]);
const PrioritySchema = z.enum(["critical", "high", "medium", "low"]);
const RiskStatusSchema = z.enum(["open", "mitigated", "accepted", "closed"]);
const ClaimStatusSchema = z.enum(["supported", "contested", "unverified"]);
const ProjectStatusSchema = z.enum([
  "on-track",
  "at-risk",
  "off-track",
  "paused",
  "completed",
]);
const EvidenceStrengthSchema = z.enum([
  "strong",
  "moderate",
  "weak",
  "circumstantial",
]);
const TimelineEventTypeSchema = z.enum([
  "conversation",
  "decision",
  "milestone",
  "document",
  "action",
  "risk-change",
  "communication",
]);
const CommunicationChannelSchema = z.enum([
  "email",
  "slack",
  "whatsapp",
  "sms",
  "other",
]);
const MediumSchema = z.enum(["in-person", "video-call", "phone-call"]);
const EvidenceSourceTypeSchema = z.enum([
  "document",
  "conversation",
  "metric",
  "external",
]);
const LinkedEntityTypeSchema = z.enum([
  "conversation",
  "action",
  "claim",
  "risk",
  "communication",
]);

// ---------------------------------------------------------------------------
// Entity schemas
// ---------------------------------------------------------------------------

const ExternalParticipantSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  organisation: z.string().optional(),
});

/**
 * Discriminated union mirroring `CommMessage` in `src/types/index.ts`.
 * Exactly one of `senderId` | `externalSender` is present. Every message has
 * a stable `id` for per-message React keys and future deep-linking.
 *
 * Each variant declares the other-side field as `undefined().optional()` to
 * match the `?: never` discriminators on the TypeScript interface — this is
 * what lets the compile-time `satisfies` check in this file assert bidirectional
 * assignability between the schema's inferred type and `CommMessage`.
 */
export const CommMessageSchema = z.union([
  z.object({
    id: z.string(),
    date: z.string(),
    senderId: z.string(),
    externalSender: z.undefined().optional(),
    bodyPreview: z.string(),
  }),
  z.object({
    id: z.string(),
    date: z.string(),
    senderId: z.undefined().optional(),
    externalSender: ExternalParticipantSchema,
    bodyPreview: z.string(),
  }),
]);

const CommAttachmentSchema = z.object({
  evidenceId: z.string().optional(),
  name: z.string().optional(),
  url: z.string().optional(),
});

export const CommunicationSchema = z.object({
  id: z.string(),
  channel: CommunicationChannelSchema,
  date: z.string(),
  subject: z.string(),
  participantIds: z.array(z.string()),
  externalParticipants: z.array(ExternalParticipantSchema).optional(),
  summary: z.string(),
  messages: z.array(CommMessageSchema),
  attachments: z.array(CommAttachmentSchema).optional(),
  actionItemIds: z.array(z.string()).optional(),
  claimIds: z.array(z.string()).optional(),
  evidenceIds: z.array(z.string()).optional(),
  riskIds: z.array(z.string()).optional(),
  conversationIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const StakeholderSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  organisation: z.string(),
  initials: z.string(),
  colour: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  participantIds: z.array(z.string()),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItemIds: z.array(z.string()),
  medium: MediumSchema.optional(),
  transcript: z.string().optional(),
  transcriptUrl: z.string().optional(),
});

export const ActionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: ActionStatusSchema,
  priority: PrioritySchema,
  ownerId: z.string(),
  createdDate: z.string(),
  dueDate: z.string().nullable(),
  completedDate: z.string().nullable(),
  tags: z.array(z.string()),
  conversationId: z.string().nullable(),
});

export const RiskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: RiskStatusSchema,
  severity: PrioritySchema,
  likelihood: PrioritySchema,
  mitigationPlan: z.string(),
  actionIds: z.array(z.string()),
  createdDate: z.string(),
  updatedDate: z.string(),
});

export const ClaimSchema = z.object({
  id: z.string(),
  assertion: z.string(),
  category: z.string(),
  status: ClaimStatusSchema,
  evidenceIds: z.array(z.string()),
  raisedById: z.string(),
  date: z.string(),
});

export const EvidenceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  source: z.string(),
  sourceType: EvidenceSourceTypeSchema,
  strength: EvidenceStrengthSchema,
  date: z.string(),
  url: z.string().nullable(),
  claimIds: z.array(z.string()),
  conversationId: z.string().nullable(),
});

export const TimelineEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: TimelineEventTypeSchema,
  title: z.string(),
  description: z.string(),
  stakeholderIds: z.array(z.string()),
  linkedEntityId: z.string().nullable(),
  linkedEntityType: LinkedEntityTypeSchema.nullable(),
});

export const ProjectStateSchema = z.object({
  projectName: z.string(),
  status: ProjectStatusSchema,
  statusMessage: z.string(),
  lastUpdated: z.string(),
  metrics: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      total: z.number().nullable(),
      unit: z.string(),
    }),
  ),
  phase: z.string(),
  phaseProgress: z.number(),
});

export const SessionMetaSchema = z.object({
  lastUpdated: z.string(),
  dataVersion: z.string(),
  generatedBy: z.string(),
  notes: z.string(),
});

// ---------------------------------------------------------------------------
// Compile-time cross-check between zod schemas and TypeScript interfaces.
//
// These unused variables exist only so that TypeScript will verify each
// zod-inferred type is assignable to (and from) its corresponding interface
// in `src/types/index.ts`. If an interface drifts from its schema, the build
// fails here with a clear "Type 'X' is not assignable to type 'Y'" error
// rather than silently at runtime.
//
// The `void` swallows the "declared but never used" warning while keeping
// the bidirectional assignability check live.
// ---------------------------------------------------------------------------

type _AssertStakeholder =
  z.infer<typeof StakeholderSchema> extends Stakeholder
    ? Stakeholder extends z.infer<typeof StakeholderSchema>
      ? true
      : never
    : never;
type _AssertConversation =
  z.infer<typeof ConversationSchema> extends Conversation
    ? Conversation extends z.infer<typeof ConversationSchema>
      ? true
      : never
    : never;
type _AssertCommunication =
  z.infer<typeof CommunicationSchema> extends Communication
    ? Communication extends z.infer<typeof CommunicationSchema>
      ? true
      : never
    : never;
type _AssertActionItem =
  z.infer<typeof ActionItemSchema> extends ActionItem
    ? ActionItem extends z.infer<typeof ActionItemSchema>
      ? true
      : never
    : never;
type _AssertRisk =
  z.infer<typeof RiskSchema> extends Risk
    ? Risk extends z.infer<typeof RiskSchema>
      ? true
      : never
    : never;
type _AssertClaim =
  z.infer<typeof ClaimSchema> extends Claim
    ? Claim extends z.infer<typeof ClaimSchema>
      ? true
      : never
    : never;
type _AssertEvidenceItem =
  z.infer<typeof EvidenceItemSchema> extends EvidenceItem
    ? EvidenceItem extends z.infer<typeof EvidenceItemSchema>
      ? true
      : never
    : never;
type _AssertTimelineEvent =
  z.infer<typeof TimelineEventSchema> extends TimelineEvent
    ? TimelineEvent extends z.infer<typeof TimelineEventSchema>
      ? true
      : never
    : never;
type _AssertProjectState =
  z.infer<typeof ProjectStateSchema> extends ProjectState
    ? ProjectState extends z.infer<typeof ProjectStateSchema>
      ? true
      : never
    : never;
type _AssertSessionMeta =
  z.infer<typeof SessionMetaSchema> extends SessionMeta
    ? SessionMeta extends z.infer<typeof SessionMetaSchema>
      ? true
      : never
    : never;

const _schemaChecks: [
  _AssertStakeholder,
  _AssertConversation,
  _AssertCommunication,
  _AssertActionItem,
  _AssertRisk,
  _AssertClaim,
  _AssertEvidenceItem,
  _AssertTimelineEvent,
  _AssertProjectState,
  _AssertSessionMeta,
] = [true, true, true, true, true, true, true, true, true, true];
void _schemaChecks;
