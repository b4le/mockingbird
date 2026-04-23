import type { Communication, Conversation } from "@/types";

/**
 * Cross-collection invariant checks for the project data bundle.
 *
 * Per-collection shape is enforced by zod in `src/lib/schemas.ts`. Some
 * consistency rules span two or more collections and cannot be expressed
 * at the schema layer, because each JSON file is loaded independently by
 * `loadValidated` — by the time one collection's schema runs, its siblings
 * do not exist yet. Those cross-collection checks live here and are wired
 * into `getProjectBundle` (see `src/lib/data.ts`).
 *
 * ## Policy
 *
 * Violations are reported via {@link createReporter} — strict mode throws
 * (gating CI), non-strict logs a `console.warn` (keeping dev iteration
 * unblocked). The strict boolean is threaded in as a parameter from
 * `getProjectBundle`, so every function in this file is a pure function of
 * its inputs (no `process.env` reads here — that's the caller's job).
 *
 * ## Schema coupling (load-bearing)
 *
 * The checks below dereference `comm.actionItemIds.includes(...)` and
 * `comm.evidenceIds.includes(...)` without a presence guard. This is
 * correct ONLY because `Communication.actionItemIds` and
 * `Communication.evidenceIds` are declared REQUIRED (not `.optional()`)
 * in `CommunicationSchema`. If a future change relaxes those fields
 * back to optional, these checks will crash with `Cannot read properties
 * of undefined (reading 'includes')` instead of cleanly reporting drift —
 * strictly worse than before. Keep the schema fields required, or
 * reintroduce `if (!comm.actionItemIds) continue;` style guards here.
 */

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

/**
 * Returns a reporter function that either throws (strict mode, in CI) or
 * warns (dev). The `strict` boolean is passed in by the caller rather than
 * read from `process.env` here, so every check in this file remains a pure
 * function of its inputs — callers do the environment read once, at the
 * `getProjectBundle` boundary.
 *
 * @example
 * ```ts
 * const report = createReporter(process.env.CI === "true");
 * checkActionBackref(report, actions, communications, conversations);
 * ```
 */
export function createReporter(strict: boolean): (msg: string) => void {
  return (msg) => {
    if (strict) throw new Error(msg);
    console.warn(msg);
  };
}

// ---------------------------------------------------------------------------
// Check inputs
// ---------------------------------------------------------------------------

/**
 * Minimal shape shared by `ActionItem` and `EvidenceItem` for the backref
 * checks — they only need the id and the polymorphic source pointer, so the
 * parameter type does not have to be the full entity.
 */
export interface SourceBacked {
  id: string;
  sourceEntityId: string | null;
  sourceEntityType: "conversation" | "communication" | null;
}

// ---------------------------------------------------------------------------
// Backref checks
// ---------------------------------------------------------------------------

/**
 * Cross-collection consistency check for the action→parent origin link.
 *
 * Semantics (permissive linked-items lists):
 * - Each ActionItem has a single `sourceEntityId` + `sourceEntityType`
 *   — the single source of truth for where the row *originated*.
 * - `Communication.actionItemIds` and `Conversation.actionItemIds` are
 *   LINKED-ITEMS lists. They MUST include the origin (the action where
 *   `sourceEntityId == this.id`) and MAY include additional related
 *   items that surfaced, were referenced, or were otherwise discussed
 *   in that thread/meeting without originating there. Extras are
 *   narrative richness, not drift.
 *
 * So this check is deliberately one-directional: for every action whose
 * origin points at a parent, the parent's linked list must mirror the
 * link. The reverse — ids in the parent's list whose action's origin
 * points elsewhere — is expected and not a violation.
 *
 * Pure function of its inputs: the `report` callback (produced by
 * {@link createReporter}) encapsulates the strict/warn policy.
 */
export function checkActionBackref(
  report: (msg: string) => void,
  items: SourceBacked[],
  communications: Communication[],
  conversations: Conversation[],
): void {
  const commById = new Map(communications.map((c) => [c.id, c]));
  const convById = new Map(conversations.map((c) => [c.id, c]));

  for (const item of items) {
    if (item.sourceEntityId === null || item.sourceEntityType === null) {
      continue;
    }

    if (item.sourceEntityType === "communication") {
      const comm = commById.get(item.sourceEntityId);
      if (!comm) {
        report(
          `[backref-drift] action ${item.id} references missing communication ${item.sourceEntityId}`,
        );
        continue;
      }
      // Schema coupling: `comm.actionItemIds` is required by CommunicationSchema.
      // See top-of-file "Schema coupling" note before relaxing the schema.
      if (!comm.actionItemIds.includes(item.id)) {
        report(
          `[backref-drift] action ${item.id} claims source ${comm.id} but ${comm.id}.actionItemIds does not include it`,
        );
      }
      continue;
    }

    // sourceEntityType === "conversation"
    const conv = convById.get(item.sourceEntityId);
    if (!conv) {
      report(
        `[backref-drift] action ${item.id} references missing conversation ${item.sourceEntityId}`,
      );
      continue;
    }
    if (!conv.actionItemIds.includes(item.id)) {
      report(
        `[backref-drift] action ${item.id} claims source ${conv.id} but ${conv.id}.actionItemIds does not include it`,
      );
    }
  }
}

/**
 * Cross-collection consistency check for the evidence→parent origin link.
 *
 * Evidence only back-references communications here. The signature
 * intentionally omits conversations: Conversation has no `evidenceIds`
 * field, so an evidence row whose `sourceEntityType === "conversation"`
 * has no parent list to mirror — there is nothing a backref check can
 * usefully verify. Restricting the parameter list makes that structural,
 * preventing future callers from passing conversations under the
 * mistaken assumption that this function will check them.
 *
 * Policy matches `checkActionBackref`: pure function, strict/warn is
 * encapsulated in the `report` callback.
 */
export function checkEvidenceBackref(
  report: (msg: string) => void,
  items: SourceBacked[],
  communications: Communication[],
): void {
  const commById = new Map(communications.map((c) => [c.id, c]));

  for (const item of items) {
    if (item.sourceEntityId === null || item.sourceEntityType === null) {
      continue;
    }

    if (item.sourceEntityType === "communication") {
      const comm = commById.get(item.sourceEntityId);
      if (!comm) {
        report(
          `[backref-drift] evidence ${item.id} references missing communication ${item.sourceEntityId}`,
        );
        continue;
      }
      // Schema coupling: `comm.evidenceIds` is required by CommunicationSchema.
      // See top-of-file "Schema coupling" note before relaxing the schema.
      if (!comm.evidenceIds.includes(item.id)) {
        report(
          `[backref-drift] evidence ${item.id} claims source ${comm.id} but ${comm.id}.evidenceIds does not include it`,
        );
      }
      continue;
    }

    // sourceEntityType === "conversation": no parent list to mirror
    // (Conversation has no evidenceIds field), so nothing to check.
  }
}
