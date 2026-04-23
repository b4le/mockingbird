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
  Snippet,
  Stakeholder,
  TimelineEvent,
  Transcript,
  TranscriptCue,
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
  "signal",
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

const SourceEntityTypeSchema = z.enum(["conversation", "communication"]);

/**
 * Cross-field invariant for `ActionItem` and `EvidenceItem`: the polymorphic
 * source pointer is either fully set or fully null. Prevents the "half
 * pointer" state (an id with no type, or a type with no id) that would
 * silently break provenance rendering.
 */
const sourceEntityBothOrNeither = <
  T extends {
    sourceEntityId: string | null;
    sourceEntityType: "conversation" | "communication" | null;
  },
>(
  v: T,
) => (v.sourceEntityId === null) === (v.sourceEntityType === null);

const sourceEntityRefineMessage =
  "sourceEntityId and sourceEntityType must both be null or both be set";

/**
 * Reusable schema for nullable ISO dates. `z.string().nullable()` alone
 * accepts `""`, which then flows past `DateDisplay`'s `=== null` guard and
 * renders as "Invalid Date" once `parseDate` reaches it. This helper
 * rejects empty strings (and any non-ISO-prefixed string) at the ingestion
 * boundary, forcing the exporter to emit real `null` for unknown dates.
 * Prefix regex so both `YYYY-MM-DD` and full ISO timestamps are accepted.
 */
const NullableIsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "date must be ISO-formatted (YYYY-MM-DD...) or null")
  .nullable();

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
 *
 * Kept as `z.union` rather than `z.discriminatedUnion`: zod v4's
 * `discriminatedUnion` requires each branch's discriminator to contribute a
 * literal/primitive value to `propValues: Record<string, Set<Primitive>>`.
 * The "presence of `senderId` vs presence of `externalSender`" pattern has
 * no literal discriminator field on either branch, so `discriminatedUnion`
 * would need a data-shape change (e.g. an added `kind: "internal" | "external"`
 * tag) and a backfill of `data/demo/communications.json`. The union-level
 * `error` below supplies the human-readable first-failure message that a
 * plain `invalid_union` would otherwise muddy.
 */
const commMessageDiscriminatorPreflight = z
  .any()
  .superRefine((v: unknown, ctx) => {
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return;
    }
    const obj = v as Record<string, unknown>;
    const hasInternal = obj.senderId !== undefined;
    const hasExternal = obj.externalSender !== undefined;
    if (hasInternal && hasExternal) {
      ctx.addIssue({
        code: "custom",
        message:
          "CommMessage must have exactly one of senderId or externalSender — both are set",
      });
    }
    if (!hasInternal && !hasExternal) {
      ctx.addIssue({
        code: "custom",
        message:
          "CommMessage must have exactly one of senderId or externalSender — neither is set",
      });
    }
  });

export const CommMessageSchema = commMessageDiscriminatorPreflight.pipe(
  z.union(
    [
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
    ],
    {
      error:
        "CommMessage must have exactly one of senderId (internal) or externalSender (external)",
    },
  ),
);

const CommAttachmentSchema = z
  .object({
    evidenceId: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
  })
  .refine((a) => Boolean(a.evidenceId || a.name || a.url), {
    message: "CommAttachment must have at least one of: evidenceId, name, url",
  });

export const CommunicationSchema = z
  .object({
    id: z.string(),
    channel: CommunicationChannelSchema,
    date: z.string(),
    subject: z.string(),
    participantIds: z.array(z.string()),
    externalParticipants: z.array(ExternalParticipantSchema).optional(),
    summary: z.string(),
    messages: z.array(CommMessageSchema),
    attachments: z.array(CommAttachmentSchema).optional(),
    actionItemIds: z.array(z.string()),
    claimIds: z.array(z.string()),
    evidenceIds: z.array(z.string()),
    riskIds: z.array(z.string()),
    conversationIds: z.array(z.string()),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (c) => new Set(c.messages.map((m) => m.id)).size === c.messages.length,
    { message: "CommMessage ids must be unique within a Communication" },
  );

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
  transcriptId: z.string().optional(),
  snippetIds: z.array(z.string()).optional(),
});

