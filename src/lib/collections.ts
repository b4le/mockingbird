/**
 * Permissive: render what we know. Silently drops ids not in the map.
 * Use when partial data is acceptable (e.g., UI rendering with stale
 * references).
 *
 * Accepts `undefined` to accommodate optional ID arrays on typed
 * relationships.
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

/**
 * Strict: integrity check. Throws on the first missing id. Use when a
 * missing id indicates data corruption or a bug worth failing fast on.
 *
 * Matches {@link resolveIds} except it throws instead of silently
 * dropping, and accepts an optional `label` for richer error context.
 */
export function resolveIdsStrict<T extends { id: string }>(
  ids: readonly string[] | undefined,
  map: ReadonlyMap<string, T>,
  label?: string,
): T[] {
  if (!ids) return [];
  const out: T[] = [];
  for (const id of ids) {
    const v = map.get(id);
    if (!v) {
      const context = label ?? `map of size ${map.size}`;
      throw new Error(
        `resolveIdsStrict: id "${id}" missing from ${context}`,
      );
    }
    out.push(v);
  }
  return out;
}
