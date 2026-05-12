"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAudioPlayerRegistry } from "@/components/conversations/AudioPlayerContext";
import { cn } from "@/lib/utils";
import type { AudioReference, AudioReferenceStatus } from "@/types";

/**
 * Bespoke renderer for a `Conversation.audioReference` (or
 * `Transcript.audioReference`) payload. Designed to drop into any
 * surface — Timeline expanded card, CommunicationDetail linked
 * conversations, future Conversation page — with the parent supplying
 * only the payload and (optionally) a layout-level `className`.
 *
 * The component owns the affordance (player + status badge + Drive
 * link); the parent owns where it sits and what surrounds it. Keep
 * this contract narrow: it is an `AudioReference` renderer, not a
 * generic media player.
 *
 * Variants:
 *
 * - `"full"` (default) — vertical stack of pending-state badge,
 *   native HTML5 `<audio>` element, and "Open in Drive" link. Suited
 *   to expanded cards and detail panels where the player is the
 *   primary affordance.
 * - `"compact"` — collapsed-by-default trigger row showing only the
 *   filename + Mic icon. Click expands the trigger into the same
 *   `full` layout inline. Suited to inline usage (e.g. linked-
 *   conversation rows) where the player should not dominate the row
 *   until the user opts in.
 *
 * Layout (`full`):
 *   1. Optional pending-state badge (rendered only when `status` is set
 *      and not `"complete"`).
 *   2. Native HTML5 `<audio>` element pointing at `streamUrl`. Skipped
 *      entirely when `streamUrl` is absent (the legacy / pre-migration
 *      shape) — `previewUrl` is Drive's iframe-embed URL and returns
 *      HTML, not audio bytes, so it must not be used for playback.
 *   3. "Open in Drive" link pointing at `viewUrl` as the secondary
 *      affordance, elevated to primary when the audio element fails
 *      (auth or network — GCS / Drive may return 403; see spec §5).
 *      Absent-`streamUrl` entries surface only the link.
 *   4. Inline error banner — when `<audio>` fires its `error` event
 *      (e.g. 403, network drop, unsupported codec), the audio element
 *      is hidden and a banner appears in its place, advertising the
 *      "Open in Drive" link as the recovery path. The banner replaces
 *      the silent unmount the component used to do.
 *
 * Spec: `docs/mockingbird-zod-audio-reference-spec.md` §5.
 */

const STATUS_LABELS: Record<Exclude<AudioReferenceStatus, "complete">, string> =
  {
    "pending-summary": "Recording — summary pending",
    "pending-vault-sync": "Vault syncing",
    "pending-audio-upload": "Audio pending upload",
  };

export type AudioReferencePlayerVariant = "full" | "compact";

interface AudioReferencePlayerProps {
  audioReference: AudioReference;
  /**
   * `full` (default) renders the player + badge + link inline.
   * `compact` renders a click-to-expand trigger; the expanded body
   * is the same layout as `full`.
   */
  variant?: AudioReferencePlayerVariant;
  className?: string;
}

export function AudioReferencePlayer({
  audioReference,
  variant = "full",
  className,
}: AudioReferencePlayerProps) {
  // One boolean — flips when the <audio> element fires `onError` (e.g.
  // GCS / Drive returns 403 because the user isn't signed in). Spec §5
  // says to fall back to the view link in that case. We surface the
  // failure as a visible inline banner (see body) rather than a silent
  // unmount so users understand why the controls disappeared.
  const [audioFailed, setAudioFailed] = useState(false);
  // Compact variant starts collapsed; ignored when `variant === 'full'`.
  const [expanded, setExpanded] = useState(false);

  // When wrapped in an `<AudioPlayerProvider>` (currently only the
  // ConversationDetail tabbed layout), register the rendered <audio>
  // element so descendants (transcript cues) can drive playback. When
  // no provider is present — Timeline expanded card, evidence rows,
  // communications detail — the registry is null and the callback
  // ref still holds the local element reference but never publishes
  // it, preserving the drop-anywhere contract.
  const registry = useAudioPlayerRegistry();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Ref callback fires synchronously on mount/unmount of the <audio>
  // element. Using a callback ref (instead of `useEffect` keyed on
  // `audioRef.current`) is the React-idiomatic way to subscribe to a
  // DOM node's lifecycle, and it correctly fires when the element
  // appears/disappears via showPlayer or compact-expand toggling.
  const setAudioRef = useCallback(
    (node: HTMLAudioElement | null) => {
      const previous = audioRef.current;
      audioRef.current = node;
      if (!registry) return;
      if (previous && previous !== node) {
        registry.registerAudioElement(null);
      }
      if (node) {
        registry.registerAudioElement(node);
      } else {
        registry.registerAudioElement(null);
      }
    },
    [registry],
  );
  // Detach when the component unmounts so a parent provider doesn't
  // keep listening to a node that's about to be removed from the DOM.
  useEffect(() => {
    return () => {
      if (registry && audioRef.current) {
        registry.registerAudioElement(null);
      }
    };
  }, [registry]);

  const status = audioReference.status ?? "complete";
  const showBadge = status !== "complete";
  // The `<audio>` element is gated on a usable `streamUrl`. When the
  // field is absent (legacy / pre-migration entries) or when the
  // element has already fired its error handler, skip rendering the
  // player and surface the Drive link only. `previewUrl` is NOT a
  // valid `<audio>` source — it returns Drive's HTML iframe page.
  const hasStreamUrl =
    typeof audioReference.streamUrl === "string" &&
    audioReference.streamUrl !== "";
  const showPlayer = hasStreamUrl && !audioFailed;
  const hasViewUrl = audioReference.viewUrl !== "";
  // When audio playback fails (or no streamUrl is available at all),
  // the link becomes the primary affordance and gets a slightly more
  // prominent treatment so users notice the fallback path.
  const linkIsPrimary = audioFailed || !hasStreamUrl;

  const body = (
    <div className="flex flex-col gap-2">
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
          ref={setAudioRef}
          controls
          preload="none"
          src={audioReference.streamUrl}
          title={audioReference.filename}
          aria-label={`Recording: ${audioReference.filename}`}
          onError={() => setAudioFailed(true)}
          className="w-full"
        />
      )}
      {audioFailed && (
        // Visible replacement for the previous silent unmount. Uses
        // `role="alert"` so screen readers announce the failure when
        // the banner enters the DOM. Copy intentionally points users
        // at the "Open in Drive" link below as the recovery path.
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Audio failed to load. Use the Open in Drive link below.
        </div>
      )}
      {hasViewUrl && (
        <a
          href={audioReference.viewUrl}
          target="_blank"
          rel="noopener noreferrer"
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

  if (variant === "full") {
    return <div className={cn(className)}>{body}</div>;
  }

  // Compact: collapsed trigger row → expands inline into the same body.
  // The trigger is a button so keyboard + screen-reader users can
  // discover and toggle it the same way they would a native disclosure.
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 self-start rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        <Mic className="h-3 w-3" aria-hidden="true" />
        <span>{expanded ? "Hide recording" : "Play recording"}</span>
      </button>
      {expanded && body}
    </div>
  );
}
