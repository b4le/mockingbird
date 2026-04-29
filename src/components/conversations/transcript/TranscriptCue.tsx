"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "./format-time";

interface TranscriptCueProps {
  index: number;
  text: string;
  startMs: number;
  isActive?: boolean;
  isPlayed?: boolean;
  searchRanges?: [number, number][];
  isCurrentMatch?: boolean;
  onSeek?: (ms: number) => void;
}

function renderTextWithMarks(
  text: string,
  ranges: [number, number][] | undefined,
  isCurrentMatch: boolean,
): ReactNode {
  if (!ranges || ranges.length === 0) return text;
  const markClass = isCurrentMatch
    ? "bg-yellow-300 text-foreground rounded-sm px-0.5"
    : "bg-yellow-200/60 text-foreground rounded-sm px-0.5";

  const segments: ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < ranges.length; i++) {
    const [start, end] = ranges[i];
    if (cursor < start) {
      segments.push(
        <Fragment key={`t-${cursor}`}>{text.slice(cursor, start)}</Fragment>,
      );
    }
    segments.push(
      <mark key={`m-${start}`} className={markClass}>
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push(
      <Fragment key={`t-${cursor}`}>{text.slice(cursor)}</Fragment>,
    );
  }
  return segments;
}

export function TranscriptCue({
  index,
  text,
  startMs,
  isActive = false,
  isPlayed = false,
  searchRanges,
  isCurrentMatch = false,
  onSeek,
}: TranscriptCueProps) {
  return (
    <button
      type="button"
      data-cue-index={index}
      // aria-pressed only on the active cue: a cue is a "selectable" target,
      // not a toggle — non-active buttons render no pressed state at all.
      aria-pressed={isActive ? true : undefined}
      aria-current={isActive ? "true" : undefined}
      onClick={() => onSeek?.(startMs)}
      className={cn(
        "group/cue flex w-full min-h-[44px] items-start gap-3 rounded-md border-l-2 border-transparent px-2 py-1.5 text-left text-sm transition-colors",
        "hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "border-primary bg-primary/10 text-foreground",
        !isActive && isPlayed && "text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 shrink-0 select-none font-mono text-[10px] tabular-nums text-muted-foreground",
          "opacity-0 group-hover/cue:opacity-100 group-focus-visible/cue:opacity-100 max-md:opacity-100",
          isActive && "opacity-100",
        )}
      >
        {formatTime(startMs)}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap">
        {renderTextWithMarks(text, searchRanges, isCurrentMatch)}
      </span>
    </button>
  );
}
