import { describe, it, expect } from "vitest";
import {
  RiskSchema,
  EvidenceItemSchema,
  SnippetSchema,
  TranscriptSchema,
} from "@/lib/schemas";

describe("nullable date fields reject non-ISO strings", () => {
  const baseRisk = {
    id: "r1",
    title: "t",
    description: "d",
    status: "open" as const,
    severity: "high" as const,
    likelihood: "medium" as const,
    mitigationPlan: "m",
    actionIds: [],
  };

  it("Risk dates accept null", () => {
    const parsed = RiskSchema.parse({
      ...baseRisk,
      createdDate: null,
      updatedDate: null,
    });
    expect(parsed.createdDate).toBeNull();
    expect(parsed.updatedDate).toBeNull();
  });

  it("Risk dates accept ISO YYYY-MM-DD", () => {
    expect(() =>
      RiskSchema.parse({
        ...baseRisk,
        createdDate: "2024-01-01",
        updatedDate: "2024-12-31",
      }),
    ).not.toThrow();
  });

  it("Risk dates accept full ISO timestamps", () => {
    expect(() =>
      RiskSchema.parse({
        ...baseRisk,
        createdDate: "2024-01-01T10:00:00Z",
        updatedDate: "2024-01-02T10:00:00Z",
      }),
    ).not.toThrow();
  });

  it("Risk.createdDate rejects empty string (the P0 bypass)", () => {
    expect(() =>
      RiskSchema.parse({
        ...baseRisk,
        createdDate: "",
        updatedDate: null,
      }),
    ).toThrow();
  });

  it("Risk.updatedDate rejects non-ISO string", () => {
    expect(() =>
      RiskSchema.parse({
        ...baseRisk,
        createdDate: null,
        updatedDate: "tomorrow",
      }),
    ).toThrow();
  });

  it("EvidenceItem.date rejects empty string", () => {
    expect(() =>
      EvidenceItemSchema.parse({
        id: "e1",
        title: "t",
        description: "d",
        source: "s",
        sourceType: "document",
        strength: "strong",
        date: "",
        url: null,
        claimIds: [],
        sourceEntityId: null,
        sourceEntityType: null,
      }),
    ).toThrow();
  });

  it("EvidenceItem.date accepts null", () => {
    const parsed = EvidenceItemSchema.parse({
      id: "e1",
      title: "t",
      description: "d",
      source: "s",
      sourceType: "document",
      strength: "strong",
      date: null,
      url: null,
      claimIds: [],
      sourceEntityId: null,
      sourceEntityType: null,
    });
    expect(parsed.date).toBeNull();
  });
});

describe("exporter-provided schemas", () => {
  it("TranscriptSchema validates a minimal transcript", () => {
    const parsed = TranscriptSchema.parse({
      id: "t1",
      date: "2024-01-01",
      category: "interview",
      conversationId: null,
      participants: ["alice"],
      durationSeconds: null,
      cueCount: 0,
      hasCues: false,
      cues: [],
      sourceFile: "t1.wav",
    });
    expect(parsed.id).toBe("t1");
    expect(parsed.cues).toEqual([]);
  });

  it("TranscriptSchema validates cues", () => {
    const parsed = TranscriptSchema.parse({
      id: "t1",
      date: "2024-01-01",
      category: "interview",
      conversationId: "c1",
      participants: ["alice", "bob"],
      participantIds: ["a1", "b1"],
      durationSeconds: 120,
      cueCount: 1,
      hasCues: true,
      cues: [{ startMs: 0, endMs: 1000, speaker: "alice", text: "hi" }],
      sourceFile: "t1.wav",
    });
    expect(parsed.cues).toHaveLength(1);
    expect(parsed.cues[0].text).toBe("hi");
  });

  it("SnippetSchema requires communicationId (not optional)", () => {
    expect(() =>
      SnippetSchema.parse({
        id: "s1",
        clipId: "c1",
        category: "top-20",
        sourceFile: "s.wav",
        audioFile: "s.mp3",
        startSeconds: 0,
        endSeconds: 5,
        durationSeconds: 5,
        speaker: "alice",
        transcript: "t",
        whatYoullHear: "w",
        top20Rank: 1,
        exhibitMapping: [],
        conversationId: null,
        // communicationId intentionally omitted — should fail
      }),
    ).toThrow();
  });

  it("SnippetSchema accepts communicationId: null", () => {
    const parsed = SnippetSchema.parse({
      id: "s1",
      clipId: "c1",
      category: "top-20",
      sourceFile: "s.wav",
      audioFile: "s.mp3",
      startSeconds: 0,
      endSeconds: 5,
      durationSeconds: 5,
      speaker: "alice",
      transcript: "t",
      whatYoullHear: "w",
      top20Rank: null,
      exhibitMapping: [],
      conversationId: null,
      communicationId: null,
    });
    expect(parsed.communicationId).toBeNull();
  });
});
