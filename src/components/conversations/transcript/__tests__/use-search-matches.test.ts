import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import {
  useSearchMatches,
  useSearchNavigation,
} from "../use-search-matches";
import type { TranscriptCue } from "@/types";

afterEach(() => {
  cleanup();
});

function cue(text: string, startMs = 0): TranscriptCue {
  return { startMs, endMs: startMs + 1000, speaker: "Ben", text };
}

describe("useSearchMatches", () => {
  it("returns empty for empty query", () => {
    const cues = [cue("hello world")];
    const { result } = renderHook(() => useSearchMatches(cues, ""));
    expect(result.current.matches).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it("returns empty for whitespace-only query", () => {
    const cues = [cue("hello world")];
    const { result } = renderHook(() => useSearchMatches(cues, "   \t\n"));
    expect(result.current.matches).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it("matches case-insensitively on a single cue", () => {
    const cues = [cue("Hello World")];
    const { result } = renderHook(() => useSearchMatches(cues, "hello"));
    expect(result.current.totalCount).toBe(1);
    expect(result.current.matches).toEqual([
      { cueIndex: 0, ranges: [[0, 5]] },
    ]);
  });

  it("returns multiple matches with correct ranges across multiple cues", () => {
    const cues = [
      cue("foo bar baz", 0),
      cue("nothing here", 1000),
      cue("BAR is bar", 2000),
    ];
    const { result } = renderHook(() => useSearchMatches(cues, "bar"));
    expect(result.current.totalCount).toBe(3);
    expect(result.current.matches).toEqual([
      { cueIndex: 0, ranges: [[4, 7]] },
      { cueIndex: 2, ranges: [[0, 3], [7, 10]] },
    ]);
  });

  it("treats special regex characters as literals", () => {
    const cues = [cue("see .* here and .*there")];
    const { result } = renderHook(() => useSearchMatches(cues, ".*"));
    expect(result.current.totalCount).toBe(2);
    expect(result.current.matches).toEqual([
      { cueIndex: 0, ranges: [[4, 6], [16, 18]] },
    ]);
  });

  it("finds all occurrences within a very long cue", () => {
    const text = "ab".repeat(500);
    const cues = [cue(text)];
    const { result } = renderHook(() => useSearchMatches(cues, "ab"));
    expect(result.current.totalCount).toBe(500);
    expect(result.current.matches[0].ranges.length).toBe(500);
    expect(result.current.matches[0].ranges[0]).toEqual([0, 2]);
    expect(result.current.matches[0].ranges[499]).toEqual([998, 1000]);
  });

  it("memoizes on cues + query identity", () => {
    const cues = [cue("hello")];
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useSearchMatches(cues, q),
      { initialProps: { q: "hello" } },
    );
    const first = result.current;
    rerender({ q: "hello" });
    expect(result.current).toBe(first);
  });
});

describe("useSearchNavigation", () => {
  it("returns null currentMatchIndex initially", () => {
    const { result } = renderHook(() => useSearchNavigation([]));
    expect(result.current.currentMatchIndex).toBeNull();
  });

  it("next() advances through matches and wraps", () => {
    const matches = [
      { cueIndex: 0, ranges: [[0, 1] as [number, number]] },
      { cueIndex: 1, ranges: [[0, 1] as [number, number]] },
      { cueIndex: 2, ranges: [[0, 1] as [number, number]] },
    ];
    const { result } = renderHook(() => useSearchNavigation(matches));
    act(() => result.current.next());
    expect(result.current.currentMatchIndex).toBe(0);
    act(() => result.current.next());
    expect(result.current.currentMatchIndex).toBe(1);
    act(() => result.current.next());
    expect(result.current.currentMatchIndex).toBe(2);
    act(() => result.current.next());
    expect(result.current.currentMatchIndex).toBe(0);
  });

  it("prev() steps backward and wraps", () => {
    const matches = [
      { cueIndex: 0, ranges: [[0, 1] as [number, number]] },
      { cueIndex: 1, ranges: [[0, 1] as [number, number]] },
    ];
    const { result } = renderHook(() => useSearchNavigation(matches));
    act(() => result.current.prev());
    expect(result.current.currentMatchIndex).toBe(1);
    act(() => result.current.prev());
    expect(result.current.currentMatchIndex).toBe(0);
    act(() => result.current.prev());
    expect(result.current.currentMatchIndex).toBe(1);
  });

  it("resets to null when matches reference changes", () => {
    const a = [{ cueIndex: 0, ranges: [[0, 1] as [number, number]] }];
    const b = [{ cueIndex: 1, ranges: [[2, 3] as [number, number]] }];
    const { result, rerender } = renderHook(
      ({ m }: { m: typeof a }) => useSearchNavigation(m),
      { initialProps: { m: a } },
    );
    act(() => result.current.next());
    expect(result.current.currentMatchIndex).toBe(0);
    rerender({ m: b });
    expect(result.current.currentMatchIndex).toBeNull();
  });
});
