import { describe, expect, it } from "vitest";
import { buildSpeakerStakeholderMap } from "../speaker-resolution";
import type { Stakeholder, Transcript } from "@/types";

const ben: Stakeholder = {
  id: "stakeholder-ben",
  name: "Ben Purslow",
  role: "Founder",
  organisation: "Acme",
  initials: "BP",
  colour: "#111111",
};

const adrian: Stakeholder = {
  id: "stakeholder-adrian",
  name: "Adrian Ford",
  role: "Engineer",
  organisation: "Acme",
  initials: "AF",
  colour: "#222222",
};

function makeTranscript(overrides: Partial<Transcript> = {}): Transcript {
  return {
    id: "t1",
    date: "",
    category: "demo",
    conversationId: "c1",
    participants: ["Ben", "Adrian"],
    durationSeconds: 120,
    cueCount: 2,
    hasCues: true,
    cues: [
      { startMs: 0, endMs: 1000, speaker: "Ben", text: "hi" },
      { startMs: 1000, endMs: 2000, speaker: "Adrian", text: "hello" },
    ],
    sourceFile: "x",
    ...overrides,
  };
}

describe("buildSpeakerStakeholderMap", () => {
  it("resolves via transcript.speakerMap when present", () => {
    const transcript = makeTranscript({
      speakerMap: { Ben: ben.id, Adrian: adrian.id },
    });
    const map = buildSpeakerStakeholderMap(transcript, [ben, adrian]);
    expect(map.get("Ben")?.id).toBe(ben.id);
    expect(map.get("Adrian")?.id).toBe(adrian.id);
  });

  it("resolves per-cue speakerId when speakerMap is absent", () => {
    const transcript = makeTranscript({
      cues: [
        {
          startMs: 0,
          endMs: 1000,
          speaker: "Speaker 1",
          speakerId: ben.id,
          text: "hi",
        },
      ],
    });
    const map = buildSpeakerStakeholderMap(transcript, [ben, adrian]);
    expect(map.get("Speaker 1")?.id).toBe(ben.id);
  });

  it("falls back to case-insensitive name match", () => {
    const transcript = makeTranscript({
      cues: [{ startMs: 0, endMs: 1000, speaker: "BEN PURSLOW", text: "hi" }],
    });
    const map = buildSpeakerStakeholderMap(transcript, [ben, adrian]);
    expect(map.get("BEN PURSLOW")?.id).toBe(ben.id);
  });

  it("returns no entry for an unmatched raw label", () => {
    const transcript = makeTranscript({
      cues: [{ startMs: 0, endMs: 1000, speaker: "Random Person", text: "hi" }],
    });
    const map = buildSpeakerStakeholderMap(transcript, [ben, adrian]);
    expect(map.has("Random Person")).toBe(false);
  });

  it("prefers speakerMap over cue-level fallback for the same raw label", () => {
    const transcript = makeTranscript({
      speakerMap: { Ben: adrian.id },
      cues: [
        {
          startMs: 0,
          endMs: 1000,
          speaker: "Ben",
          speakerId: ben.id,
          text: "hi",
        },
      ],
    });
    const map = buildSpeakerStakeholderMap(transcript, [ben, adrian]);
    expect(map.get("Ben")?.id).toBe(adrian.id);
  });
});
