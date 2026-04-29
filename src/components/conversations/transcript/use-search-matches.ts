"use client";

import { useCallback, useMemo, useState } from "react";
import type { TranscriptCue } from "@/types";

export interface CueMatch {
  cueIndex: number;
  ranges: [number, number][];
}

export interface SearchMatchesResult {
  matches: CueMatch[];
  totalCount: number;
}

const EMPTY_RESULT: SearchMatchesResult = { matches: [], totalCount: 0 };

// Case-insensitive substring scan using indexOf — no regex, so user input like
// `.*` matches literally without an escape step. No cross-cue matching: each
// cue's `text` is searched independently.
export function useSearchMatches(
  cues: TranscriptCue[],
  query: string,
): SearchMatchesResult {
  return useMemo(() => {
    const trimmed = query.trim();
    if (trimmed === "") return EMPTY_RESULT;
    const needle = trimmed.toLowerCase();
    const needleLen = needle.length;

    const matches: CueMatch[] = [];
    let total = 0;

    for (let i = 0; i < cues.length; i++) {
      const text = cues[i].text;
      const haystack = text.toLowerCase();
      const ranges: [number, number][] = [];
      let from = 0;
      while (from <= haystack.length - needleLen) {
        const idx = haystack.indexOf(needle, from);
        if (idx === -1) break;
        ranges.push([idx, idx + needleLen]);
        from = idx + needleLen;
      }
      if (ranges.length > 0) {
        matches.push({ cueIndex: i, ranges });
        total += ranges.length;
      }
    }

    if (matches.length === 0) return EMPTY_RESULT;
    return { matches, totalCount: total };
  }, [cues, query]);
}

export interface SearchNavigation {
  currentMatchIndex: number | null;
  next: () => void;
  prev: () => void;
  setCurrentMatchIndex: (n: number | null) => void;
}

// Resets `currentMatchIndex` to null whenever the `matches` array identity
// changes — callers memoize the array via `useSearchMatches`, so this fires
// exactly when the match set changes (new query, new cues). The reset is done
// during render via the controlled-component pattern (state derived from
// props) rather than inside an effect, so the next render sees a fresh index
// without an extra paint.
export function useSearchNavigation(matches: CueMatch[]): SearchNavigation {
  const [state, setState] = useState<{
    matches: CueMatch[];
    currentMatchIndex: number | null;
  }>({ matches, currentMatchIndex: null });

  if (state.matches !== matches) {
    setState({ matches, currentMatchIndex: null });
  }

  const currentMatchIndex =
    state.matches === matches ? state.currentMatchIndex : null;

  const next = useCallback(() => {
    setState((s) => {
      if (s.matches.length === 0) {
        return s.currentMatchIndex == null ? s : { ...s, currentMatchIndex: null };
      }
      const nextIndex =
        s.currentMatchIndex == null
          ? 0
          : (s.currentMatchIndex + 1) % s.matches.length;
      return { ...s, currentMatchIndex: nextIndex };
    });
  }, []);

  const prev = useCallback(() => {
    setState((s) => {
      if (s.matches.length === 0) {
        return s.currentMatchIndex == null ? s : { ...s, currentMatchIndex: null };
      }
      const prevIndex =
        s.currentMatchIndex == null
          ? s.matches.length - 1
          : (s.currentMatchIndex - 1 + s.matches.length) % s.matches.length;
      return { ...s, currentMatchIndex: prevIndex };
    });
  }, []);

  const setCurrentMatchIndex = useCallback((n: number | null) => {
    setState((s) => ({ ...s, currentMatchIndex: n }));
  }, []);

  return { currentMatchIndex, next, prev, setCurrentMatchIndex };
}
