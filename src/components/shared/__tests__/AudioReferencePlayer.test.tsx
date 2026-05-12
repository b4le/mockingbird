import { afterEach, describe, it, expect } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

// Vitest does not run @testing-library/react's auto-cleanup unless
// `globals: true` is set; this project keeps globals off (see
// `vitest.config.ts`). Without explicit cleanup the document body
// accumulates DOM from prior renders and `getByRole` finds duplicates.
afterEach(() => {
  cleanup();
});
import { useEffect, useRef } from "react";
import { AudioReferencePlayer } from "../AudioReferencePlayer";
import {
  AudioPlayerProvider,
  useAudioPlayerRegistry,
} from "@/components/conversations/AudioPlayerContext";
import type { AudioReference, AudioReferenceStatus } from "@/types";

// Fixture shapes follow `data/audio-manifest.json` conventions: real
// Drive IDs (>=20 chars) and the standard view/preview URL templates the
// Atticus exporter produces, plus the post-migration `streamUrl` (a GCS
// HTTPS URL — what the `<audio src>` actually binds to). Empty strings
// are reserved for the pending-audio-upload status — see spec §5.
const completeRef: AudioReference = {
  driveId: "10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS",
  filename: "Adrian + Ben 11th Feb.m4a",
  driveFolderId: "1Q4wFg7jZTdNty03u2GJL54FZxfsdPE0m",
  mimeType: "audio/x-m4a",
  viewUrl:
    "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/view?usp=drive_link",
  previewUrl:
    "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/preview",
  streamUrl:
    "https://storage.googleapis.com/mockingbird-audio/adrian-ben-11th-feb.m4a",
  sizeBytes: 53896450,
  durationSeconds: null,
  status: "complete",
};

const refWithStatus = (
  status: AudioReferenceStatus,
  overrides: Partial<AudioReference> = {},
): AudioReference => ({
  ...completeRef,
  status,
  ...overrides,
});