export const ActionItemSchema = z
  .object({
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
    sourceEntityId: z.string().nullable(),
    sourceEntityType: SourceEntityTypeSchema.nullable(),
  })
  .refine(sourceEntityBothOrNeither, { message: sourceEntityRefineMessage });

export const RiskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: RiskStatusSchema,
  severity: PrioritySchema,
  likelihood: PrioritySchema,
  mitigationPlan: z.string(),
  actionIds: z.array(z.string()),
  createdDate: NullableIsoDateSchema,
  updatedDate: NullableIsoDateSchema,
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

export const EvidenceItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    source: z.string(),
    sourceType: EvidenceSourceTypeSchema,
    strength: EvidenceStrengthSchema,
    date: NullableIsoDateSchema,
    url: z.string().nullable(),
    claimIds: z.array(z.string()),
    sourceEntityId: z.string().nullable(),
    sourceEntityType: SourceEntityTypeSchema.nullable(),
  })
  .refine(sourceEntityBothOrNeither, { message: sourceEntityRefineMessage });

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
// Exporter-provided entities (atticus-finch export_mockingbird.py)
//
// These are declared alongside the rest so the compile-time `_AssertX`
// cross-check remains the single place interface/schema drift is caught.
// Loaders in `src/lib/data.ts` have not been wired yet — once they are,
// add corresponding `checkSnippetBackref` / `checkTranscriptBackref`
// invariants to `src/lib/invariants.ts` (see AGENTS.md for the pattern).
// ---------------------------------------------------------------------------

const TranscriptCueSchema = z.object({
  startMs: z.number(),
  endMs: z.number(),
  speaker: z.string(),
  text: z.string(),
});

export const TranscriptSchema = z.object({
  id: z.string(),
  date: z.string(),
  category: z.string(),
  conversationId: z.string().nullable(),
  participants: z.array(z.string()),
  participantIds: z.array(z.string()).optional(),
  durationSeconds: z.number().nullable(),
  cueCount: z.number(),
  hasCues: z.boolean(),
  cues: z.array(TranscriptCueSchema),
  sourceFile: z.string(),
});

export const SnippetSchema = z.object({
  id: z.string(),
  clipId: z.string(),
  category: z.string(),
  sourceFile: z.string(),
  audioFile: z.string(),
  startSeconds: z.number(),
  endSeconds: z.number(),
  durationSeconds: z.number(),
  speaker: z.string(),
  transcript: z.string(),
  whatYoullHear: z.string(),
  top20Rank: z.number().nullable(),
  exhibitMapping: z.array(z.string()),
  evidenceIds: z.array(z.string()).optional(),
  conversationId: z.string().nullable(),
  communicationId: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

/**
 * Wraps an element schema in `z.array` with a uniqueness refine on `id`.
 * Every top-level entity collection loaded via `src/lib/data.ts` is a
 * `ReadonlyArray<{ id: string }>` whose `id` must be unique — duplicate
 * ids would silently produce duplicate React keys, ambiguous resolver
 * lookups (first-write-wins in `Map` construction), and wrong UI state.
 *
 * Centralising the refine here keeps the policy consistent across all
 * eight array loaders without spraying `.refine(...)` at each call site.
 */
export function uniqueIdArray<T extends z.ZodType<{ id: string }>>(
  element: T,
  entityName: string,
): z.ZodType<z.infer<T>[]> {
  return z.array(element).refine(
    (arr) => new Set(arr.map((x) => x.id)).size === arr.length,
    { message: `${entityName} ids must be unique across the collection` },
  );
}

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
type _AssertTranscriptCue =
  z.infer<typeof TranscriptCueSchema> extends TranscriptCue
    ? TranscriptCue extends z.infer<typeof TranscriptCueSchema>
      ? true
      : never
    : never;
type _AssertTranscript =
  z.infer<typeof TranscriptSchema> extends Transcript
    ? Transcript extends z.infer<typeof TranscriptSchema>
      ? true
      : never
    : never;
type _AssertSnippet =
  z.infer<typeof SnippetSchema> extends Snippet
    ? Snippet extends z.infer<typeof SnippetSchema>
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
  _AssertTranscriptCue,
  _AssertTranscript,
  _AssertSnippet,
] = [true, true, true, true, true, true, true, true, true, true, true, true, true];
void _schemaChecks;
