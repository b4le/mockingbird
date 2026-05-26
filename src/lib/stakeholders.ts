import type { Stakeholder } from "@/types";

export function buildStakeholderMap(
  stakeholders: Stakeholder[],
): Map<string, Stakeholder> {
  return new Map(stakeholders.map((s) => [s.id, s]));
}

/**
 * Derive avatar initials from a stakeholder's display name. Replaces the
 * formerly-stored `Stakeholder.initials` field — derivation reproduced the
 * stored value exactly for all 25 real stakeholders across both projects.
 *
 * Rule:
 * - A fully bracketed name (`[Privileged]`, `[Redacted]`, …) is a redaction
 *   sentinel: return `"--"` rather than fake-looking real initials. This
 *   preserves the privilege-redaction marker the data used to carry inline.
 * - Otherwise strip non-letters, then take the first letter of the first and
 *   last words (two words+), or the first two letters (single word). Empty
 *   results fall back to `"--"`.
 */
export function getStakeholderInitials(name: string): string {
  if (/^\[.+\]$/.test(name.trim())) return "--";
  const words = name.replace(/[^A-Za-z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "--";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
