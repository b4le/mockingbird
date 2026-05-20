"use client";

import { cn } from "@/lib/utils";

export type TranscriptEmptyKind = "none" | "no-cues";

interface TranscriptEmptyProps {
  kind: TranscriptEmptyKind;
  className?: string;
}

export function TranscriptEmpty({ kind, className }: TranscriptEmptyProps) {
  const message =
    kind === "none"
      ? "No transcript available for this conversation."
      : "No cues to display.";
  return (
    <div
      className={cn(
        "rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {message}
    </div>
  );
}
