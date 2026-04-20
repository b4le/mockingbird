/**
 * Resolves a list of entity IDs against a lookup map, dropping any IDs
 * that don't resolve. Accepts `undefined` to accommodate optional ID
 * arrays on typed relationships.
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
