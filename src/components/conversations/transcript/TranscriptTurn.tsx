"use client";

import { useTheme } from "next-themes";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import type { Stakeholder, TranscriptCue as TranscriptCueModel } from "@/types";
import { hashStringToHue } from "@/lib/colour";
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
  // `useTheme` from next-themes returns the resolved theme ("light" | "dark"),
  // taking system preference into account when the user has selected "system".
  // It hydrates to `undefined` on first paint — treat that as light for the
  // initial render (matches the project's existing light-default behaviour).
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const firstCue = cues[turn.startCueIndex];
  const speakerName = stakeholder?.name ?? turn.speakerLabel;

  // Hashed hue is reused for the rail (unresolved fallback) AND the avatar
  // background/text — compute once per render so the unresolved speaker reads
  // as a coherent visual unit.
  const hue = hashStringToHue(turn.speakerLabel);

  // Rail colour:
  // - Resolved stakeholder → use their canonical colour (Tailwind-500 family
  //   per demo data, matches `StakeholderAvatar`).
  // - Unresolved → hashed HSL at the same saturation/lightness family as the
  //   resolved palette. Light-mode 35%/55% reads as a muted mid-tone; dark
  //   mode bumps lightness to 65% so the rail stays visible against `bg-card`.
  const railColour =
    stakeholder?.colour ??
    `hsl(${hue}, 35%, ${isDark ? 65 : 55}%)`;

  // Unresolved-avatar colours:
  // - Light: pale tinted pill (`30% 85%`) with darker initials — reads as the
  //   same family as resolved avatars but visibly "unresolved" (lighter, less
  //   saturated). WCAG-AA contrast against `bg-card`.
  // - Dark: inverted — darker tinted pill (`35% 25%`) with paler initials.
  const avatarBg = isDark
    ? `hsl(${hue}, 35%, 25%)`
    : `hsl(${hue}, 30%, 85%)`;
  const avatarFg = isDark
    ? `hsl(${hue}, 60%, 82%)`
    : `hsl(${hue}, 40%, 30%)`;

  return (
    <div
      className={cn("border-l-2 pl-3", className)}
      style={{ borderColor: railColour }}
    >
      <div className="flex items-center gap-2 py-1">
        {stakeholder ? (
          <StakeholderAvatar stakeholder={stakeholder} size="sm" />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-border"
            style={{ backgroundColor: avatarBg, color: avatarFg }}
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
