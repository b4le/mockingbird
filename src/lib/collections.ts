/**
 * Permissive: render what we know. Silently drops ids not in the map.
 * Use when partial data is acceptable (e.g., UI rendering with stale
 * references).
 *
 * Accepts `undefined` to accommodate optional ID arrays on typed
 * relationships.
 *
 * Note: integrity-level "fail on missing id" checks live in
 * `src/lib/invariants.ts` (see `checkActionBackref` /
 * `checkEvidenceBackref`), which operate on id strings directly — a
 * strict resolve-to-entity variant is not currently needed and was
 * removed to avoid speculative API surface.
 */
export function resolveIds<T extends { id: string }>(
  ids: readonly string[] | undefined,
  map: ReadonlyMap<string, T>,
): T[] {
  if (!ids) return [];
  const out: T[] = [];
  for (const id of ids) {
    const v = map.get(id);
    if (v) out.push(v);
  }
  return out;
}
