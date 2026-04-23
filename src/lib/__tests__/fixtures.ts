import type { SourceBacked } from "@/lib/invariants";
import type { Communication, Conversation } from "@/types";

// ---------------------------------------------------------------------------
// Shared fixture factories for `src/lib/__tests__/*.ts`.
//
// Rule-of-three extraction: three lib test files now want `makeComm` /
// `makeConv` / `makeItem` (invariants + invariants-integration +
// stakeholder-activity). Factoring here keeps the shapes consistent and
// prevents the "fixture helpers drift apart" class of bug that would let a
// test pass for the wrong reason.
//
// Each factory returns a FRESH object on every call. Callers MUST NOT
// mutate arrays passed in via defaults — see the explicit `actionItemIds`
// / `evidenceIds` parameter destructuring below, which captures per-call
// references rather than sharing a module-level default.
// ---------------------------------------------------------------------------

/**
 * Build a minimal {@link Communication} for invariant / stakeholder-activity
 * tests. All required fields get cheap defaults; callers override only what
 * the specific test needs.
 *
 * `actionItemIds` / `evidenceIds` default to fresh empty arrays so that
 * successive calls without arguments never share an array identity — this
 * is load-bearing for table-driven tests that would otherwise accidentally
 * see mutations leak between rows.
 */
export function makeComm(
  id: string,
  options: {
    channel?: Communication["channel"];
    subject?: string;
    actionItemIds?: string[];
    evidenceIds?: string[];
  } = {},
): Communication {
  const {
    channel = "email",
    subject = "Subject line",
    actionItemIds = [],
    evidenceIds = [],
  } = options;
  return {
    id,
    channel,
    date: "2024-01-01",
    subject,
    participantIds: [],
    summary: "",
    messages: [],
    actionItemIds,
    claimIds: [],
    evidenceIds,
    riskIds: [],
    conversationIds: [],
  };
}

/**
 * Build a minimal {@link Conversation}. Callers pass overrides via the
 * second argument; the fresh-default rule from {@link makeComm} applies
 * here too for `actionItemIds`.
 */
export function makeConv(
  id: string,
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id,
    date: "2024-01-01",
    title: "Conversation title",
    participantIds: [],
    summary: "",
    keyPoints: [],
    decisions: [],
    actionItemIds: [],
    ...overrides,
  };
}

/**
 * Build a {@link SourceBacked} row (shared shape for `ActionItem` /
 * `EvidenceItem` in the backref checks).
 */
export function makeItem(
  id: string,
  sourceEntityId: string | null,
  sourceEntityType: "conversation" | "communication" | null,
): SourceBacked {
  return { id, sourceEntityId, sourceEntityType };
}
