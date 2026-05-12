"use client";

import { useEffect, useRef, useState } from "react";
import type { Stakeholder, TranscriptCue } from "@/types";

interface UseSpeakerChangeAnnouncerOptions {
  cues: ReadonlyArray<TranscriptCue>;
  activeCueIndex: number | null;
  speakerStakeholderMap: ReadonlyMap<string, Stakeholder>;
  /**
   * Minimum gap between successive speaker-change announcements (in ms).
   * Prevents rapid alternation from spamming the live region.
   * Defaults to 2000ms.
   */
  debounceMs?: number;
  /**
   * Gap (in ms) between `cues[n-1].endMs` and `cues[n].startMs` that triggers
   * a cue-text announcement during a single speaker's monologue. Helps blind
   * users hear position feedback when the speaker doesn't change.
   * Defaults to 3000ms.
   */
  pauseThresholdMs?: number;
  /**
   * When the pause-based trigger has NOT fired for the current cue, announce
   * the cue text every Nth active index (`activeCueIndex % N === 0`).
   * Set to 0 (or any non-positive value) to disable the fallback entirely.
   * Defaults to 5.
   */
  nthCueFallback?: number;
  /**
   * Maximum characters of a cue's text included in the announcement. Longer
   * text is truncated with an ellipsis ("…"). Keeps a single announcement
   * from monopolising the screen reader for many seconds.
   * Defaults to 100.
   */
  maxLength?: number;
}

interface UseSpeakerChangeAnnouncerResult {
  message: string;
}

// Resolves the human-readable label for the active cue's speaker, preferring
// the stakeholder display name when one has been wired up.
function resolveSpeakerLabel(
  cue: TranscriptCue | undefined,
  speakerStakeholderMap: ReadonlyMap<string, Stakeholder>,
): string {
  if (!cue) return "";
  const stakeholder = speakerStakeholderMap.get(cue.speaker);
  return stakeholder?.name ?? cue.speaker ?? "";
}

// Polite live-region copy. Kept short and stable across announcements so AT
// users hear "Now speaking, Adrian" rather than a longer sentence that might
// be cut off by the next debounce flush.
function buildSpeakerMessage(label: string): string {
  if (!label.trim()) return "";
  return `Now speaking, ${label}.`;
}

// Truncate to `maxLength` total characters, ending with an ellipsis when
// truncation occurred. Strips trailing whitespace before the ellipsis so the
// screen reader doesn't pause awkwardly mid-word break.
function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  // Reserve 1 char for the ellipsis.
  const head = trimmed.slice(0, Math.max(0, maxLength - 1)).replace(/\s+$/, "");
  return `${head}…`;
}

// Announces the active speaker on change, with two additional triggers for
// long monologues so screen-reader users still hear position feedback:
//
//   1. Speaker change   → "Now speaking, <name>." (debounced)
//   2. Long pause       → announce the new cue's text (truncated)
//   3. Every Nth cue    → announce the new cue's text (truncated)
//
// Speaker-change announcements take precedence on the same transition so we
// never double-announce a single cue advance. Returns an empty string until
// at least one announcement is due, which keeps the live region inert during
// initial render.
export function useSpeakerChangeAnnouncer({
  cues,
  activeCueIndex,
  speakerStakeholderMap,
  debounceMs = 2000,
  pauseThresholdMs = 3000,
  nthCueFallback = 5,
  maxLength = 100,
}: UseSpeakerChangeAnnouncerOptions): UseSpeakerChangeAnnouncerResult {
  const [message, setMessage] = useState("");
  const lastAnnouncedLabelRef = useRef<string | null>(null);
  const lastAnnouncedAtRef = useRef<number>(0);
  const lastAnnouncedCueIndexRef = useRef<number | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCue =
    typeof activeCueIndex === "number" && activeCueIndex >= 0
      ? cues[activeCueIndex]
      : undefined;
  const currentLabel = resolveSpeakerLabel(activeCue, speakerStakeholderMap);

  // ──────────────────────────────────────────────────────────────────────
  // Speaker-change announcement (debounced).
  //
  // Owns its own effect so the debounce timer lifecycle stays self-contained.
  // When this fires, we also stamp `lastAnnouncedCueIndexRef` so the
  // cue-advance effect below skips the same transition (no double-announce).
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentLabel) return;
    if (currentLabel === lastAnnouncedLabelRef.current) return;

    const now = Date.now();
    const elapsed = now - lastAnnouncedAtRef.current;
    const indexAtScheduleTime = activeCueIndex;

    const flush = () => {
      lastAnnouncedLabelRef.current = currentLabel;
      lastAnnouncedAtRef.current = Date.now();
      lastAnnouncedCueIndexRef.current = indexAtScheduleTime;
      setMessage(buildSpeakerMessage(currentLabel));
    };

    if (pendingTimerRef.current != null) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }

    if (lastAnnouncedAtRef.current === 0 || elapsed >= debounceMs) {
      flush();
      return;
    }

    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      flush();
    }, debounceMs - elapsed);

    return () => {
      if (pendingTimerRef.current != null) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [currentLabel, debounceMs, activeCueIndex]);

  // ──────────────────────────────────────────────────────────────────────
  // Cue-advance announcement (pause-based or every Nth cue).
  //
  // Runs after the speaker effect. The double-announce guard is two-fold:
  //   1. If the speaker effect already announced this `activeCueIndex`,
  //      `lastAnnouncedCueIndexRef` matches and we skip.
  //   2. If the speaker effect will announce on the *next* render (because
  //      `currentLabel` differs from `lastAnnouncedLabelRef.current`), we
  //      yield to it: speaker-change carries the new cue context implicitly.
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof activeCueIndex !== "number" || activeCueIndex < 0) return;
    if (!activeCue) return;

    // Yield to the speaker-change effect on this same render.
    if (currentLabel && currentLabel !== lastAnnouncedLabelRef.current) return;

    // Skip if we already announced this index (either as a speaker change
    // or a previous cue-advance announcement).
    if (lastAnnouncedCueIndexRef.current === activeCueIndex) return;

    const prevCue = activeCueIndex > 0 ? cues[activeCueIndex - 1] : undefined;
    const gap = prevCue ? activeCue.startMs - prevCue.endMs : 0;
    const pauseTriggered =
      prevCue !== undefined && gap > pauseThresholdMs;
    const nthTriggered =
      nthCueFallback > 0 &&
      activeCueIndex > 0 &&
      activeCueIndex % nthCueFallback === 0;

    if (!pauseTriggered && !nthTriggered) return;

    lastAnnouncedCueIndexRef.current = activeCueIndex;
    setMessage(truncate(activeCue.text, maxLength));
  }, [
    activeCueIndex,
    activeCue,
    cues,
    currentLabel,
    pauseThresholdMs,
    nthCueFallback,
    maxLength,
  ]);

  return { message };
}
