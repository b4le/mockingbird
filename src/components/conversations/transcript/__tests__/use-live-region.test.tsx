import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useSpeakerChangeAnnouncer } from "../use-live-region";
import type { Stakeholder, TranscriptCue } from "@/types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers();
});

const ben: Stakeholder = {
  id: "stakeholder-ben",
  name: "Ben Purslow",
  role: "Founder",
  organisation: "Acme",
  initials: "BP",
  colour: "#111",
};

const cues: TranscriptCue[] = [
  { startMs: 0, endMs: 1000, speaker: "Ben", text: "Hi." },
  { startMs: 1000, endMs: 2000, speaker: "Ben", text: "Still Ben." },
  { startMs: 2000, endMs: 3000, speaker: "Adrian", text: "Hello." },
  { startMs: 3000, endMs: 4000, speaker: "Adrian", text: "Still Adrian." },
];

describe("useSpeakerChangeAnnouncer — speaker change", () => {
  it("announces immediately on first speaker resolution", () => {
    const { result } = renderHook(() =>
      useSpeakerChangeAnnouncer({
        cues,
        activeCueIndex: 0,
        speakerStakeholderMap: new Map<string, Stakeholder>([["Ben", ben]]),
      }),
    );
    expect(result.current.message).toContain("Ben Purslow");
  });

  it("does not re-announce when the speaker doesn't change", () => {
    const map = new Map<string, Stakeholder>([["Ben", ben]]);
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
        }),
      { initialProps: { idx: 0 } },
    );
    const first = result.current.message;
    expect(first).toContain("Ben Purslow");
    rerender({ idx: 1 }); // same speaker (Ben), short gap, idx 1 -> not divisible by 5
    expect(result.current.message).toBe(first);
  });

  it("debounces a quick second announcement until debounce window passes", () => {
    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          debounceMs: 2000,
        }),
      { initialProps: { idx: 0 } },
    );
    const firstMessage = result.current.message;
    expect(firstMessage).toContain("Ben");

    rerender({ idx: 2 });
    expect(result.current.message).toBe(firstMessage);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.message).toBe(firstMessage);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.message).toContain("Adrian");
  });

  it("returns an empty message when there is no active cue", () => {
    const { result } = renderHook(() =>
      useSpeakerChangeAnnouncer({
        cues,
        activeCueIndex: null,
        speakerStakeholderMap: new Map(),
      }),
    );
    expect(result.current.message).toBe("");
  });
});

