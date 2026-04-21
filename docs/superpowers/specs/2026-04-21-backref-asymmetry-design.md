# Design: ActionItem / EvidenceItem ↔ Communication back-reference asymmetry

Date: 2026-04-21
Author: Ben Purslow (with Claude Opus 4.7)
Input: `local-state/reviews/20260420-communications/architect.md` finding #2
Branch: `worktree-backref-asymmetry` off `main@273818a`

## Problem

`ActionItem.conversationId: string | null` and `EvidenceItem.conversationId: string | null` point only at conversations. When an action or evidence originated from a Communication, the Communication back-refs it via `actionItemIds` / `evidenceIds` but the action / evidence cannot name the communication as its source. Today the demo JSON contains rows with dual attribution — e.g. `actions.json#a10.conversationId == "c8"` AND `communications.json#co1.actionItemIds == ["a10"]` — two claimed origins for the same action, no single source of truth.

## Decision

**Option (i) from the review, with one clarification** (the review was ambiguous on whether `conversationId` is kept or replaced):

```ts
// src/types/index.ts — applied to ActionItem AND EvidenceItem
// REMOVE: conversationId: string | null
// ADD:
sourceEntityId: string | null;
sourceEntityType: 'conversation' | 'communication' | null;
```

Matches the existing `TimelineEvent.linkedEntityId` + `linkedEntityType` pattern already modelled in `src/types/index.ts:134-149` and `src/lib/schemas.ts:221-230`. One polymorphic pointer per row.

### Rejected alternatives

- **Option (ii) drop `conversationId`, rely on `Communication.actionItemIds` / `.evidenceIds` + `Conversation.actionItemIds`**: requires adding `evidenceIds` to `Conversation` (Conversation currently has no `evidenceIds`), and makes answering "where did this action come from?" an O(C+M) scan across two collections for every render. No.
- **Option (iii) discriminated union `source: { kind, id } | null`**: cleaner TS idiom but inconsistent with `TimelineEvent`. One pattern per codebase wins over two.

## Invariants

1. `sourceEntityId` is `null` iff `sourceEntityType` is `null`. Enforced by a `.refine()` on each zod schema (tighter than `TimelineEvent`, but the TimelineEvent pattern is permissive by historical accident, not by intent).
2. If `sourceEntityType === 'communication'`, the referenced Communication's `actionItemIds` / `evidenceIds` must include this row's id. **Not** enforced by zod (cross-collection). Enforced by a runtime consistency check in `src/lib/data.ts::getProjectBundle` that logs `console.warn` on mismatch. Build stays green; the warning catches drift during future data edits.
3. `EvidenceItem.sourceType` (existing: `'document' | 'conversation' | 'metric' | 'external'`) is a categorisation of the evidence medium, not a pointer — it stays. Orthogonal to `sourceEntityType`.

## Data migration (data/demo/\*.json)

Rows with ambiguous dual attribution, resolved by reading narrative context:

| Row | Before `conversationId` | Forward-ref claiming it | Chosen source | Reasoning |
|-----|-----|-----|-----|-----|
| a10 | `"c8"` | `co1.actionItemIds` | **co1** (communication) | Slack debug co1 Mar 17 predates post-mortem c8; post-mortem was downstream |
| a5  | `"c5"` | `co4.actionItemIds` | **co4** (communication) | Beta-tester email co4 Mar 27 is the origin; c5 was downstream triage |
| a9  | `"c3"` | `co7.actionItemIds` | **co7** (communication) | The specific CTA variant was picked in Slack co7; c3 review was higher-level |
| a6  | `"c9"` | `co5.actionItemIds` | **c9** (conversation) | Apr 5 stakeholder update raised it; co5 was downstream readiness ref |
| e7  | `"c3"` | `co2.evidenceIds` | **co2** (communication) | The PDF is attached to Priya's email co2; c3 was the earlier live session |

Rows with a single source today:
- a1, a2, a3, a4, a7, a8, a11, a12, a13, a14: `conversationId` → `sourceEntityType: 'conversation'`, `sourceEntityId: <same>`
- a15: `conversationId: null` → both new fields `null`
- e1, e4, e5, e6, e8: `conversationId: <c*>` → `sourceEntityType: 'conversation'`, same id
- e2, e3, e9, e10: `conversationId: null` — e9 gains `source = co4` (previously had no source but is listed in `co4.evidenceIds`); others stay fully null

After migration, `Communication.actionItemIds` and `Communication.evidenceIds` remain on the Communication side as a denormalised fast-lookup cache. The new source field on the action / evidence is the single source of truth; the Communication back-ref is derivable from it.

## UI changes (acceptance criterion #4)

Add provenance rendering in three places:

1. **ActionTable** (`src/components/actions/ActionTable.tsx`) — desktop table and mobile card. A new column / footer line "from: <title>" with a channel/medium icon matching the existing `CONVERSATION_MEDIUM_ICONS` / `COMMUNICATION_CHANNEL_ICONS` maps.
2. **EvidencePageClient** (`src/components/evidence/EvidencePageClient.tsx`) — inside the expanded evidence card, alongside the existing source metadata line.
3. **StakeholderDetailDialog** (`src/components/shared/StakeholderDetailDialog.tsx`) — under each assigned action: "from: <title>".

Render helper: a single `resolveSourceLabel(item, conversationMap, communicationMap)` pure function returning `{ icon, label, title } | null`, placed in `src/lib/stakeholder-activity.ts` (alongside the other derived-state helpers).

## Files changed (projected)

- `src/types/index.ts` — 2 interfaces edited
- `src/lib/schemas.ts` — 2 schemas edited, 2 refines added
- `src/lib/data.ts` — consistency check in `getProjectBundle`
- `src/lib/stakeholder-activity.ts` — new `resolveSourceLabel` helper
- `data/demo/actions.json` — 15 rows rewritten
- `data/demo/evidence.json` — 10 rows rewritten
- `src/components/actions/ActionTable.tsx` — add provenance column
- `src/components/actions/ActionsPageClient.tsx` — pipe `communications` prop through to ActionTable
- `src/app/[project]/actions/page.tsx` — already destructures communications, no change expected
- `src/components/evidence/EvidencePageClient.tsx` — pipe `conversations` + `communications` props; render in expanded card
- `src/app/[project]/evidence/page.tsx` — extend destructure to include conversations, communications
- `src/components/shared/StakeholderDetailDialog.tsx` — render source line per assigned action

## Out of scope

Findings #1 (timeline backfill), #4 (type comment), #9 (relational arrays required-with-empty) from the review. Separate WIs.

## Acceptance

1. `npm run build` green under the new schema
2. Every ActionItem / EvidenceItem row has unambiguous single-source provenance (the invariant holds across all demo data)
3. `Communication.actionItemIds` / `.evidenceIds` mirror the new source field (consistency check reports zero warnings)
4. StakeholderDetailDialog + action / evidence pages render `from {title}` without regressions
5. `javascript-typescript:typescript-pro` + `comprehensive-review:architect-review` return GO
6. Merge to `main` with `--merge` (no squash) preserving commit history
