"use client";

import { cn } from "@/lib/utils";

export type TranscriptEmptyKind = "none" | "no-cues";

interface TranscriptEmptyProps {
  kind: TranscriptEmptyKind;
  flatTranscript?: string;
  className?: string;
}

export function TranscriptEmpty({
  kind,
  flatTranscript,
  className,
}: TranscriptEmptyProps) {
  if (kind === "none") {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No transcript available for this conversation.
      </div>
    );
  }

  const hasFlat =
    typeof flatTranscript === "string" && flatTranscript.trim() !== "";

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">
        Recording transcribed but no cues yet.
      </p>
      {hasFlat ? (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs text-foreground">
          {flatTranscript}
        </pre>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No cues to display.
        </div>
      )}
    </div>
  );
}
