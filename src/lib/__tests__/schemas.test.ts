import { describe, it, expect } from "vitest";
import {
  AudioReferenceSchema,
  ConversationSchema,
  EvidenceItemSchema,
  RiskSchema,
  SnippetSchema,
  TranscriptCueSchema,
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

describe("AudioReferenceSchema", () => {
  // Realistic shape derived from atticus-finch/data/audio-manifest.json
  // (the Adrian 11th Feb entry — has size_bytes, real Drive URLs).
  const completeRef = {
    driveId: "10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS",
    filename: "Adrian + Ben 11th Feb.m4a",
    driveFolderId: "1Q4wFg7jZTdNty03u2GJL54FZxfsdPE0m",
    mimeType: "audio/x-m4a",
    viewUrl:
      "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/view",
    previewUrl:
      "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/preview",
    sizeBytes: 53896450,
    durationSeconds: null,
  };

  it("accepts a complete v1.0 entry without status/notes", () => {
    const parsed = AudioReferenceSchema.parse(completeRef);
    expect(parsed.driveId).toBe("10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS");
    expect(parsed.status).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });

  it.each([
    ["complete", completeRef],
    [
      "pending-summary",
      { ...completeRef, status: "pending-summary", notes: "Vault summary not yet written" },
    ],
    [
      "pending-vault-sync",
      { ...completeRef, status: "pending-vault-sync", notes: "Awaiting vault sync" },
    ],
  ] as const)("accepts status=%s with a real driveId", (_label, input) => {
    expect(() => AudioReferenceSchema.parse(input)).not.toThrow();
  });

  it("accepts pending-audio-upload with empty driveId and empty URLs", () => {
    const parsed = AudioReferenceSchema.parse({
      driveId: "",
      filename: "Marqia + Ben 14th Mar.m4a",
      driveFolderId: "1Q4wFg7jZTdNty03u2GJL54FZxfsdPE0m",
      mimeType: "",
      viewUrl: "",
      previewUrl: "",
      sizeBytes: null,
      durationSeconds: null,
      status: "pending-audio-upload",
      notes: "Recording not yet uploaded to Drive",
    });
    expect(parsed.status).toBe("pending-audio-upload");
    expect(parsed.driveId).toBe("");
    expect(parsed.viewUrl).toBe("");
  });

  it("rejects too-short driveId when status is pending-summary (path is [driveId])", () => {
    const result = AudioReferenceSchema.safeParse({
      ...completeRef,
      driveId: "abc",
      status: "pending-summary",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const driveIdIssue = result.error.issues.find((i) =>
        i.path.length === 1 && i.path[0] === "driveId",
      );
      expect(driveIdIssue).toBeDefined();
    }
  });

  it("rejects too-short driveId when status is absent (defaults to complete)", () => {
    const result = AudioReferenceSchema.safeParse({
      ...completeRef,
      driveId: "abc",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path.length === 1 && i.path[0] === "driveId",
        ),
      ).toBe(true);
    }
  });

  it("rejects malformed mimeType but accepts empty string", () => {
    expect(() =>
      AudioReferenceSchema.parse({ ...completeRef, mimeType: "not/a-mime" }),
    ).toThrow();
    expect(() =>
      AudioReferenceSchema.parse({ ...completeRef, mimeType: "audio/" }),
    ).toThrow();
    // Empty mimeType allowed (mirrors pending-audio-upload shape)
    expect(() =>
      AudioReferenceSchema.parse({
        driveId: "",
        filename: "f.m4a",
        driveFolderId: "x",
        mimeType: "",
        viewUrl: "",
        previewUrl: "",
        sizeBytes: null,
        durationSeconds: null,
        status: "pending-audio-upload",
      }),
    ).not.toThrow();
  });

  it("rejects malformed URLs but accepts empty strings on viewUrl/previewUrl", () => {
    expect(() =>
      AudioReferenceSchema.parse({ ...completeRef, viewUrl: "not-a-url" }),
    ).toThrow();
    expect(() =>
      AudioReferenceSchema.parse({ ...completeRef, previewUrl: "also-not-a-url" }),
    ).toThrow();
    // Empty URLs allowed (the pending-audio-upload shape)
    expect(() =>
      AudioReferenceSchema.parse({
        driveId: "",
        filename: "f.m4a",
        driveFolderId: "x",
        mimeType: "",
        viewUrl: "",
        previewUrl: "",
        sizeBytes: null,
        durationSeconds: null,
        status: "pending-audio-upload",
      }),
    ).not.toThrow();
  });

  // Defence in depth: Zod's `.url()` accepts `javascript:`, `data:`,
  // `vbscript:`, `file:` and similar schemes. `viewUrl` is rendered into
  // an `<a href>` where a `javascript:` value would execute on click.
  // The schema enforces an `https://` prefix to neutralise that.
  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "http://example.com",
  ])("rejects non-https URL scheme: %s", (badUrl) => {
    expect(() =>
      AudioReferenceSchema.parse({ ...completeRef, viewUrl: badUrl }),
    ).toThrow();
    expect(() =>
      AudioReferenceSchema.parse({ ...completeRef, previewUrl: badUrl }),
    ).toThrow();
  });
});

