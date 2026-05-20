# Dataset Simplification — Decisions for Issue #23

## Context

The data layer has accumulated shape across six exporter iterations. Drift between disk shape and UI need now costs an invariant check, a refine, or a per-render transform on each mismatch. Issue [#23](https://github.com/b4le/mockingbird/issues/23) catalogued ten findings across `src/lib/schemas.ts`, `src/types/index.ts`, and the `data/` fixtures. This document records the decisions for findings 1–5 — the subset landing in this PR. It is the canonical decision record paired with the code changes; findings 6–10 are explicitly out of scope (see below).

Each decision was made with two constraints in mind: (1) do not silently break running consumers, and (2) do not relax required-array fields without reintroducing the presence guards that the backref checks in `src/lib/invariants.ts` depend on (see `AGENTS.md` "Schema coupling (load-bearing)").

---

## Decisions

### Finding 1 — Snippet orphan

**Status:** Schema kept, loader deferred

**Why:**

`SnippetSchema` (`src/lib/schemas.ts`) and the `Snippet` interface (`src/types/index.ts`) are defined but have no loader in `src/lib/data.ts` (no `getSnippets` export) and no non-test component imports them. `Conversation.snippetIds` (`src/types/index.ts:217`) is a dangling forward-reference.

`data/local/snippets.json` currently contains 30 records emitted by the atticus-finch exporter. Post this PR's addition of `date: NullableIsoDateSchema.optional()` to `SnippetSchema`, the schema now accepts the on-disk shape. The blocker for wiring is `conversationId` linkage drift: every record carries an exporter-generated UUID (e.g. `"conversation-bf3bd223-..."`) that does not appear in `Conversation.id` (local dataset uses a single record with id `"conv-hr-20260315-6bd442"`). Wiring would fail any future `checkSnippetBackref` invariant on real exported data.

Wiring a loader against the current misaligned linkage would either fail `loadValidated` at startup or produce silently unverified cross-collection joins. Neither outcome is acceptable.

**This PR:**

- Add `date: NullableIsoDateSchema.optional()` to `SnippetSchema` to align with the JSON field present on disk.
- Add JSDoc to `SnippetSchema` and `Snippet` explaining why the loader is deferred: schema/data drift is not yet resolved, and `conversationId` values are exporter-generated UUIDs that do not match any `Conversation.id` in the local dataset, so no join is possible.
- No loader, no invariant wiring.

**Follow-up:**

[b4le/atticus-finch#71](https://github.com/b4le/atticus-finch/issues/71) — reconcile `SnippetSchema` fields (`exhibitMapping` vs `exhibitIds`/`claimIds`) with actual exporter output before a loader is added.

---

### Finding 2 — AudioReference duplication

**Status:** Producer dual-emit cut shipped (atticus-finch#70); field retained for the last audio-only conversation. Not yet fully resolved.

**Why:**

`AudioReference` appears on both `Conversation` and `Transcript` (`src/types/index.ts`). Historically, conversations with a paired Transcript carried the same 8-field block on both records; audio-only sessions (no Transcript) carried it only on `Conversation`.

The producer side of the de-duplication has shipped: [b4le/atticus-finch#70](https://github.com/b4le/atticus-finch/issues/70) stopped emitting `Conversation.audioReference` when a Transcript row exists. The field has **not** been removed from the schema or interface, because the live dataset still contains one audio-only conversation (`conversation-d738b9e8-5b43-498c-8bb6-0ae6396d6d31`) with no paired Transcript — `Conversation.audioReference` remains the source of truth for that row, and is the only remaining case keeping the field alive on `Conversation`.

**Ownership policy (canonical rule):**

- `Transcript` owns `audioReference` when a Transcript row exists for the conversation. The exporter no longer dual-emits onto `Conversation` in this case.
- `Conversation` owns `audioReference` for audio-only sessions (no Transcript row). This is the only remaining case keeping the field alive on `Conversation`.
- `resolveAudioReference` in `src/lib/audio-reference.ts` encodes both branches; the conversation-fallback path is now only reached for audio-only sessions.

**This PR (mockingbird#27):**

- Tighten JSDoc on `Conversation.audioReference` (and the corresponding `ConversationSchema` field) to state: "Only set on audio-only sessions; never on conversations with a paired Transcript."
- Refresh `Transcript.audioReference` JSDoc and `AudioReferenceSchema` JSDoc to reflect that producer dual-emit is gone.
- Annotate `resolveAudioReference` to explain the surviving fallback is the audio-only branch.
- No shape changes.

**Follow-up:**

Keep mockingbird#27 open until the last audio-only conversation is paired with a Transcript or otherwise migrated. Once zero audio-only conversations remain, `Conversation.audioReference` can be dropped from the schema and interface in a follow-up PR (with a consumer-side `dataVersion` bump).

---

### Finding 3 — Conversation transcript triple-field

**Status:** `transcriptUrl` absent (no change needed); `transcript` deprecated; `transcriptId` is the canonical path

**Why:**

`ConversationSchema` (`src/lib/schemas.ts`) and the `Conversation` interface (`src/types/index.ts`) define three transcript-related fields: `transcript`, `transcriptId`, and `transcriptUrl`. `transcriptUrl?: string` existed in both `ConversationSchema` and the `Conversation` interface before this PR — silently optional, never consumed by any component (`grep -rn "transcriptUrl" src/components` returns zero results). This PR removes it from both files. Tolerant-reader compatible: Zod's default `.strip()` silently drops the field if the exporter still emits it.

`transcript?: string` (flat blob) has one live consumer at `src/components/conversations/ConversationDetail.tsx:61–63,128` — the `hasFlatTranscript` branch used as a fallback when no `Transcript` row is joined. It cannot be removed until all data records have a corresponding `transcriptId`.

`transcriptId?: string` is the canonical forward path, joining the `Transcript` collection via `getProjectBundle`.

**This PR:**

- Add `@deprecated` JSDoc to `Conversation.transcript` in both `src/types/index.ts` and `src/lib/schemas.ts`, noting the live fallback consumer at `ConversationDetail.tsx:61–63,128` and that removal is gated on full `transcriptId` backfill.
- No shape changes; Zod's default `.strip()` means any exporter that emits a `transcriptUrl` field would have it silently dropped — tolerant-reader compatible.

**Follow-up:**

Once all `data/` records have a `transcriptId`, remove `Conversation.transcript` from schema and interface, and delete the `hasFlatTranscript` branch in `ConversationDetail.tsx`.

---

### Finding 4 — CommAttachment name/filename mirror

**Status:** `name` deprecated; tolerant-reader fallback retained

**Why:**

`CommAttachmentSchema` (`src/lib/schemas.ts`) and `CommAttachment` (`src/types/index.ts`) both define `filename?: string` and `name?: string`. The producer (atticus-finch `export_mockingbird.py`) always emits both with identical values — confirmed by the JSDoc at `src/types/index.ts:50–53`. The consumer fallback `att.filename ?? att.name` appears at `src/components/communications/CommunicationDetail.tsx:275,337`.

`filename` is the preferred field; `name` is a legacy alias retained because dropping it from the emitted payload would break the schema refine (`filename | name | url | evidenceId` required, `CommAttachmentSchema` in `src/lib/schemas.ts`) on any record where the exporter has already stopped emitting `filename`.

**This PR:**

- Add `@deprecated` JSDoc to `CommAttachment.name` in `src/types/index.ts` and `CommAttachmentSchema`'s `name` field comment in `src/lib/schemas.ts`, noting the consumer fallback and that removal is gated on the exporter stopping `name` emission.
- No shape changes; the tolerant-reader fallback `att.filename ?? att.name` remains correct.

**Follow-up:**

[b4le/atticus-finch#69](https://github.com/b4le/atticus-finch/issues/69) — once the exporter stops emitting `name`, remove it from the schema refine guard and the interface. Update `CommunicationDetail.tsx` to drop the `?? att.name` fallback.

---

### Finding 5 — Communication link-array sprawl

**Status:** Invariant checks added for the three permissive arrays

**Why:**

`CommunicationSchema` (`src/lib/schemas.ts`) declares five required link arrays:

| Field | Current invariant coverage |
|---|---|
| `actionItemIds` | `checkActionBackref` — full drift check |
| `evidenceIds` | `checkEvidenceBackref` — full drift check |
| `claimIds` | `checkCommunicationClaimIds` — full drift check (`src/types/index.ts:131`) |
| `riskIds` | `checkCommunicationRiskIds` — full drift check (`src/types/index.ts:135`) |
| `conversationIds` | `checkCommunicationConversationIds` — full drift check (`src/types/index.ts:137`) |

Three of the five required arrays have no cross-collection integrity enforcement. This makes the schema self-inconsistent: fields are declared required (implying completeness) but their referential integrity is unverified. Adding invariant checks closes this gap without changing the schema shape.

All five arrays remain **required** (not relaxed to `.optional()`). Relaxing them would break the existing backref checks, which dereference `comm.actionItemIds.includes(...)` and `comm.evidenceIds.includes(...)` without a presence guard — per the `AGENTS.md` "Schema coupling (load-bearing)" warning. Any new checks added here follow the same pattern and carry the same coupling constraint.

**This PR:**

Three new pure functions in `src/lib/invariants.ts`, each following the `checkActionBackref` template:

- `checkCommunicationClaimIds(report, communications, claims)` — for each `comm.claimIds[i]`, verifies a `Claim` with that id exists.
- `checkCommunicationRiskIds(report, communications, risks)` — for each `comm.riskIds[i]`, verifies a `Risk` with that id exists.
- `checkCommunicationConversationIds(report, communications, conversations)` — for each `comm.conversationIds[i]`, verifies a `Conversation` with that id exists.

Each violation is reported via `report('[backref-drift] ...')`. All three are wired into `getProjectBundle` in `src/lib/data.ts` before `reporter.flush()`. Tests added in `src/lib/__tests__/` covering the happy path and drift cases for each.

**Schema coupling note:** These checks dereference `comm.claimIds`, `comm.riskIds`, `comm.conversationIds` without presence guards — safe only while those fields remain required in `CommunicationSchema`. If a future PR relaxes any of them to `.optional()`, reintroduce `if (!comm.claimIds) continue;` guards in the corresponding check function.

**Follow-up:**

None required for this finding. Invariant coverage is now symmetric across all five link arrays.

---

## Out of scope

The following issue #23 findings are not addressed in this PR:

- **Issue #3** — `Transcript` derivable fields (`cueCount`, `hasCues`, raw `participants`): drop and compute. Deferred; exporter emits them today and the consumer reads them.
- **Issue #6** — `Communication.hasAttachments` derived flag: drop and compute in a selector. Deferred; requires exporter coordination.
- **Issue #7** — Date nullability rules: document "creation/timeline anchors required; due/completed/updated nullable". Deferred; schema-only change but needs a cross-entity audit pass.
- **Issue #9** — Stakeholder presentation fields (`initials`): derive from `name`. Deferred; low-risk but outside this PR's scope.
- **Issue #10** — `TimelineEvent` denormalisation: convert to a thin pointer list. Deferred; requires UI selector and component changes.

Each will be tracked as a follow-up issue or ADR.

---

## Migration / coordination

| Change | Producer-side action | Consumer back-compat window |
|---|---|---|
| `Snippet.date` added to schema | None required; field already emitted | Immediate — schema now accepts what's on disk |
| `Conversation.transcript` deprecated | No change yet | Remove after all records have `transcriptId`; gate on data backfill |
| `CommAttachment.name` deprecated | Stop emitting `name` once consumer fallback removed | Keep `att.filename ?? att.name` until exporter stops dual-emitting |
| `Conversation.audioReference` ownership policy | Stop emitting when `Transcript.audioReference` is set | Consumers prefer `Transcript` copy; fall back to `Conversation` copy until exporter stops dual-emitting |
| New invariant checks (claimIds, riskIds, conversationIds) | Ensure referential integrity in emitted JSON | CI will fail on first bad export — no consumer back-compat concern |

---

## Verification

- `npx tsc --noEmit` passes
- `npx vitest run` passes (including new invariant tests for Findings 5)
- All bidirectional `_AssertX` schema/interface checks in `src/lib/schemas.ts` hold
- `getProjectBundle` continues to return a valid bundle against `data/demo/` and `data/local/` with strict mode off; CI runs with `CI=true` and `reporter.flush()` throws on any drift

---

## Follow-up status (2026-05-20)

Snapshot of the five originally out-of-scope findings, plus F1 (snippet loader) and F2 (audioReference removal), audited against `data/severance/` + `data/demo/`:

| Finding | Status | Notes |
|---|---|---|
| **F1** — Snippet loader + invariant | **Resolved** | `getSnippets` + `checkSnippetBackref` shipped on main; F1's blocker (atticus-finch#71) was resolved upstream. |
| **F2** — `Conversation.audioReference` removal | **Parked** | Field still load-bearing. Severance has one audio-only conversation (`conversation-d738b9e8-…`) and demo has one (`c5`) with no `transcriptId`. Dropping the field would break their player. |
| **F3** — Transcript derivable fields | **Parked** | Exporter still emits `cueCount`, `hasCues`, `participants` for all transcripts in `data/severance/` and `data/demo/`. Re-evaluate after the next atticus-finch sync. |
| **F6** — `Communication.hasAttachments` | **Resolved** | Field dropped from schema + interface — no UI consumer ever read it; callers can compute from `attachments?.length`. |
| **F7** — Date nullability | **Partial** | `Risk.createdDate` and `EvidenceItem.date` tightened to required `IsoDateSchema` (zero null values in either project). `Conversation.date` left nullable — `data/severance` has two legitimately-undated union meetings (`conv-union-undated-*`). |
| **F9** — Derive `Stakeholder.initials` from `name` | **Parked** | `[Privileged]` stakeholder uses `initials: "--"` as an editorial redaction choice; derivation can't reproduce it. Removing the field would force the privileged sentinel into the derivation helper, trading one stored field for one special-case branch — a non-simplification. |
| **F10** — `TimelineEvent` thin pointer | **Already done** | `TimelineEventSchema` (`src/lib/schemas.ts:559`) and the `TimelineEvent` interface already carry only the pointer pair (`linkedEntityId` + `linkedEntityType`); no denormalised fields. No code change needed. |

Migration table follow-ups from this update: `CommAttachment.name` is **still parked** — demo data carries 3 attachments with only `name` and no `filename`, so the consumer-side fallback can't be removed yet. `Conversation.transcript` flat-blob is **resolved** — zero records carry it in either project, schema + UI cascade removed.
