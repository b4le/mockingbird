# Mockingbird schema reference

Authoritative reference for every zod schema exported from `src/lib/schemas.ts`. For each schema this doc names the file:line, the `data.ts` loader (if any), the TypeScript interface it mirrors, and — critically — the **load-bearing required fields** that a downstream invariant check dereferences without a presence guard. Relaxing any of those fields to `.optional()` will turn clean drift reports into runtime crashes.

Read this alongside:

- `src/lib/schemas.ts` — the schemas themselves, with inline `// SCHEMA-COUPLING:` comments.
- `src/lib/invariants.ts` — the cross-collection backref checks that consume the required arrays.
- `src/types/index.ts` — the TypeScript interfaces; the `_AssertX` block at the bottom of `schemas.ts` enforces bidirectional assignability.

## Contents

- [1. The `_AssertX` drift-check block](#1-the-_assertx-drift-check-block)
- [2. Shared enums and the `uniqueIdArray` helper](#2-shared-enums-and-the-uniqueidarray-helper)
- [3. Schema-coupling cheat sheet](#3-schema-coupling-cheat-sheet)
- [4. Provenance JSON files](#4-provenance-json-files)
- [5. Tracked dataset stability (`data/severance/`)](#5-tracked-dataset-stability-dataseverance)
- [Schemas](#schemas)
  - [CommMessageSchema](#commmessageschema)
  - [CommunicationSchema](#communicationschema)
  - [StakeholderSchema](#stakeholderschema)
  - [AudioReferenceStatusSchema](#audioreferencestatusschema)
  - [AudioReferenceSchema](#audioreferenceschema)
  - [TranscriptCueSchema](#transcriptcueschema)
  - [TranscriptSchema](#transcriptschema)
  - [SnippetSchema](#snippetschema)
  - [ConversationSchema](#conversationschema)
  - [ActionItemSchema](#actionitemschema)
  - [RiskSchema](#riskschema)
  - [ClaimSchema](#claimschema)
  - [EvidenceItemSchema](#evidenceitemschema)
  - [TimelineEventSchema](#timelineeventschema)
  - [ProjectStateSchema](#projectstateschema)
  - [SessionMetaSchema](#sessionmetaschema)

---

## 1. The `_AssertX` drift-check block

The bottom of `src/lib/schemas.ts` declares one `type _AssertX = …` per exported schema and collects them into a `_schemaChecks` tuple of `true` literals. Each assertion uses the conditional-type idiom

```ts
type _AssertFoo =
  z.infer<typeof FooSchema> extends Foo
    ? Foo extends z.infer<typeof FooSchema>
      ? true
      : never
    : never;
```

so any **structural drift in either direction** between `z.infer<typeof FooSchema>` and the matching TypeScript interface in `src/types/index.ts` resolves the alias to `never`, which then fails to satisfy the `true` literal in `_schemaChecks` and breaks the build with a clear `Type 'never' is not assignable to type 'true'` error.

### Adding a new `_AssertX` row

When you add a new exported schema:

1. Add the matching `interface` or `type` in `src/types/index.ts`.
2. Add `type _AssertX = z.infer<typeof XSchema> extends X ? X extends z.infer<typeof XSchema> ? true : never : never;` next to the existing block.
3. Append `_AssertX` to the `_schemaChecks` tuple type AND append `true` to the value array.
4. Run `npm run build` — if either direction drifts, this fails at compile time.

No lint enforces this; the drift trap is that a new schema added without a row passes silently. Treat the block as a checklist.

---

## 2. Shared enums and the `uniqueIdArray` helper

Top of `src/lib/schemas.ts` declares enum schemas used across multiple entities:

| Enum schema | Values | Used by |
|-------------|--------|---------|
| `ActionStatusSchema` | `todo`, `in-progress`, `blocked`, `done` | `ActionItemSchema.status` |
| `PrioritySchema` | `critical`, `high`, `medium`, `low` | `ActionItemSchema.priority`, `RiskSchema.severity`, `RiskSchema.likelihood` |
| `RiskStatusSchema` | `open`, `mitigated`, `accepted`, `closed` | `RiskSchema.status` |
| `ClaimStatusSchema` | `supported`, `contested`, `unverified` | `ClaimSchema.status` |
| `ProjectStatusSchema` | `on-track`, `at-risk`, `off-track`, `paused`, `completed` | `ProjectStateSchema.status` |
| `EvidenceStrengthSchema` | `strong`, `moderate`, `weak`, `circumstantial` | `EvidenceItemSchema.strength` |
| `TimelineEventTypeSchema` | `conversation`, `decision`, `milestone`, `document`, `action`, `risk-change`, `communication` | `TimelineEventSchema.type` |
| `CommunicationChannelSchema` | `email`, `slack`, `signal`, `whatsapp`, `sms`, `other` | `CommunicationSchema.channel` |
| `MediumSchema` | `in-person`, `video-call`, `phone-call` | `ConversationSchema.medium` |
| `EvidenceSourceTypeSchema` | `document`, `conversation`, `metric`, `external` | `EvidenceItemSchema.sourceType` |
| `LinkedEntityTypeSchema` | `conversation`, `action`, `claim`, `risk`, `communication` | `TimelineEventSchema.linkedEntityType` |
| `SourceEntityTypeSchema` | `conversation`, `communication` | `ActionItemSchema.sourceEntityType`, `EvidenceItemSchema.sourceEntityType` |
| `AudioReferenceStatusSchema` | `complete`, `pending-summary`, `pending-vault-sync`, `pending-audio-upload` | `AudioReferenceSchema.status` |

`NullableIsoDateSchema` is a shared primitive: a `string().regex(/^\d{4}-\d{2}-\d{2}/).nullable()`. It rejects empty strings (the P0 bypass that previously rendered as "Invalid Date") and any non-ISO-prefixed value at the ingestion boundary.

`HttpsUrlSchema` is the same idea for URL fields on `AudioReferenceSchema`: `z.string().url()` with an `https://` prefix refinement, OR the literal empty string for the `pending-audio-upload` sentinel.

`uniqueIdArray(element, entityName)` (schemas.ts:586) wraps any element schema in `z.array(...).refine(...)` with a uniqueness check on `id`. Every top-level collection loaded via `src/lib/data.ts` is a `ReadonlyArray<{ id: string }>` whose `id` must be unique — duplicate ids would silently produce duplicate React keys and ambiguous resolver lookups. Centralised here to keep the policy consistent across all collection loaders.

---

## 3. Schema-coupling cheat sheet

The inline `// SCHEMA-COUPLING:` comments in `src/lib/schemas.ts` are the authoritative source; this table is a derived lookup index. If they conflict, trust the inline comments.

These fields are declared **REQUIRED** in their schema (no `.optional()`) because a downstream invariant check dereferences them without a presence guard. Relaxing any of them to optional will crash the check with `Cannot read properties of undefined (reading 'includes')` instead of cleanly reporting drift.

| Schema | Field | Consuming check | Source |
|--------|-------|-----------------|--------|
| `CommunicationSchema` | `actionItemIds` | `checkActionBackref` | invariants.ts |
| `CommunicationSchema` | `evidenceIds` | `checkEvidenceBackref` | invariants.ts |
| `CommunicationSchema` | `claimIds` | `checkCommunicationClaimIds` | invariants.ts |
| `CommunicationSchema` | `riskIds` | `checkCommunicationRiskIds` | invariants.ts |
| `CommunicationSchema` | `conversationIds` | `checkCommunicationConversationIds` | invariants.ts |
| `ConversationSchema` | `actionItemIds` | `checkConversationActionIds`, `checkActionBackref` | invariants.ts |
| `ConversationSchema` | `participantIds` | `checkConversationParticipantIds` | invariants.ts |
| `TranscriptSchema` | `cues` | `checkTranscriptSpeakers` | invariants.ts |
| `RiskSchema` | `actionIds` | `checkRiskActionIds` | invariants.ts |
| `ClaimSchema` | `evidenceIds` | `checkClaimEvidenceIds` | invariants.ts |

**Optional-array exceptions** — these fields ARE `.optional()` and the consuming check guards explicitly with `if (!field) continue;`. Absence is a legal "not opted in" state, not drift:

| Schema | Field | Guarding check |
|--------|-------|----------------|
| `SnippetSchema` | `evidenceIds` | `checkSnippetBackref` (invariants.ts) |
| `ConversationSchema` | `snippetIds` | `checkConversationSnippetIds` (invariants.ts) |

If you add a new check against an optional-array field, follow the explicit-guard pattern. If you add a check against a required-array field, follow the no-guard pattern and add a `// SCHEMA-COUPLING:` comment pointing at the consuming check.

---

## 4. Provenance JSON files

`data/local/*.provenance.json` (actions, claims, communications, conversations, evidence, risks, snippets, stakeholders, timeline, transcripts) are **producer-side artifacts** emitted by the atticus-finch exporter. They are **intentionally not loaded** by the consumer — Mockingbird ships no schema and no loader for them.

The decision: provenance metadata belongs to the producer's audit trail (who/when/which source rendered each row). Wiring it into the consumer's validated bundle would duplicate that responsibility and require schema work that buys the UI nothing. A future contributor who reads these files in the data dir should leave them alone, not write a `ProvenanceSchema`.

---

## 5. Tracked dataset stability (`data/severance/`)

`data/severance/` is a **tracked snapshot at `dataVersion: "1.1.0"`** — currently aligned with the schemas, but deliberately decoupled so it doesn't churn with every producer bump. It is the public-facing dataset that ships to GitHub Pages for discoverability; treating it as a snapshot (not a continuous mirror of `data/local/`) gives the demo a stable URL surface and keeps the dataset out of the blast radius of in-flight producer changes.

By contrast, `data/local/` (gitignored) tracks whatever the atticus-finch exporter last wrote and is the working copy used during development. `scripts/sync-severance.sh` is the **only** supported path from one to the other, and running it is a deliberate publish act, not an automatic side-effect of running the exporter.

### Consequence

The schema audit doc above (`docs/schemas.md`, the section you're reading) describes the **schemas the loaders validate against**, which is the latest version of every shape. `data/severance/` may at times lag behind the docs — that is by design, not drift. The drift checks in `src/lib/invariants.ts` still run against whichever dataset is loaded, so `data/severance/` is always internally consistent at whatever `dataVersion` it currently carries; it just isn't required to track the docs in lock-step.

### When to re-export

Re-exporting `data/severance/` to a newer schema is a **separate, deliberate decision** — not a maintenance chore triggered by every producer bump. Reasons that justify a re-export:

- The demo is showcasing a feature that only exists in the newer schema (e.g. inline transcript cues vs. separate `transcriptId`).
- A required field was added to the schema that the loader cannot synthesize from `1.0.0` data, breaking validation.
- Stakeholder demos surface confusion from the version mismatch.

Reasons that do **not** justify a re-export:

- "It's older than the docs." Yes — see above.
- "The schema-audit doc mentions a newer field." The audit describes the *current* shape; the snapshot is allowed to lag.
- "Tests would be stricter if we updated." Tests run against fixtures in `src/lib/__tests__/fixtures.ts`, not the public demo dataset.

If a re-export is warranted, the workflow is cross-repo (adjust paths to your local checkout):

1. `cd path/to/atticus-finch && python scripts/export_mockingbird.py --full` — the exporter writes its canonical output under `<atticus-root>/export/mockingbird/` and **automatically syncs** the result into `<mockingbird-root>/data/local/`. There is no `--target` / `--out` flag for severance; the sync is built-in.
2. `cd path/to/mockingbird && ./scripts/sync-severance.sh` — diffs `data/local/` against `data/severance/` and prompts before overwriting. Use `--apply` for non-interactive.
3. Verify: `jq '.dataVersion' data/severance/session.json` returns the expected new version.
4. Build: `GITHUB_PAGES=true npm run build` succeeds and prerenders the `/severance/*` routes.
5. Commit in mockingbird with a clear message; QA at least one severance route before pushing.
6. Update the `dataVersion` reference in this section.

Do **not** hand-edit JSON in `data/severance/` to match what you wish the producer output looked like. Always go through the export script — see `AGENTS.md` "Handling drift output" for why consumer-side patches mask producer bugs.

---

## Schemas

### CommMessageSchema

- **File**: src/lib/schemas.ts:229
- **Purpose**: Per-message record inside a `Communication`, with a discriminated union ensuring exactly one of `senderId` (internal) or `externalSender` (external) is set.
- **Wired by**: indirect — via `CommunicationSchema.messages`. No standalone loader.
- **TS interface**: `CommMessage` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable per-message React key, allows future deep-linking. |
| `date` | yes | ISO timestamp string. |
| `senderId` | xor `externalSender` | Stakeholder.id of the internal sender. |
| `externalSender` | xor `senderId` | `ExternalParticipantSchema` for non-stakeholder senders. |
| `bodyPreview` | yes | Short preview rendered in the list view. |
| `attachments` | optional | `CommAttachmentSchema[]` — per-message attachments. |

#### Cross-coupling

- Composed inside `CommunicationSchema.messages`.
- The `commMessageDiscriminatorPreflight` runs first and emits human-readable `"both are set"` / `"neither is set"` messages before the underlying `z.union` would degrade to a generic `invalid_union`.

#### Examples

```jsonc
{
  "id": "comm-1-msg-0",
  "date": "2024-01-01T12:00:00Z",
  "senderId": "s-1",
  "bodyPreview": "hello"
}
```

```jsonc
{
  "id": "comm-1-msg-1",
  "date": "2024-01-01T13:00:00Z",
  "externalSender": { "name": "External Counsel", "email": "ext@example.test" },
  "bodyPreview": "received, thanks"
}
```

#### For humans

A `CommMessage` is one message inside a `Communication` thread. Either an internal stakeholder sent it (so `senderId` resolves to a `Stakeholder.id`) or an external party did (`externalSender` carries the raw name/email/org). Both populated, or both absent, is a bug — the preflight rejects both shapes with a specific message.

#### For AI agents (when modifying)

- Do NOT remove the `commMessageDiscriminatorPreflight` step — without it the union's failure message becomes a generic `invalid_union` and the explicit `both-set` / `neither-set` test coverage breaks.
- Do NOT migrate this to `z.discriminatedUnion` — zod v4's discriminator requires a literal-valued field, which this shape lacks. Adding a `kind: "internal" | "external"` tag is a data-shape change requiring a producer backfill of `data/demo/communications.json` and the atticus-finch exporter.
- Companion `_AssertX`: not exported as a top-level interface check; structural compatibility is asserted via `_AssertCommunication`.
- Tests: `src/lib/__tests__/schemas.test.ts` — `CommMessageSchema preflight messages` and the `CommunicationSchema attachment metadata` block.

---

### CommunicationSchema

- **File**: src/lib/schemas.ts:256
- **Purpose**: One email/Slack/Signal/etc. thread, including its messages, attachments, and the five **required** backref arrays that downstream invariant checks consume.
- **Wired by**: `getCommunications` in `src/lib/data.ts:114`.
- **TS interface**: `Communication` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable communication id; `uniqueIdArray` enforces uniqueness at the collection level. |
| `channel` | yes | `CommunicationChannelSchema` — UI badge + filter facet. |
| `date` | yes | ISO timestamp. |
| `subject` | yes | Thread title. |
| `participantIds` | yes | Internal stakeholders on the thread. |
| `externalParticipants` | optional | External parties not in the `Stakeholder` collection. |
| `summary` | yes | Producer-generated thread summary. |
| `messages` | yes | `CommMessageSchema[]` with a refine enforcing unique `id` across messages. |
| `attachments` | optional | Thread-level (vs per-message) attachments. |
| `actionItemIds` | **required (load-bearing)** | Mirrors `ActionItem.sourceEntityId`. Consumed by `checkActionBackref` without a presence guard. |
| `claimIds` | **required (load-bearing)** | Consumed by `checkCommunicationClaimIds`. |
| `evidenceIds` | **required (load-bearing)** | Mirrors `EvidenceItem.sourceEntityId`. Consumed by `checkEvidenceBackref`. |
| `riskIds` | **required (load-bearing)** | Consumed by `checkCommunicationRiskIds`. |
| `conversationIds` | **required (load-bearing)** | Consumed by `checkCommunicationConversationIds`. |
| `tags` | optional | Free-form labels. |

#### Cross-coupling

- Composes `ExternalParticipantSchema`, `CommMessageSchema`, `CommAttachmentSchema`, `CommunicationChannelSchema`.
- Load-bearing required arrays consumed by five invariant checks — see the cheat sheet in §3.
- A trailing refine asserts `messages` have unique `id` values within a single Communication.

#### Examples

```jsonc
{
  "id": "comm-1",
  "channel": "email",
  "date": "2024-01-01T12:00:00Z",
  "subject": "Re: contract",
  "participantIds": ["s-1"],
  "summary": "Discussed terms",
  "messages": [
    { "id": "comm-1-msg-0", "date": "2024-01-01T12:00:00Z", "senderId": "s-1", "bodyPreview": "hi" }
  ],
  "actionItemIds": [],
  "claimIds": [],
  "evidenceIds": [],
  "riskIds": [],
  "conversationIds": []
}
```

#### For humans

A `Communication` is one written-channel thread. Treat the five `*Ids` arrays as "what this thread links to" — they are mirror-of-truth backrefs maintained by the producer. The schema requires them so a downstream invariant check can iterate them without nil-checks.

#### For AI agents (when modifying)

- Do NOT relax `actionItemIds`, `claimIds`, `evidenceIds`, `riskIds`, or `conversationIds` to `.optional()` — five invariant checks dereference these without presence guards.
- If you add a new required-array field, add a `// SCHEMA-COUPLING:` comment pointing at the consuming check.
- Companion `_AssertX`: `_AssertCommunication` near the bottom of `schemas.ts`.
- TS interface: keep `Communication` in `src/types/index.ts` in lockstep.
- Invariants: `checkActionBackref`, `checkEvidenceBackref`, `checkCommunicationClaimIds`, `checkCommunicationRiskIds`, `checkCommunicationConversationIds` in `src/lib/invariants.ts`.
- Tests: `CommunicationSchema attachment metadata` block in `src/lib/__tests__/schemas.test.ts`.

---

### StakeholderSchema

- **File**: src/lib/schemas.ts:291
- **Purpose**: One person record (internal stakeholder or non-external participant) that downstream collections resolve via `participantIds`, `ownerId`, `raisedById`, `speakerId`, and similar foreign-key-style fields.
- **Wired by**: `getStakeholders` in `src/lib/data.ts:94`.
- **TS interface**: `Stakeholder` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable id used by every other entity. |
| `name` | yes | Display name. |
| `role` | yes | Job title / role. |
| `organisation` | yes | Employer or group. |
| `initials` | yes | Used in avatar fallback. |
| `colour` | yes | Used in chart series / avatar background. |
| `email` | optional | Populated when known. |
| `phone` | optional | Populated when known. |
| `avatarUrl` | optional | Image URL for the avatar; falls back to initials when absent. |
| `notes` | optional | Free-form. |

#### Cross-coupling

- Referenced by `Conversation.participantIds`, `Communication.participantIds`, `Transcript.participantIds`, `ActionItem.ownerId`, `Claim.raisedById`, `TimelineEvent.stakeholderIds`, `TranscriptCue.speakerId`.
- No invariant check enforces id-resolution into `Stakeholder` today; the UI shows `Unknown` for unresolved ids.

#### Examples

```jsonc
{ "id": "s-1", "name": "Alice", "role": "Engineer", "organisation": "Acme", "initials": "AA", "colour": "#abcdef" }
```

#### For humans

A `Stakeholder` is "a person who shows up in the data". Optional fields exist because not every record is fully populated — UI components should treat them as best-effort.

#### For AI agents (when modifying)

- The six required fields are all rendered directly in the UI; do NOT make them optional without updating the components that read them.
- Companion `_AssertX`: `_AssertStakeholder`.
- TS interface: `Stakeholder` in `src/types/index.ts`.
- Tests: `StakeholderSchema` block in `src/lib/__tests__/schemas.test.ts`.

---

### AudioReferenceStatusSchema

- **File**: src/lib/schemas.ts:323
- **Purpose**: Enum of the four lifecycle states for an `AudioReference` — `complete`, `pending-summary`, `pending-vault-sync`, `pending-audio-upload`.
- **Wired by**: inline; used by `AudioReferenceSchema.status` and via `Audio/Conversation/Transcript` schemas.
- **TS interface**: `AudioReferenceStatus` in `src/types/index.ts`.

#### Fields

Enum values only; no field shape.

#### Cross-coupling

- Consumed by the `superRefine` on `AudioReferenceSchema`: `pending-audio-upload` is the only status that permits `driveId === ""`. Every other status requires a `driveId` of length ≥20.

#### Examples

```jsonc
"pending-audio-upload"
```

#### For humans

`complete` is the steady state. The three pending statuses mean some upstream artefact (vault summary, vault sync, the audio file itself) is not yet present. UI shows a badge and degrades render accordingly.

#### For AI agents (when modifying)

- Adding a new status: update the enum, decide whether it permits empty `driveId`, and update the `superRefine` on `AudioReferenceSchema`.
- Companion `_AssertX`: `_AssertAudioReferenceStatus`.
- TS interface: `AudioReferenceStatus` in `src/types/index.ts`.

---

### AudioReferenceSchema

- **File**: src/lib/schemas.ts:354
- **Purpose**: Drive-backed audio pointer with status-conditional `driveId` rules and `https://`-only URL hardening on `viewUrl` / `previewUrl` (defence against `javascript:` / `data:` schemes).
- **Wired by**: composed into `ConversationSchema.audioReference` and `TranscriptSchema.audioReference`. No standalone loader; reaches `data.ts` via those parents.
- **TS interface**: `AudioReference` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `driveId` | yes | Drive file id; must be ≥20 chars unless `status === "pending-audio-upload"` (then empty string is allowed). |
| `filename` | yes | Display filename. |
| `driveFolderId` | yes | Drive folder id for breadcrumbing. |
| `mimeType` | yes | Must match `/^audio\/[a-z0-9.-]+$/` or be empty (pending case). |
| `viewUrl` | yes | `HttpsUrlSchema` — `https://` only, or empty string for pending. |
| `previewUrl` | yes | Same. |
| `sizeBytes` | yes (nullable) | `int().nonnegative().nullable()`. |
| `durationSeconds` | yes (nullable) | Same. |
| `status` | optional | `AudioReferenceStatusSchema`; absent ⇒ treat as `complete`. |
| `notes` | optional | Short reason string for pending statuses. |
| `stream` | optional | Free-form stream/scope name; vocabulary not bounded. |

#### Cross-coupling

- Status-conditional `driveId` rule lives in a `superRefine`, not a flat `.min(20)`.
- `HttpsUrlSchema` rejects `javascript:`, `data:`, `vbscript:`, `file:`, plain `http://`, etc.

#### Examples

```jsonc
{
  "driveId": "10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS",
  "filename": "Adrian + Ben 11th Feb.m4a",
  "driveFolderId": "1Q4wFg7jZTdNty03u2GJL54FZxfsdPE0m",
  "mimeType": "audio/x-m4a",
  "viewUrl": "https://drive.google.com/file/d/.../view",
  "previewUrl": "https://drive.google.com/file/d/.../preview",
  "sizeBytes": 53896450,
  "durationSeconds": null
}
```

#### For humans

When `status` is `complete` (or absent), all the strings carry meaningful values. When `status` is `pending-audio-upload`, `driveId`, `mimeType`, `viewUrl`, `previewUrl` are all empty strings — render the badge, skip the player.

#### For AI agents (when modifying)

- Do NOT replace `HttpsUrlSchema` with bare `z.string().url()` — that accepts `javascript:`/`data:` URLs which would be XSS sinks when rendered into `<a href>`.
- Do NOT collapse the `superRefine` into `.min(20)` on `driveId` — the empty-string case for `pending-audio-upload` must keep working.
- Companion `_AssertX`: `_AssertAudioReference`.
- TS interface: `AudioReference` in `src/types/index.ts`.
- Tests: `AudioReferenceSchema` block in `src/lib/__tests__/schemas.test.ts` (~12 cases).

---

### TranscriptCueSchema

- **File**: src/lib/schemas.ts:387
- **Purpose**: One transcript cue with start/end timing in ms, bounded speaker label, optional resolved `speakerId`, and 10k-bounded text.
- **Wired by**: indirect — via `TranscriptSchema.cues`. No standalone loader.
- **TS interface**: `TranscriptCue` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `startMs` | yes | Non-negative integer ms; real scout data has no nulls here. |
| `endMs` | yes | Same. |
| `speaker` | yes | Raw label, 1–200 chars. |
| `speakerId` | optional | Resolved `Stakeholder.id`; max 200 chars. |
| `text` | yes | Bounded to 10,000 chars to defend against pathological input. |

#### Cross-coupling

- Composed into `TranscriptSchema.cues`.
- `checkTranscriptSpeakers` (invariants.ts:474) iterates cues to validate speaker resolution.

#### Examples

```jsonc
{ "startMs": 0, "endMs": 1000, "speaker": "Alice", "text": "Hello" }
```

#### For humans

Cues are atomic units of transcript. Keep the bounds tight — `text` at 10k chars is already 3-4× longer than the longest cue we have seen.

#### For AI agents (when modifying)

- Do NOT raise the `text` bound past 10k without checking memory/render implications.
- Companion `_AssertX`: `_AssertTranscriptCue`.
- TS interface: `TranscriptCue` in `src/types/index.ts`.
- Tests: `TranscriptCueSchema numeric/string constraints` block.

---

### TranscriptSchema

- **File**: src/lib/schemas.ts:398
- **Purpose**: Full transcript with cues, optional `speakerMap` (≤50 entries), and optional `audioReference`.
- **Wired by**: `getTranscripts` in `src/lib/data.ts:180`.
- **TS interface**: `Transcript` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable transcript id. |
| `date` | yes | ISO date string. |
| `category` | yes | Free-form category label. |
| `conversationId` | yes (nullable) | Resolves to `Conversation.id` or `null` for transcripts without a meeting. |
| `participants` | yes | Raw speaker label list. |
| `participantIds` | optional | Resolved `Stakeholder.id` list. |
| `durationSeconds` | yes (nullable) | Total runtime. |
| `cueCount` | yes | Convenience count; should equal `cues.length`. |
| `hasCues` | yes | Convenience boolean. |
| `cues` | **required (load-bearing)** | `TranscriptCueSchema[]` consumed by `checkTranscriptSpeakers` without a presence guard. |
| `sourceFile` | yes | Original file name for provenance. |
| `audioReference` | optional | `AudioReferenceSchema`; source of truth for the recording when present. |
| `speakerMap` | optional | Record mapping raw label → `Stakeholder.id`, ≤50 entries. |

#### Cross-coupling

- `checkConversationTranscriptId` (invariants.ts:410) + `checkTranscriptConversationId` (invariants.ts:437) enforce bidirectional link consistency with `Conversation`.
- `checkTranscriptSpeakers` (invariants.ts:474) iterates `cues` and `participants`.
- When both `Conversation.audioReference` and `Transcript.audioReference` exist, **Transcript wins** — see the `AudioReferenceSchema` doc block.

#### Examples

```jsonc
{
  "id": "t-1",
  "date": "2024-01-01",
  "category": "interview",
  "conversationId": "conv-1",
  "participants": ["Alice", "Bob"],
  "durationSeconds": 120,
  "cueCount": 1,
  "hasCues": true,
  "cues": [{ "startMs": 0, "endMs": 1000, "speaker": "Alice", "text": "hi" }],
  "sourceFile": "t-1.wav"
}
```

#### For humans

A `Transcript` row is a transcript plus its audio. The `speakerMap` is optional sugar that lets the UI resolve raw labels into stakeholders without recomputing per render.

#### For AI agents (when modifying)

- Do NOT relax `cues` to `.optional()` — `checkTranscriptSpeakers` dereferences it without a guard.
- Do NOT raise the `speakerMap` bound past 50 without checking the resolver cost.
- Companion `_AssertX`: `_AssertTranscript`.
- TS interface: `Transcript` in `src/types/index.ts`.
- Invariants: `checkConversationTranscriptId`, `checkTranscriptConversationId`, `checkTranscriptSpeakers`.
- Tests: `exporter-provided schemas` and `TranscriptSchema.speakerMap bound` blocks.

---

### SnippetSchema

- **File**: src/lib/schemas.ts:431
- **Purpose**: One audio snippet (Top-20 clip) with backrefs to its parent Conversation, Communication, and optionally the Evidence rows it supports.
- **Wired by**: `getSnippets` in `src/lib/data.ts:203` — **orphan status resolved**. The schema is now fully wired with two complementary invariant checks (`checkSnippetBackref` and `checkConversationSnippetIds`).
- **TS interface**: `Snippet` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable snippet id. |
| `clipId` | yes | Producer-side clip identifier. |
| `category` | yes | Free-form category. |
| `sourceFile` | yes | Original recording filename. |
| `audioFile` | yes | Extracted clip filename. |
| `startSeconds` / `endSeconds` / `durationSeconds` | yes | Numeric timing. |
| `date` | optional (nullable) | `NullableIsoDateSchema.optional()`. |
| `speaker` | yes | Raw speaker label. |
| `transcript` | yes | Clip transcript text. |
| `whatYoullHear` | yes | UI prose. |
| `top20Rank` | yes (nullable) | Rank or `null` for non-Top-20 snippets. |
| `exhibitMapping` | yes | Array of evidence-exhibit ids. |
| `evidenceIds` | optional | `string[]` of linked `EvidenceItem.id`. Optional-array exception — `checkSnippetBackref` guards. |
| `conversationId` | yes (nullable) | Parent `Conversation.id` or `null`. |
| `communicationId` | yes (nullable) | Parent `Communication.id` or `null`. |

#### Cross-coupling

- `checkSnippetBackref` (invariants.ts:766) — snippet → parent backref. Uses the optional-array guard pattern for `evidenceIds`.
- `checkConversationSnippetIds` (invariants.ts:348) — complementary inbound check; also uses an optional-array guard for `Conversation.snippetIds`.

#### Examples

```jsonc
{
  "id": "snip-1",
  "clipId": "clip-1",
  "category": "top-20",
  "sourceFile": "raw.m4a",
  "audioFile": "snip-1.mp3",
  "startSeconds": 12.5,
  "endSeconds": 17.5,
  "durationSeconds": 5,
  "speaker": "Alice",
  "transcript": "...",
  "whatYoullHear": "Alice agreeing to terms",
  "top20Rank": 1,
  "exhibitMapping": [],
  "conversationId": "conv-1",
  "communicationId": null
}
```

#### For humans

Snippets are user-facing audio bookmarks linking back to their parent conversation, communication, and (optionally) evidence rows. The schema is fully wired and policed by two invariant checks.

#### For AI agents (when modifying)

- Do NOT promote `evidenceIds` to required without updating `checkSnippetBackref` to drop its explicit guard. The current asymmetry is intentional — absence is a legal "not opted in" state.
- Companion `_AssertX`: `_AssertSnippet`.
- TS interface: `Snippet` in `src/types/index.ts`.
- Invariants: `checkSnippetBackref`, `checkConversationSnippetIds`.
- Tests: `exporter-provided schemas` block in `schemas.test.ts`.

---

### ConversationSchema

- **File**: src/lib/schemas.ts:455
- **Purpose**: One meeting / 1:1 record. `participantIds` and `actionItemIds` are load-bearing required arrays.
- **Wired by**: `getConversations` in `src/lib/data.ts:104`.
- **TS interface**: `Conversation` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable conversation id. |
| `date` | yes (nullable) | `NullableIsoDateSchema`. |
| `title` | yes | Meeting title. |
| `participantIds` | **required (load-bearing)** | Consumed by `checkConversationParticipantIds`. |
| `summary` | yes | Producer-generated summary. |
| `keyPoints` | yes | Bullet list rendered in the UI. |
| `decisions` | yes | Bullet list. |
| `actionItemIds` | **required (load-bearing)** | Consumed by `checkConversationActionIds` and `checkActionBackref`. |
| `medium` | optional | `MediumSchema`. |
| `transcript` | optional | @deprecated raw inline transcript fallback. Prefer `transcriptId`. |
| `transcriptId` | optional | Joins to `Transcript.id`. |
| `snippetIds` | optional | Optional-array exception; `checkConversationSnippetIds` guards. |
| `audioReference` | optional | `AudioReferenceSchema`; `Transcript.audioReference` wins when both present. |
| `category` | optional | Enum: `1-on-1`, `hr-meeting`, `union-meeting`. |

#### Cross-coupling

- `checkActionBackref` (invariants.ts:197) — relies on required `actionItemIds`.
- `checkConversationActionIds` (invariants.ts:309) — outbound.
- `checkConversationParticipantIds` (invariants.ts:379) — relies on required `participantIds`.
- `checkConversationTranscriptId` (invariants.ts:410) — joins to Transcript.
- `checkConversationSnippetIds` (invariants.ts:348) — optional-array exception for `snippetIds`.

#### Examples

```jsonc
{
  "id": "conv-1",
  "date": "2024-01-01",
  "title": "Kickoff",
  "participantIds": ["s-1", "s-2"],
  "summary": "Discussed plan",
  "keyPoints": [],
  "decisions": [],
  "actionItemIds": []
}
```

#### For humans

A `Conversation` is a meeting record. Snippets, transcript joins, and audio references hang off it through optional links. The two load-bearing arrays (`participantIds`, `actionItemIds`) are required even when empty — emit `[]` not absent.

#### For AI agents (when modifying)

- Do NOT relax `participantIds` or `actionItemIds` to `.optional()` — three invariant checks dereference them without presence guards.
- Companion `_AssertX`: `_AssertConversation`.
- TS interface: `Conversation` in `src/types/index.ts`.
- Tests: `audioReference field on Conversation and Transcript` and `ConversationSchema.category enum` blocks.

---

### ActionItemSchema

- **File**: src/lib/schemas.ts:479
- **Purpose**: Todo row with a polymorphic `sourceEntity` pointer (Conversation OR Communication, or neither). Refined by `sourceEntityBothOrNeither`.
- **Wired by**: `getActions` in `src/lib/data.ts:124`.
- **TS interface**: `ActionItem` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable id. |
| `title` | yes | Display title. |
| `description` | yes | Long-form description. |
| `status` | yes | `ActionStatusSchema`. |
| `priority` | yes | `PrioritySchema`. |
| `ownerId` | yes | `Stakeholder.id`. |
| `createdDate` | yes | ISO date string (note: not `NullableIsoDateSchema` — actions always have a creation date). |
| `dueDate` | yes (nullable) | Plain `z.string().nullable()`. |
| `completedDate` | yes (nullable) | Same. |
| `tags` | yes | String array. |
| `sourceEntityId` | yes (nullable) | Either both null or both set with `sourceEntityType`. |
| `sourceEntityType` | yes (nullable) | Same; `SourceEntityTypeSchema`. |

#### Cross-coupling

- `sourceEntityBothOrNeither` refine rejects the "half pointer" state.
- `checkActionBackref` (invariants.ts:197) — the parent (Conversation or Communication) must mirror this action's id in its `actionItemIds`.

#### Examples

```jsonc
{
  "id": "a-1",
  "title": "Follow up",
  "description": "...",
  "status": "todo",
  "priority": "high",
  "ownerId": "s-1",
  "createdDate": "2024-01-01",
  "dueDate": null,
  "completedDate": null,
  "tags": [],
  "sourceEntityId": "conv-1",
  "sourceEntityType": "conversation"
}
```

#### For humans

Actions point back to where they were raised. The refine prevents a stale "type without id" or "id without type" state from leaking through validation and crashing provenance rendering.

#### For AI agents (when modifying)

- Do NOT drop the `sourceEntityBothOrNeither` refine — it is the only thing keeping half-pointers out of the data.
- Companion `_AssertX`: `_AssertActionItem`.
- TS interface: `ActionItem` in `src/types/index.ts`.
- Invariants: `checkActionBackref`.
- Tests: `ActionItemSchema sourceEntity refine` block.

---

### RiskSchema

- **File**: src/lib/schemas.ts:496
- **Purpose**: Risk register row. Uses `NullableIsoDateSchema` for `createdDate`/`updatedDate` to reject empty-string dates at ingestion.
- **Wired by**: `getRisks` in `src/lib/data.ts:132`.
- **TS interface**: `Risk` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable id. |
| `title` | yes | Display title. |
| `description` | yes | Long-form. |
| `status` | yes | `RiskStatusSchema`. |
| `severity` | yes | `PrioritySchema`. |
| `likelihood` | yes | `PrioritySchema`. |
| `mitigationPlan` | yes | Free-form. |
| `actionIds` | **required (load-bearing)** | Consumed by `checkRiskActionIds` without a presence guard. |
| `createdDate` | yes (nullable, ISO) | `NullableIsoDateSchema`. |
| `updatedDate` | yes (nullable, ISO) | Same. |

#### Cross-coupling

- `checkRiskActionIds` (invariants.ts:620) — relies on required `actionIds`.

#### Examples

```jsonc
{
  "id": "r-1",
  "title": "Schedule slip",
  "description": "...",
  "status": "open",
  "severity": "high",
  "likelihood": "medium",
  "mitigationPlan": "...",
  "actionIds": [],
  "createdDate": "2024-01-01",
  "updatedDate": null
}
```

#### For humans

A `Risk` mirrors the entries an analyst would keep in a risk register. Dates use the strict ISO-or-null pattern to prevent "Invalid Date" UI bugs.

#### For AI agents (when modifying)

- Do NOT relax `actionIds` to `.optional()` — `checkRiskActionIds` dereferences without a guard.
- Do NOT replace `NullableIsoDateSchema` on the date fields with `z.string().nullable()` — empty strings would bypass the date guard and render as "Invalid Date".
- Companion `_AssertX`: `_AssertRisk`.
- TS interface: `Risk` in `src/types/index.ts`.
- Invariants: `checkRiskActionIds`.
- Tests: `nullable date fields reject non-ISO strings` block.

---

### ClaimSchema

- **File**: src/lib/schemas.ts:510
- **Purpose**: An assertion with its linked evidence ids and the stakeholder who raised it.
- **Wired by**: `getClaims` in `src/lib/data.ts:140`.
- **TS interface**: `Claim` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable id. |
| `assertion` | yes | The claim text. |
| `category` | yes | Free-form classifier. |
| `status` | yes | `ClaimStatusSchema`. |
| `evidenceIds` | **required (load-bearing)** | Consumed by `checkClaimEvidenceIds` without a presence guard. |
| `raisedById` | yes | `Stakeholder.id`. |
| `date` | yes | ISO date string. |

#### Cross-coupling

- `checkClaimEvidenceIds` (invariants.ts:653) — relies on required `evidenceIds`.
- Bidirectional pair with `EvidenceItem.claimIds`.

#### Examples

```jsonc
{
  "id": "cl-1",
  "assertion": "Termination was procedurally flawed",
  "category": "process",
  "status": "supported",
  "evidenceIds": ["e-1", "e-2"],
  "raisedById": "s-1",
  "date": "2024-01-01"
}
```

#### For humans

A `Claim` is a single assertion. Status reflects how well it is supported. Evidence ids link to the rows that back it.

#### For AI agents (when modifying)

- Do NOT relax `evidenceIds` to `.optional()` — `checkClaimEvidenceIds` dereferences without a guard.
- Companion `_AssertX`: `_AssertClaim`.
- TS interface: `Claim` in `src/types/index.ts`.
- Tests: `ClaimSchema` block in `schemas.test.ts`.

---

### EvidenceItemSchema

- **File**: src/lib/schemas.ts:521
- **Purpose**: One evidence row with a polymorphic `sourceEntity` pointer (same refine as `ActionItem`) and `NullableIsoDateSchema` for `date`.
- **Wired by**: `getEvidence` in `src/lib/data.ts:148`.
- **TS interface**: `EvidenceItem` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable id. |
| `title` | yes | Display title. |
| `description` | yes | Long-form. |
| `source` | yes | Free-form source string. |
| `sourceType` | yes | `EvidenceSourceTypeSchema`. |
| `strength` | yes | `EvidenceStrengthSchema`. |
| `date` | yes (nullable, ISO) | `NullableIsoDateSchema`. |
| `url` | yes (nullable) | Plain `z.string().nullable()`. |
| `claimIds` | yes | `string[]`; bidirectional pair with `Claim.evidenceIds`. |
| `sourceEntityId` | yes (nullable) | Both-or-neither with `sourceEntityType`. |
| `sourceEntityType` | yes (nullable) | Same; `SourceEntityTypeSchema`. |

#### Cross-coupling

- `sourceEntityBothOrNeither` refine.
- `checkEvidenceBackref` (invariants.ts:259) — Communication must mirror this evidence's id in its `evidenceIds` (Conversation has no `evidenceIds` field, hence the asymmetric backref).

#### Examples

```jsonc
{
  "id": "e-1",
  "title": "Email chain",
  "description": "...",
  "source": "Gmail",
  "sourceType": "external",
  "strength": "strong",
  "date": "2024-01-01",
  "url": null,
  "claimIds": ["cl-1"],
  "sourceEntityId": "comm-1",
  "sourceEntityType": "communication"
}
```

#### For humans

`EvidenceItem` is the analog of `ActionItem` for evidence rows — same polymorphic pointer pattern, same refine, same risk if the refine is dropped.

#### For AI agents (when modifying)

- Do NOT drop the `sourceEntityBothOrNeither` refine.
- Do NOT replace `NullableIsoDateSchema` on `date` with `z.string().nullable()`.
- Companion `_AssertX`: `_AssertEvidenceItem`.
- TS interface: `EvidenceItem` in `src/types/index.ts`.
- Invariants: `checkEvidenceBackref`.
- Tests: `EvidenceItemSchema sourceEntity refine` and the date suite.

---

### TimelineEventSchema

- **File**: src/lib/schemas.ts:537
- **Purpose**: Timeline marker with a polymorphic `linkedEntity` pointer.
- **Wired by**: `getTimeline` in `src/lib/data.ts:156`.
- **TS interface**: `TimelineEvent` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `id` | yes | Stable id. |
| `date` | yes | ISO date. |
| `type` | yes | `TimelineEventTypeSchema`. |
| `title` | yes | Display title. |
| `description` | yes | Long-form. |
| `stakeholderIds` | yes | Linked stakeholders. |
| `linkedEntityId` | yes (nullable) | Polymorphic pointer; null when unlinked. |
| `linkedEntityType` | yes (nullable) | `LinkedEntityTypeSchema`. |

#### Cross-coupling

- `checkTimelineLinkedEntity` (invariants.ts:695) — when `linkedEntityId` is non-null, the referenced entity must exist in its declared collection.

#### Examples

```jsonc
{
  "id": "te-1",
  "date": "2024-01-01",
  "type": "milestone",
  "title": "Kickoff",
  "description": "...",
  "stakeholderIds": ["s-1"],
  "linkedEntityId": null,
  "linkedEntityType": null
}
```

#### For humans

`TimelineEvent` shows up on the visual timeline. Type controls the icon; linked entity controls the click-through.

#### For AI agents (when modifying)

- Adding a new `type`: update `TimelineEventTypeSchema` and the icon mapping in the timeline component.
- Companion `_AssertX`: `_AssertTimelineEvent`.
- TS interface: `TimelineEvent` in `src/types/index.ts`.
- Invariants: `checkTimelineLinkedEntity`.
- Tests: `TimelineEventSchema` block.

---

### ProjectStateSchema

- **File**: src/lib/schemas.ts:548
- **Purpose**: Project header — overall status, phase, and a metrics array rendered in the dashboard.
- **Wired by**: `getProjectState` in `src/lib/data.ts:164`.
- **TS interface**: `ProjectState` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `projectName` | yes | Display name. |
| `status` | yes | `ProjectStatusSchema`. |
| `statusMessage` | yes | Short prose status. |
| `lastUpdated` | yes | ISO timestamp. |
| `metrics` | yes | Inline object array: `{ label, value, total: number \| null, unit }`. |
| `phase` | yes | Free-form phase label. |
| `phaseProgress` | yes | Number 0–1 (no explicit bound). |

#### Cross-coupling

None today.

#### Examples

```jsonc
{
  "projectName": "p",
  "status": "on-track",
  "statusMessage": "all good",
  "lastUpdated": "2024-01-01",
  "metrics": [{ "label": "Done", "value": 1, "total": 10, "unit": "items" }],
  "phase": "discovery",
  "phaseProgress": 0.25
}
```

#### For humans

`ProjectState` is the singleton header at the top of the dashboard. One per project.

#### For AI agents (when modifying)

- The `metrics` inline schema is intentionally not extracted — it has no other consumers.
- Companion `_AssertX`: `_AssertProjectState`.
- TS interface: `ProjectState` in `src/types/index.ts`.
- Tests: `ProjectStateSchema` block.

---

### SessionMetaSchema

- **File**: src/lib/schemas.ts:565
- **Purpose**: Session metadata — when the data was last regenerated, by what version, and any notes.
- **Wired by**: `getSession` in `src/lib/data.ts:170`.
- **TS interface**: `SessionMeta` in `src/types/index.ts`.

#### Fields

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `lastUpdated` | yes | ISO timestamp. |
| `dataVersion` | yes | Producer version string. |
| `generatedBy` | yes | Producer identifier. |
| `notes` | yes | Free-form notes (use empty string when none). |

#### Cross-coupling

None.

#### Examples

```jsonc
{
  "lastUpdated": "2024-01-01",
  "dataVersion": "1.2.3",
  "generatedBy": "atticus-finch/export_mockingbird.py",
  "notes": ""
}
```

#### For humans

`SessionMeta` is the singleton "when was this generated?" record at the bottom of the dashboard.

#### For AI agents (when modifying)

- All four fields are required — emit empty strings, not `null` or absence.
- Companion `_AssertX`: `_AssertSessionMeta`.
- TS interface: `SessionMeta` in `src/types/index.ts`.
- Tests: `SessionMetaSchema` block.