describe("AudioReferencePlayer", () => {
  it("renders the audio element with correct src and title for a complete-status entry", () => {
    const { container } = render(
      <AudioReferencePlayer audioReference={completeRef} />,
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    // The src binds to streamUrl (the GCS direct audio URL), NOT
    // previewUrl (Drive's HTML iframe-embed URL). See type-level
    // doc on AudioReference for the rationale.
    expect(audio?.getAttribute("src")).toBe(completeRef.streamUrl);
    expect(audio?.getAttribute("title")).toBe(completeRef.filename);
    expect(audio?.getAttribute("preload")).toBe("none");
    expect(audio?.hasAttribute("controls")).toBe(true);
  });

  it("does not render an audio element when previewUrl is empty (pending-audio-upload)", () => {
    const ref = refWithStatus("pending-audio-upload", {
      driveId: "",
      driveFolderId: "",
      mimeType: "",
      viewUrl: "",
      previewUrl: "",
      streamUrl: undefined,
    });
    const { container } = render(<AudioReferencePlayer audioReference={ref} />);
    expect(container.querySelector("audio")).toBeNull();
  });

  it("does not render an audio element when streamUrl is absent, but keeps the Drive link visible", () => {
    // Legacy / pre-GCS-migration shape: a real Drive recording is
    // available (status=complete, viewUrl populated) but no streamUrl
    // has been provisioned yet. The player should NOT bind <audio>
    // to previewUrl (which returns Drive's HTML preview, not audio),
    // and should still surface the "Open in Drive" link as the
    // recovery path.
    const refWithoutStream: AudioReference = {
      driveId: completeRef.driveId,
      filename: completeRef.filename,
      driveFolderId: completeRef.driveFolderId,
      mimeType: completeRef.mimeType,
      viewUrl: completeRef.viewUrl,
      previewUrl: completeRef.previewUrl,
      sizeBytes: completeRef.sizeBytes,
      durationSeconds: completeRef.durationSeconds,
      status: completeRef.status,
    };
    const { container, getByRole } = render(
      <AudioReferencePlayer audioReference={refWithoutStream} />,
    );
    expect(container.querySelector("audio")).toBeNull();
    expect(getByRole("link", { name: /open in drive/i })).not.toBeNull();
  });

  it.each([
    ["pending-summary", "Recording — summary pending"],
    ["pending-vault-sync", "Vault syncing"],
    ["pending-audio-upload", "Audio pending upload"],
  ] as const)(
    "renders the badge with the spec-mandated label for status=%s",
    (status, label) => {
      const ref =
        status === "pending-audio-upload"
          ? refWithStatus(status, {
              driveId: "",
              driveFolderId: "",
              mimeType: "",
              viewUrl: "",
              previewUrl: "",
              streamUrl: undefined,
            })
          : refWithStatus(status);
      const { getByRole } = render(<AudioReferencePlayer audioReference={ref} />);
      const badge = getByRole("status");
      expect(badge.textContent).toBe(label);
    },
  );

  it("does not render a badge when status is 'complete'", () => {
    const { queryByRole } = render(
      <AudioReferencePlayer audioReference={completeRef} />,
    );
    expect(queryByRole("status")).toBeNull();
  });

  it("does not render a badge when status is absent (treated as complete)", () => {
    // Build a ref without the optional `status` field — exercises the
    // `audioReference.status ?? "complete"` default-coalesce in the
    // component.
    const refWithoutStatus: AudioReference = {
      driveId: completeRef.driveId,
      filename: completeRef.filename,
      driveFolderId: completeRef.driveFolderId,
      mimeType: completeRef.mimeType,
      viewUrl: completeRef.viewUrl,
      previewUrl: completeRef.previewUrl,
      streamUrl: completeRef.streamUrl,
      sizeBytes: completeRef.sizeBytes,
      durationSeconds: completeRef.durationSeconds,
    };
    const { queryByRole } = render(
      <AudioReferencePlayer audioReference={refWithoutStatus} />,
    );
    expect(queryByRole("status")).toBeNull();
  });

  it("surfaces notes as the badge title attribute when present", () => {
    const ref = refWithStatus("pending-summary", {
      notes: "Vault summary not yet written.",
    });
    const { getByRole } = render(<AudioReferencePlayer audioReference={ref} />);
    expect(getByRole("status").getAttribute("title")).toBe(
      "Vault summary not yet written.",
    );
  });

  it("renders the 'Open in Drive' link with correct href, target, and rel", () => {
    const { getByRole } = render(
      <AudioReferencePlayer audioReference={completeRef} />,
    );
    const link = getByRole("link", { name: /open in drive/i });
    expect(link.getAttribute("href")).toBe(completeRef.viewUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("does not render the link when viewUrl is empty", () => {
    const ref = refWithStatus("pending-audio-upload", {
      driveId: "",
      driveFolderId: "",
      mimeType: "",
      viewUrl: "",
      previewUrl: "",
      streamUrl: undefined,
    });
    const { queryByRole } = render(<AudioReferencePlayer audioReference={ref} />);
    expect(queryByRole("link")).toBeNull();
  });

  it("on audio onError, surfaces an inline error banner advertising the Drive fallback", () => {
    const { container, getByRole } = render(
      <AudioReferencePlayer audioReference={completeRef} />,
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();

    fireEvent.error(audio!);

    // The replacement for the silent unmount: a visible alert banner
    // tells the user the audio failed and points them at the Drive
    // link. role="alert" lets screen readers announce it.
    const alert = getByRole("alert");
    expect(alert).not.toBeNull();
    expect(alert.textContent?.toLowerCase()).toContain("failed");
  });

  describe("compact variant", () => {
    it("starts collapsed: shows trigger button, hides the audio element and link", () => {
      const { container, queryByRole, getByRole } = render(
        <AudioReferencePlayer
          audioReference={completeRef}
          variant="compact"
        />,
      );
      // Trigger is a button with aria-expanded=false.
      const trigger = getByRole("button", { name: /play recording/i });
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      // Body (audio + link) is not in the DOM yet.
      expect(container.querySelector("audio")).toBeNull();
      expect(queryByRole("link", { name: /open in drive/i })).toBeNull();
    });

    it("expands inline on click: reveals the audio element and link", () => {
      const { container, getByRole } = render(
        <AudioReferencePlayer
          audioReference={completeRef}
          variant="compact"
        />,
      );
      const trigger = getByRole("button", { name: /play recording/i });
      fireEvent.click(trigger);

      // After expansion, the body renders and the trigger flips its
      // label + aria-expanded so screen readers reflect the new state.
      expect(getByRole("button", { name: /hide recording/i })).not.toBeNull();
      expect(
        getByRole("button", { name: /hide recording/i }).getAttribute(
          "aria-expanded",
        ),
      ).toBe("true");
      expect(container.querySelector("audio")).not.toBeNull();
      expect(getByRole("link", { name: /open in drive/i })).not.toBeNull();
    });

    it("defaults to 'full' variant when no variant is specified", () => {
      // Regression guard: existing call sites (Timeline expanded card)
      // pass no variant prop and must continue to render the full
      // player without a trigger button wrapping it.
      const { container, queryByRole } = render(
        <AudioReferencePlayer audioReference={completeRef} />,
      );
      expect(queryByRole("button", { name: /play recording/i })).toBeNull();
      expect(container.querySelector("audio")).not.toBeNull();
    });
  });

  describe("AudioPlayerProvider integration", () => {
    it("registers the rendered <audio> element with the provider's store", () => {
      // Drive a `play` event on the rendered <audio> and observe that
      // the store flips `isPlaying` — that round trip can only succeed
      // if AudioReferencePlayer registered the element with the
      // provider. We capture the store via a probe component using a
      // ref (no state mutation during render).
      const stateHolder: { current: { isPlaying: boolean } | null } = {
        current: null,
      };
      function StateProbe() {
        const registry = useAudioPlayerRegistry();
        const ref = useRef(stateHolder);
        useEffect(() => {
          if (!registry) return;
          // Subscribe directly so we don't pull in
          // useSyncExternalStore semantics — we only need to see the
          // final snapshot after the play event.
          return registry.store.subscribe(() => {
            ref.current.current = registry.store.getSnapshot();
          });
        }, [registry]);
        return null;
      }
      const { container } = render(
        <AudioPlayerProvider>
          <StateProbe />
          <AudioReferencePlayer audioReference={completeRef} />
        </AudioPlayerProvider>,
      );
      const audio = container.querySelector("audio");
      expect(audio).not.toBeNull();
      // Synthesize a play event (happy-dom doesn't decode media, so
      // we manually flip `paused` and dispatch the lifecycle event).
      Object.defineProperty(audio!, "paused", {
        configurable: true,
        get: () => false,
      });
      fireEvent(audio!, new Event("play"));
      expect(stateHolder.current?.isPlaying).toBe(true);
    });

    it("renders identically without a provider (drop-anywhere contract)", () => {
      // Same fixture, no provider — the existing assertions still hold.
      const { container, getByRole } = render(
        <AudioReferencePlayer audioReference={completeRef} />,
      );
      const audio = container.querySelector("audio");
      expect(audio).not.toBeNull();
      expect(audio?.getAttribute("src")).toBe(completeRef.streamUrl);
      expect(getByRole("link", { name: /open in drive/i })).not.toBeNull();
    });
  });
});
