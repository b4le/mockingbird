import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Subtle "this entity has an audio recording" cue for collapsed rows
 * and chip-style summaries (Timeline collapsed entries, linked-
 * conversation chips in CommunicationDetail). Pairs with
 * `AudioReferencePlayer` — the indicator advertises the affordance,
 * the player provides it.
 *
 * Visually muted by default (`text-muted-foreground`) so it reads as
 * metadata, not as a control. Always carries an `aria-label` so
 * screen readers announce the recording's presence.
 */
interface AudioReferenceIndicatorProps {
  className?: string;
}

export function AudioReferenceIndicator({
  className,
}: AudioReferenceIndicatorProps) {
  return (
    <Mic
      role="img"
      aria-label="Has audio recording"
      className={cn("h-3 w-3 text-muted-foreground", className)}
    />
  );
}
