"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Stakeholder, Transcript } from "@/types";
import { cn } from "@/lib/utils";
import {
  useAudioPlayerControls,
  useAudioPlayerState,
} from "../AudioPlayerContext";
import { TranscriptToolbar } from "./TranscriptToolbar";
import { TranscriptList, type TranscriptListHandle } from "./TranscriptList";
import { TranscriptEmpty } from "./TranscriptEmpty";
import { useActiveCueIndex } from "./use-active-cue";
import { LiveRegion } from "./LiveRegion";
import { useSpeakerChangeAnnouncer } from "./use-live-region";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { buildTurns, findTurnIndexForCue } from "./turns";
import { useSearchMatches, useSearchNavigation } from "./use-search-matches";

const FOLLOW_AUDIO_PAUSE_MS = 5000;

export interface TranscriptPanelProps {
  transcript: Transcript | null;
  flatTranscript?: string;
  speakerStakeholderMap: ReadonlyMap<string, Stakeholder>;
  onSeek?: (ms: number) => void;
  /**
   * When provided, overrides the audio-derived active index. Tests pass
   * this; production renders rely on the live `useAudioPlayerState`
   * subscription.
   */
  activeCueIndex?: number | null;
  onSearchChange?: (q: string) => void;
  className?: string;
}

export function TranscriptPanel({
  transcript,
  flatTranscript,
  speakerStakeholderMap,
  onSeek,
  activeCueIndex: activeCueIndexOverride,
  onSearchChange,
  className,
}: TranscriptPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [followAudio, setFollowAudio] = useState(true);
  const [followAudioPaused, setFollowAudioPaused] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<TranscriptListHandle | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { currentMs } = useAudioPlayerState();
  const { togglePlay } = useAudioPlayerControls();
  // useMemo so the array identity is stable when `transcript` doesn't change —
  // downstream useCallbacks (next/prev cue/turn handlers) depend on `cues` and
  // would otherwise invalidate every render.
  const cues = useMemo(() => transcript?.cues ?? [], [transcript]);
  const derivedActiveIndex = useActiveCueIndex(cues, currentMs);
  const activeCueIndex =
    activeCueIndexOverride !== undefined
      ? activeCueIndexOverride
      : derivedActiveIndex;

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    onSearchChange?.(q);
  };

  const { matches, totalCount: matchTotalCount } = useSearchMatches(
    cues,
    searchQuery,
  );
  const {
    currentMatchIndex,
    next: nextMatchInternal,
    prev: prevMatchInternal,
  } = useSearchNavigation(matches);

  const searchRangesByCue = useMemo(() => {
    if (matches.length === 0) return undefined;
    const map = new Map<number, [number, number][]>();
    for (const m of matches) map.set(m.cueIndex, m.ranges);
    return map;
  }, [matches]);

  const currentMatchCueIndex =
    currentMatchIndex != null ? matches[currentMatchIndex]?.cueIndex ?? null : null;

  const matchCounterText = (() => {
    if (searchQuery.trim() === "") return "";
    if (matchTotalCount === 0) return "No matches";
    if (currentMatchIndex == null) {
      return matchTotalCount === 1 ? "1 match" : `${matchTotalCount} matches`;
    }
    return `${currentMatchIndex + 1} of ${matchTotalCount}`;
  })();

  const { message: liveMessage } = useSpeakerChangeAnnouncer({
    cues,
    activeCueIndex: activeCueIndex ?? null,
    speakerStakeholderMap,
  });

  const seekToCue = useCallback(
    (cueIndex: number) => {
      const cue = cues[cueIndex];
      if (!cue) return;
      onSeek?.(cue.startMs);
    },
    [cues, onSeek],
  );

  const handleNextCue = useCallback(() => {
    if (cues.length === 0) return;
    const current = typeof activeCueIndex === "number" ? activeCueIndex : -1;
    const next = Math.min(current + 1, cues.length - 1);
    seekToCue(next);
  }, [activeCueIndex, cues.length, seekToCue]);

  const handlePrevCue = useCallback(() => {
    if (cues.length === 0) return;
    const current =
      typeof activeCueIndex === "number" ? activeCueIndex : cues.length;
    const prev = Math.max(current - 1, 0);
    seekToCue(prev);
  }, [activeCueIndex, cues.length, seekToCue]);

  const handleNextTurn = useCallback(() => {
    if (cues.length === 0) return;
    const turns = buildTurns(cues);
    const current = typeof activeCueIndex === "number" ? activeCueIndex : -1;
    const turnIdx = current >= 0 ? findTurnIndexForCue(turns, current) ?? -1 : -1;
    const targetTurn = turns[Math.min(turnIdx + 1, turns.length - 1)];
    if (targetTurn) seekToCue(targetTurn.startCueIndex);
  }, [activeCueIndex, cues, seekToCue]);

  const handlePrevTurn = useCallback(() => {
    if (cues.length === 0) return;
    const turns = buildTurns(cues);
    const current = typeof activeCueIndex === "number" ? activeCueIndex : 0;
    const turnIdx = findTurnIndexForCue(turns, current) ?? 0;
    const targetTurn = turns[Math.max(turnIdx - 1, 0)];
    if (targetTurn) seekToCue(targetTurn.startCueIndex);
  }, [activeCueIndex, cues, seekToCue]);

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    onSearchChange?.("");
  }, [onSearchChange]);

  const handleOpenHelp = useCallback(() => setHelpOpen(true), []);

  useKeyboardShortcuts({
    panelRef,
    onPlayPause: togglePlay,
    onPrevCue: handlePrevCue,
    onNextCue: handleNextCue,
    onPrevTurn: handlePrevTurn,
    onNextTurn: handleNextTurn,
    onFocusSearch: handleFocusSearch,
    onClearSearch: handleClearSearch,
    onOpenHelp: handleOpenHelp,
  });

  const pauseFollowAudio = useCallback(() => {
    setFollowAudioPaused(true);
    if (pauseTimerRef.current != null) {
      clearTimeout(pauseTimerRef.current);
    }
    pauseTimerRef.current = setTimeout(() => {
      setFollowAudioPaused(false);
      pauseTimerRef.current = null;
    }, FOLLOW_AUDIO_PAUSE_MS);
  }, []);

  const handleUserScroll = pauseFollowAudio;

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current != null) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!followAudio || followAudioPaused) return;
    if (typeof activeCueIndex !== "number") return;
    listRef.current?.scrollToCueIndex(activeCueIndex);
  }, [activeCueIndex, followAudio, followAudioPaused]);

  // Wrap next/prev so each user-initiated navigation also pauses follow-audio
  // (mirroring user-scroll pause). Performing the side-effect inside the
  // wrapper keeps it tied to the user gesture and avoids setState-in-effect.
  // Scrolling the current match into view is handled by the effect below,
  // which runs once per `currentMatchIndex` change.
  const nextMatch = useCallback(() => {
    nextMatchInternal();
    pauseFollowAudio();
  }, [nextMatchInternal, pauseFollowAudio]);

  const prevMatch = useCallback(() => {
    prevMatchInternal();
    pauseFollowAudio();
  }, [prevMatchInternal, pauseFollowAudio]);

  const lastScrolledMatchRef = useRef<number | null>(null);

  // Scroll the current match into view when it changes. Tracked by a ref so
  // this only fires on actual navigation, not on unrelated re-renders.
  useEffect(() => {
    if (currentMatchIndex == null) {
      lastScrolledMatchRef.current = null;
      return;
    }
    if (lastScrolledMatchRef.current === currentMatchIndex) return;
    lastScrolledMatchRef.current = currentMatchIndex;
    const cueIndex = matches[currentMatchIndex]?.cueIndex;
    if (typeof cueIndex !== "number") return;
    listRef.current?.scrollToCueIndex(cueIndex);
  }, [currentMatchIndex, matches]);

  if (!transcript) {
    const hasFlat =
      typeof flatTranscript === "string" && flatTranscript.trim() !== "";
    if (!hasFlat) {
      return <TranscriptEmpty kind="none" className={className} />;
    }
    return (
      <TranscriptEmpty
        kind="no-cues"
        flatTranscript={flatTranscript}
        className={className}
      />
    );
  }

  if (transcript.cues.length === 0) {
    return (
      <TranscriptEmpty
        kind="no-cues"
        flatTranscript={flatTranscript}
        className={className}
      />
    );
  }

  return (
    <div ref={panelRef} className={cn("flex h-full flex-col", className)}>
      <LiveRegion message={liveMessage} />
      <TranscriptToolbar
        ref={searchInputRef}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        matchCount={matchTotalCount}
        matchIndex={currentMatchIndex ?? 0}
        matchCounterText={matchCounterText}
        onPrevMatch={prevMatch}
        onNextMatch={nextMatch}
        onClearSearch={handleClearSearch}
        followAudio={followAudio}
        onFollowAudioChange={setFollowAudio}
        onOpenHelp={handleOpenHelp}
      />
      <div className="min-h-0 flex-1">
        <TranscriptList
          ref={listRef}
          cues={transcript.cues}
          speakerStakeholderMap={speakerStakeholderMap}
          activeCueIndex={activeCueIndex}
          searchRangesByCue={searchRangesByCue}
          currentMatchCueIndex={currentMatchCueIndex}
          onSeek={onSeek}
          onUserScroll={handleUserScroll}
        />
      </div>
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
