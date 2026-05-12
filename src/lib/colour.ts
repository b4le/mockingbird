/**
 * Deterministic hash → 0..359 hue.
 *
 * Same input always yields the same hue across renders, processes, and machines.
 * Used to colour unresolved-speaker elements (transcript rails, avatar fallbacks)
 * consistently so a given label reads as the same "person" anywhere it appears.
 *
 * The hash itself is a standard 31-based string hash (same family as
 * `java.lang.String.hashCode`), then folded to a non-negative integer with
 * `Math.abs` and reduced modulo 360.
 *
 * Edge cases:
 * - Empty string: returns 0 (the loop body never executes, `Math.abs(0) % 360 === 0`).
 * - Unicode: uses `charCodeAt`, so surrogate pairs are hashed as their two
 *   16-bit code units. Stable but not normalised — `"é"` (precomposed) and
 *   `"é"` (combining) hash differently. Acceptable for speaker labels,
 *   which come from a single producer (the atticus-finch exporter).
 */
export function hashStringToHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}