describe("audioReference field on Conversation and Transcript", () => {
  const minimalConversation = {
    id: "conv-1",
    date: "2026-02-11",
    title: "Adrian + Ben 1:1",
    participantIds: ["s1", "s2"],
    summary: "Catch-up",
    keyPoints: [],
    decisions: [],
    actionItemIds: [],
  };

  // Real entry from atticus-finch/data/audio-manifest.json — Adrian 11th Feb.
  const populatedAudioReference = {
    driveId: "10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS",
    filename: "Adrian + Ben 11th Feb.m4a",
    driveFolderId: "1Q4wFg7jZTdNty03u2GJL54FZxfsdPE0m",
    mimeType: "audio/x-m4a",
    viewUrl:
      "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/view",
    previewUrl:
      "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/preview",
    sizeBytes: 53896450,
    durationSeconds: null,
  };

  it("ConversationSchema accepts a Conversation without audioReference (regression)", () => {
    const parsed = ConversationSchema.parse(minimalConversation);
    expect(parsed.audioReference).toBeUndefined();
  });

  it("ConversationSchema accepts a Conversation with audioReference populated", () => {
    const parsed = ConversationSchema.parse({
      ...minimalConversation,
      audioReference: populatedAudioReference,
    });
    expect(parsed.audioReference?.driveId).toBe(
      "10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS",
    );
    expect(parsed.audioReference?.filename).toBe("Adrian + Ben 11th Feb.m4a");
  });

  const minimalTranscript = {
    id: "t1",
    date: "2026-02-11",
    category: "interview",
    conversationId: "conv-1",
    participants: ["alice"],
    durationSeconds: null,
    cueCount: 0,
    hasCues: false,
    cues: [],
    sourceFile: "t1.wav",
  };

  it("TranscriptSchema accepts a Transcript without audioReference (regression)", () => {
    const parsed = TranscriptSchema.parse(minimalTranscript);
    expect(parsed.audioReference).toBeUndefined();
  });

  it("TranscriptSchema accepts a Transcript with audioReference populated", () => {
    const parsed = TranscriptSchema.parse({
      ...minimalTranscript,
      audioReference: populatedAudioReference,
    });
    expect(parsed.audioReference?.previewUrl).toContain(
      "10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS",
    );
  });
});

// ---------------------------------------------------------------------------
// TranscriptCue numeric and string constraints
// ---------------------------------------------------------------------------

describe("TranscriptCueSchema numeric/string constraints", () => {
  const validCue = {
    startMs: 0,
    endMs: 1000,
    speaker: "Ben",
    text: "Hello world",
  };

  it("accepts a well-formed cue", () => {
    expect(() => TranscriptCueSchema.parse(validCue)).not.toThrow();
  });

  it("rejects negative startMs", () => {
    const result = TranscriptCueSchema.safeParse({
      ...validCue,
      startMs: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer startMs", () => {
    const result = TranscriptCueSchema.safeParse({
      ...validCue,
      startMs: 12.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative endMs", () => {
    const result = TranscriptCueSchema.safeParse({
      ...validCue,
      endMs: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty speaker label", () => {
    const result = TranscriptCueSchema.safeParse({
      ...validCue,
      speaker: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects speaker longer than 200 chars", () => {
    const result = TranscriptCueSchema.safeParse({
      ...validCue,
      speaker: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects text longer than 10_000 chars", () => {
    const result = TranscriptCueSchema.safeParse({
      ...validCue,
      text: "a".repeat(10_001),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Transcript.speakerMap entry-count bound
// ---------------------------------------------------------------------------

describe("TranscriptSchema.speakerMap bound", () => {
  const baseTranscript = {
    id: "t-bound",
    date: "2026-02-11",
    category: "interview",
    conversationId: null,
    participants: [],
    durationSeconds: null,
    cueCount: 0,
    hasCues: false,
    cues: [],
    sourceFile: "t.wav",
  };

  it("accepts a speakerMap with 50 entries (boundary)", () => {
    const speakerMap: Record<string, string> = {};
    for (let i = 0; i < 50; i += 1) {
      speakerMap[`label-${i}`] = `s-${i}`;
    }
    expect(() =>
      TranscriptSchema.parse({ ...baseTranscript, speakerMap }),
    ).not.toThrow();
  });

  it("rejects a speakerMap with 51 entries", () => {
    const speakerMap: Record<string, string> = {};
    for (let i = 0; i < 51; i += 1) {
      speakerMap[`label-${i}`] = `s-${i}`;
    }
    const result = TranscriptSchema.safeParse({ ...baseTranscript, speakerMap });
    expect(result.success).toBe(false);
  });
});
