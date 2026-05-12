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

  // Paragraph-handling rationale: `Conversation.transcript` (the source for
  // `flatTranscript`, see `ConversationSchema` — `@deprecated` legacy back-
  // compat field) has no documented delimiter convention, and no current
  // fixture populates it. Splitting on a blank-line boundary (`/\n\s*\n/`)
  // is opportunistic: strings with double-newline paragraphs render as
  // multiple paragraphs; strings without them collapse to a single <p>,
  // which with `whitespace-pre-wrap` reproduces the previous <pre>
  // rendering (minus monospace). Safe in both shapes.
  const paragraphs = hasFlat ? flatTranscript!.split(/\n\s*\n/) : [];

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">
        Cue-level navigation isn&apos;t available for this transcript — only
        flat text. Search and timestamp seek are disabled.
      </p>
      {hasFlat ? (
        <div className="max-h-96 space-y-2 overflow-auto rounded-md border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
          {paragraphs.map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No cues to display.
        </div>
      )}
    </div>
  );
}
