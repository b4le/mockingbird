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

describe("useSpeakerChangeAnnouncer", () => {
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
    rerender({ idx: 1 }); // same speaker (Ben)
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