describe("useSpeakerChangeAnnouncer — cue advance", () => {
  // A monologue from a single speaker. Indices 1..6 share `Ben`.
  // Indices 1,2,3,4 are tight (1s gaps). Index 5 has a >3s gap before it.
  // Index 5 is also divisible by 5.
  const monologue: TranscriptCue[] = [
    { startMs: 0, endMs: 1000, speaker: "Ben", text: "Opening sentence." },
    { startMs: 1100, endMs: 2000, speaker: "Ben", text: "Second sentence." },
    { startMs: 2100, endMs: 3000, speaker: "Ben", text: "Third sentence." },
    { startMs: 3100, endMs: 4000, speaker: "Ben", text: "Fourth sentence." },
    { startMs: 4100, endMs: 5000, speaker: "Ben", text: "Fifth sentence." },
    // 4-second gap precedes index 5.
    { startMs: 9000, endMs: 10000, speaker: "Ben", text: "After a long pause." },
    { startMs: 10100, endMs: 11000, speaker: "Ben", text: "Continuing on." },
  ];

  it("announces cue text on a long pause (gap > pauseThresholdMs)", () => {
    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues: monologue,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          // Disable Nth-cue fallback to isolate the pause trigger.
          nthCueFallback: 0,
          debounceMs: 0,
        }),
      { initialProps: { idx: 0 } },
    );
    expect(result.current.message).toContain("Ben");

    // Same speaker, short gap, no Nth fallback -> no announcement update.
    rerender({ idx: 1 });
    expect(result.current.message).toContain("Ben");
    rerender({ idx: 2 });
    rerender({ idx: 3 });
    rerender({ idx: 4 });
    // Long pause before idx 5 -> announce its text.
    rerender({ idx: 5 });
    expect(result.current.message).toBe("After a long pause.");
  });

  it("does not announce when gap is below the pause threshold and idx not divisible by N", () => {
    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues: monologue,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          debounceMs: 0,
        }),
      { initialProps: { idx: 0 } },
    );
    const first = result.current.message;
    // idx 1, 2, 3, 4: short gaps, indices not divisible by 5
    rerender({ idx: 1 });
    expect(result.current.message).toBe(first);
    rerender({ idx: 2 });
    expect(result.current.message).toBe(first);
    rerender({ idx: 3 });
    expect(result.current.message).toBe(first);
    rerender({ idx: 4 });
    expect(result.current.message).toBe(first);
  });

  it("announces cue text every Nth cue when no long pause has fired", () => {
    const tight: TranscriptCue[] = Array.from({ length: 8 }, (_, i) => ({
      startMs: i * 1000,
      endMs: i * 1000 + 900,
      speaker: "Ben",
      text: `Sentence ${i}.`,
    }));

    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues: tight,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          nthCueFallback: 5,
          debounceMs: 0,
        }),
      { initialProps: { idx: 0 } },
    );
    // First render announces Ben (speaker change).
    expect(result.current.message).toContain("Ben");
    // No further announcements at idx 1..4.
    rerender({ idx: 1 });
    rerender({ idx: 2 });
    rerender({ idx: 3 });
    rerender({ idx: 4 });
    expect(result.current.message).toContain("Ben");
    // idx 5 divisible by 5 -> announce cue 5's text.
    rerender({ idx: 5 });
    expect(result.current.message).toBe("Sentence 5.");
  });

  it("prefers the speaker announcement when a speaker change coincides with a long pause (no double-announce)", () => {
    // Speaker changes at idx 1, with a 5s gap.
    const speakerChangeWithPause: TranscriptCue[] = [
      { startMs: 0, endMs: 1000, speaker: "Ben", text: "Opening." },
      { startMs: 6000, endMs: 7000, speaker: "Adrian", text: "A new voice arrives." },
    ];
    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues: speakerChangeWithPause,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          debounceMs: 0,
        }),
      { initialProps: { idx: 0 } },
    );
    expect(result.current.message).toContain("Ben");
    rerender({ idx: 1 });
    // Speaker-change wins; message is the speaker announcement, not the raw cue text.
    expect(result.current.message).toContain("Adrian");
    expect(result.current.message).not.toBe("A new voice arrives.");
  });

  it("truncates long cue text to the default maxLength with an ellipsis", () => {
    const longText = "x".repeat(250);
    const longCues: TranscriptCue[] = [
      { startMs: 0, endMs: 1000, speaker: "Ben", text: "Short opener." },
      { startMs: 5000, endMs: 6000, speaker: "Ben", text: longText },
    ];
    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues: longCues,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          debounceMs: 0,
        }),
      { initialProps: { idx: 0 } },
    );
    expect(result.current.message).toContain("Ben");
    // Long pause triggers cue-text announcement on idx 1.
    rerender({ idx: 1 });
    const msg = result.current.message;
    expect(msg.endsWith("…")).toBe(true);
    // Default truncation is 100 — total length is at most 100.
    expect(msg.length).toBeLessThanOrEqual(100);
    // Not the full long string.
    expect(msg.length).toBeLessThan(longText.length);
  });

  it("respects a custom maxLength prop", () => {
    const longText = "abcdefghijklmnopqrstuvwxyz";
    const longCues: TranscriptCue[] = [
      { startMs: 0, endMs: 1000, speaker: "Ben", text: "Short." },
      { startMs: 5000, endMs: 6000, speaker: "Ben", text: longText },
    ];
    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues: longCues,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          maxLength: 10,
          debounceMs: 0,
        }),
      { initialProps: { idx: 0 } },
    );
    rerender({ idx: 1 });
    expect(result.current.message).toBe("abcdefghi…");
  });

  it("respects a custom pauseThresholdMs", () => {
    // 1.5s gap should NOT trigger at default 3000ms but SHOULD at 1000ms.
    const cuesShortGap: TranscriptCue[] = [
      { startMs: 0, endMs: 1000, speaker: "Ben", text: "First." },
      { startMs: 2500, endMs: 3500, speaker: "Ben", text: "Second." },
    ];
    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues: cuesShortGap,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          pauseThresholdMs: 1000,
          nthCueFallback: 0,
          debounceMs: 0,
        }),
      { initialProps: { idx: 0 } },
    );
    expect(result.current.message).toContain("Ben");
    rerender({ idx: 1 });
    expect(result.current.message).toBe("Second.");
  });

  it("treats nthCueFallback=0 as disabled", () => {
    const tight: TranscriptCue[] = Array.from({ length: 7 }, (_, i) => ({
      startMs: i * 1000,
      endMs: i * 1000 + 900,
      speaker: "Ben",
      text: `Sentence ${i}.`,
    }));
    const map = new Map<string, Stakeholder>();
    const { result, rerender } = renderHook(
      ({ idx }: { idx: number }) =>
        useSpeakerChangeAnnouncer({
          cues: tight,
          activeCueIndex: idx,
          speakerStakeholderMap: map,
          nthCueFallback: 0,
          debounceMs: 0,
        }),
      { initialProps: { idx: 0 } },
    );
    const first = result.current.message;
    expect(first).toContain("Ben");
    for (let i = 1; i <= 6; i++) {
      rerender({ idx: i });
      // With Nth disabled and tight gaps, no further announcements fire.
      expect(result.current.message).toBe(first);
    }
  });
});
