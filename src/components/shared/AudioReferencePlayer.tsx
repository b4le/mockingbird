"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AudioReference, AudioReferenceStatus } from "@/types";

/**
 * Renders a "play this conversation's recording" affordance for a
 * `Conversation.audioReference` (or `Transcript.audioReference`) payload.
 *
 * Layout (vertical stack):
 *   1. Optional pending-state badge (rendered only when `status` is set
 *      and not `"complete"`).
 *   2. Native HTML5 `<audio>` element pointing at `previewUrl` (skipped
 *      for `pending-audio-upload` because both URLs are empty by
 *      contract — see spec §5).
 *   3. "Open in Drive" link pointing at `viewUrl` as the secondary
 *      affordance, elevated to primary when the audio element fails
 *      (auth or network — Drive returns 403 for signed-out users; see
 *      spec §5 auth note).
 *
 * Spec: `docs/mockingbird-zod-audio-reference-spec.md` §5.
 */

const STATUS_LABELS: Record<Exclude<AudioReferenceStatus, "complete">, string> =
  {
    "pending-summary": "Recording — summary pending",
    "pending-vault-sync": "Vault syncing",
    "pending-audio-upload": "Audio pending upload",
  };

interface AudioReferencePlayerProps {
  audioReference: AudioReference;
  className?: string;
}

export function AudioReferencePlayer({
  audioReference,
  className,
}: AudioReferencePlayerProps) {
  // One boolean — flips when the <audio> element fires `onError` (e.g.
  // Drive returns 403 because the user isn't signed in). Spec §5 says
  // to fall back to the view link in that case.
  const [audioFailed, setAudioFailed] = useState(false);

  const status = audioReference.status ?? "complete";
  const showBadge = status !== "complete";
  // Skip the player when the URL is empty (pending-audio-upload) or
  // when the audio element has fired its error handler.
  const showPlayer = audioReference.previewUrl !== "" && !audioFailed;
  const hasViewUrl = audioReference.viewUrl !== "";
  // When audio playback fails, the link becomes the primary affordance
  // and gets a slightly more prominent treatment.
  const linkIsPrimary = audioFailed;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showBadge && (
        <Badge
          variant="outline"
          role="status"
          // The manifest's `notes` field surfaces the human-readable
          // pending reason on hover. Falls back to undefined (which
          // React drops) when notes aren't provided.
          title={audioReference.notes}
          className="self-start border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {STATUS_LABELS[status as Exclude<AudioReferenceStatus, "complete">]}
        </Badge>
      )}
      {showPlayer && (
        <audio
          controls
          preload="none"
          src={audioReference.previewUrl}
          title={audioReference.filename}
          aria-label={`Recording: ${audioReference.filename}`}
          onError={() => setAudioFailed(true)}
          className="w-full"
        />
      )}
      {hasViewUrl && (
        <a
          href={audioReference.viewUrl}
          target="_blank"
          rel="noopener"
          className={cn(
            "inline-flex items-center gap-1 self-start text-xs underline-offset-2 hover:underline",
            linkIsPrimary
              ? "font-medium text-foreground"
              : "text-muted-foreground",
          )}
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          Open in Drive
        </a>
      )}
    </div>
  );
}
