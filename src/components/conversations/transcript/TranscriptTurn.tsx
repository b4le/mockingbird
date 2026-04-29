"use client";

import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import type { Stakeholder, TranscriptCue as TranscriptCueModel } from "@/types";
import { cn } from "@/lib/utils";
import { formatTime } from "./format-time";
import { TranscriptCue } from "./TranscriptCue";

export interface Turn {
  speakerLabel: string;
  speakerId?: string;
  startCueIndex: number;
  endCueIndex: number;
}

interface TranscriptTurnProps {
  turn: Turn;
  cues: TranscriptCueModel[];
  stakeholder?: Stakeholder;
  activeCueIndex?: number | null;
  searchRangesByCue?: ReadonlyMap<number, [number, number][]>;
  currentMatchCueIndex?: number | null;
  onSeek?: (ms: number) => void;
  className?: string;
}

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TranscriptTurn({
  turn,
  cues,
  stakeholder,
  activeCueIndex,
  searchRangesByCue,
  currentMatchCueIndex,
  onSeek,
  className,
}: TranscriptTurnProps) {
  const firstCue = cues[turn.startCueIndex];
  const speakerName = stakeholder?.name ?? turn.speakerLabel;

  return (
    <div className={cn("space-y-1.5 py-2", className)}>
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {stakeholder ? (
          <StakeholderAvatar stakeholder={stakeholder} size="sm" />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
          >
            {initialsFromLabel(turn.speakerLabel)}
          </span>
        )}
        <span className="text-xs font-medium">{speakerName}</span>
        <span
          className="font-mono text-[10px] tabular-nums text-muted-foreground"
          aria-label={`Starts at ${formatTime(firstCue?.startMs ?? 0)}`}
        >
          {formatTime(firstCue?.startMs ?? 0)}
        </span>
      </div>
      <ul className="space-y-0.5">
        {cues
          .slice(turn.startCueIndex, turn.endCueIndex + 1)
          .map((cue, offset) => {
            const idx = turn.startCueIndex + offset;
            return (
              <li key={idx}>
                <TranscriptCue
                  index={idx}
                  text={cue.text}
                  startMs={cue.startMs}
                  isActive={activeCueIndex === idx}
                  isPlayed={
                    typeof activeCueIndex === "number" && idx < activeCueIndex
                  }
                  searchRanges={searchRangesByCue?.get(idx)}
                  isCurrentMatch={currentMatchCueIndex === idx}
                  onSeek={onSeek}
                />
              </li>
            );
          })}
      </ul>
    </div>
  );
}
