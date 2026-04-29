"use client";

import { useMemo } from "react";
import type { TranscriptCue } from "@/types";

/**
 * Returns the index of the latest cue whose `startMs <= currentMs`, or
 * `null` when `currentMs` precedes every cue (or `cues` is empty).
 *
 * Cues are assumed sorted ascending by `startMs` (the exporter
 * guarantees this; transcripts.json verifies). Binary search keeps the
 * cost O(log n) per audio tick — at ~10Hz against a 500-cue transcript
 * this is well under any perceptible budget.
 */
export function findActiveCueIndex(
  cues: ReadonlyArray<Pick<TranscriptCue, "startMs">>,
  currentMs: number,
): number | null {
  if (cues.length === 0) return null;
  if (currentMs < cues[0].startMs) return null;

  let lo = 0;
  let hi = cues.length - 1;
  while (lo < hi) {
    // Bias the midpoint upward so the loop converges on the LAST index
    // with `startMs <= currentMs` rather than the first.
    const mid = lo + Math.ceil((hi - lo) / 2);
    if (cues[mid].startMs <= currentMs) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

export function useActiveCueIndex(
  cues: ReadonlyArray<Pick<TranscriptCue, "startMs">>,
  currentMs: number,
): number | null {
  return useMemo(
    () => findActiveCueIndex(cues, currentMs),
    [cues, currentMs],
  );
}
