import { describe, it, expect } from "vitest";
import { resolveIds } from "@/lib/collections";

interface Named {
  id: string;
  name: string;
}

/**
 * `makeMap` is the only fixture helper needed here. `resolveIds` is generic
 * over `T extends { id: string }`, so a minimal `Named` shape exercises the
 * type path without dragging in project types.
 */
function makeMap(entries: Named[]): ReadonlyMap<string, Named> {
  return new Map(entries.map((e) => [e.id, e]));
}

const A: Named = { id: "a", name: "Alice" };
const B: Named = { id: "b", name: "Bob" };
const C: Named = { id: "c", name: "Carol" };

describe("resolveIds", () => {
  it.each([
    {
      name: "empty ids array → empty result",
      ids: [] as readonly string[],
      entries: [A, B],
      expected: [] as Named[],
    },
    {
      name: "undefined ids → empty result (permissive optional branch)",
      ids: undefined,
      entries: [A, B],
      expected: [] as Named[],
    },
    {
      name: "all ids resolve → entities returned in input order",
      ids: ["a", "b"],
      entries: [A, B, C],
      expected: [A, B],
    },
    {
      name: "all ids missing → empty result (silent drop)",
      ids: ["x", "y"],
      entries: [A, B],
      expected: [] as Named[],
    },
    {
      name: "mixed resolved/missing → only the resolved ones, preserving input order",
      ids: ["x", "a", "y", "b"],
      entries: [A, B],
      expected: [A, B],
    },
    {
      name: "duplicate input ids → duplicates preserved in output",
      ids: ["a", "a", "b"],
      entries: [A, B],
      expected: [A, A, B],
    },
    {
      name: "empty map, non-empty ids → empty result",
      ids: ["a", "b"],
      entries: [],
      expected: [] as Named[],
    },
    {
      name: "empty map, empty ids → empty result",
      ids: [] as readonly string[],
      entries: [],
      expected: [] as Named[],
    },
  ])("$name", ({ ids, entries, expected }) => {
    // Fresh map per row — no shared mutable state between table entries.
    expect(resolveIds(ids, makeMap(entries))).toEqual(expected);
  });

  it("always returns an array (never undefined) — typed contract", () => {
    // Guards against a regression where `resolveIds` ever returned
    // `undefined` on the early-exit path. Callers pipe the result into
    // `.map()` without a null-guard.
    const result = resolveIds(undefined, makeMap([]));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("preserves reference identity of resolved entities (no clone)", () => {
    // Callers use the returned entities as React keys / in equality checks.
    // If a future refactor added `{ ...v }` spread, this test catches it.
    const map = makeMap([A]);
    const [first] = resolveIds(["a"], map);
    expect(first).toBe(A);
  });

  it("does not mutate the input ids array", () => {
    const ids: string[] = ["a", "missing", "b"];
    const snapshot = [...ids];
    resolveIds(ids, makeMap([A, B]));
    expect(ids).toEqual(snapshot);
  });
});
