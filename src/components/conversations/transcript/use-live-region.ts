"use client";

import { useEffect, useRef, useState } from "react";
import type { Stakeholder, TranscriptCue } from "@/types";

interface UseSpeakerChangeAnnouncerOptions {
  cues: ReadonlyArray<TranscriptCue>;
  activeCueIndex: number | null;
  speakerStakeholderMap: ReadonlyMap<string, Stakeholder>;
  debounceMs?: number;
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
function buildMessage(label: string): string {
  if (!label.trim()) return "";
  return `Now speaking, ${label}.`;
}

// Announces the active speaker on change, debounced so a rapid run of
// short cues from alternating speakers doesn't spam the screen reader.
// Returns the empty string until at least one announcement is due, which
// keeps the live region inert during initial render.
export function useSpeakerChangeAnnouncer({
  cues,
  activeCueIndex,
  speakerStakeholderMap,
  debounceMs = 2000,
}: UseSpeakerChangeAnnouncerOptions): UseSpeakerChangeAnnouncerResult {
  const [message, setMessage] = useState("");
  const lastAnnouncedLabelRef = useRef<string | null>(null);
  const lastAnnouncedAtRef = useRef<number>(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCue =
    typeof activeCueIndex === "number" && activeCueIndex >= 0
      ? cues[activeCueIndex]
      : undefined;
  const currentLabel = resolveSpeakerLabel(activeCue, speakerStakeholderMap);

  useEffect(() => {
    if (!currentLabel) return;
    if (currentLabel === lastAnnouncedLabelRef.current) return;

    const now = Date.now();
    const elapsed = now - lastAnnouncedAtRef.current;

    const flush = () => {
      lastAnnouncedLabelRef.current = currentLabel;
      lastAnnouncedAtRef.current = Date.now();
      setMessage(buildMessage(currentLabel));
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
  }, [currentLabel, debounceMs]);

  return { message };
}
