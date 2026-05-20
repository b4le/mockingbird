import { describe, it, expect } from "vitest";
import {
  ActionItemSchema,
  AudioReferenceSchema,
  ClaimSchema,
  CommMessageSchema,
  CommunicationSchema,
  ConversationSchema,
  EvidenceItemSchema,
  ProjectStateSchema,
  RiskSchema,
  SessionMetaSchema,
  SnippetSchema,
  StakeholderSchema,
  TimelineEventSchema,
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

  it("Risk.updatedDate accepts null (due/updated timestamps stay nullable)", () => {
    const parsed = RiskSchema.parse({
      ...baseRisk,
      createdDate: "2024-01-01",
      updatedDate: null,
    });
    expect(parsed.createdDate).toBe("2024-01-01");
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

  it("Risk.createdDate rejects null (creation anchor is required)", () => {
    expect(() =>
      RiskSchema.parse({
        ...baseRisk,
        createdDate: null,
        updatedDate: null,
      }),
    ).toThrow();
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
        createdDate: "2024-01-01",
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

  it("EvidenceItem.date rejects null (creation anchor is required)", () => {
    expect(() =>
      EvidenceItemSchema.parse({
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
      }),
    ).toThrow();
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

// ---------------------------------------------------------------------------
// AudioReferenceSchema.streamUrl — direct GCS audio URL (post-migration)
// ---------------------------------------------------------------------------
//
// `streamUrl` is the browser-playable audio URL emitted by
// `scripts/migrate_audio_to_gcs.py`. It is OPTIONAL because the migration
// is incremental (not every Drive entry has been mirrored yet) and the
// UI must degrade gracefully when it is absent. Same `https://`-only
// hardening as `viewUrl`/`previewUrl` — defence against `javascript:` /
// `data:` schemes that would be XSS sinks if rendered into `<a href>`.
// ---------------------------------------------------------------------------

describe("AudioReferenceSchema.streamUrl", () => {
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

  it("accepts a populated streamUrl pointing at a GCS object", () => {
    const parsed = AudioReferenceSchema.parse({
      ...completeRef,
      streamUrl:
        "https://storage.googleapis.com/mockingbird-audio-7b135254/audio/0e683774870fed98.m4a",
    });
    expect(parsed.streamUrl).toBe(
      "https://storage.googleapis.com/mockingbird-audio-7b135254/audio/0e683774870fed98.m4a",
    );
  });

  it("accepts an omitted streamUrl (legacy / pre-migration shape)", () => {
    const parsed = AudioReferenceSchema.parse(completeRef);
    expect(parsed.streamUrl).toBeUndefined();
  });

  // Unlike viewUrl/previewUrl (which accept `""` as the
  // pending-audio-upload sentinel), streamUrl signals "not migrated
  // yet" through field absence. Empty or whitespace-only strings are
  // meaningless here and must fail validation so hand-edited fixtures
  // cannot smuggle a useless value past the schema.
  it.each(["", " ", "   ", "\t"])(
    "rejects whitespace or empty streamUrl: %j",
    (badUrl) => {
      const result = AudioReferenceSchema.safeParse({
        ...completeRef,
        streamUrl: badUrl,
      });
      expect(result.success).toBe(false);
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:audio/mp3;base64,AAAA",
    "file:///etc/passwd",
    "http://example.com/audio.m4a",
  ])("rejects non-https streamUrl scheme: %s", (badUrl) => {
    expect(() =>
      AudioReferenceSchema.parse({ ...completeRef, streamUrl: badUrl }),
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

  it("AudioReferenceSchema accepts a stream string", () => {
    const parsed = AudioReferenceSchema.parse({
      ...populatedAudioReference,
      stream: "adrian-1on1",
    });
    expect(parsed.stream).toBe("adrian-1on1");
  });

  it("AudioReferenceSchema accepts an undefined stream", () => {
    const parsed = AudioReferenceSchema.parse(populatedAudioReference);
    expect(parsed.stream).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Conversation.category enum
// ---------------------------------------------------------------------------

describe("ConversationSchema.category enum", () => {
  const minimalConversation = {
    id: "conv-cat",
    date: "2026-02-11",
    title: "t",
    participantIds: [],
    summary: "",
    keyPoints: [],
    decisions: [],
    actionItemIds: [],
  };

  it.each(["1-on-1", "hr-meeting", "union-meeting"] as const)(
    "accepts category %s",
    (category) => {
      const parsed = ConversationSchema.parse({
        ...minimalConversation,
        category,
      });
      expect(parsed.category).toBe(category);
    },
  );

  it("rejects an unknown category value", () => {
    const result = ConversationSchema.safeParse({
      ...minimalConversation,
      category: "random-string",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an undefined category (optional)", () => {
    const parsed = ConversationSchema.parse(minimalConversation);
    expect(parsed.category).toBeUndefined();
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

// ---------------------------------------------------------------------------
// CommunicationSchema — attachment shape alignment with the atticus-finch
// producer (see PR b4le/atticus-finch#52). The producer emits richer
// metadata (filename / mime / size / path) on every attachment; the consumer
// schema previously stripped these silently via Zod's default `.strip()`.
// ---------------------------------------------------------------------------

describe("CommunicationSchema attachment metadata", () => {
  const baseCommunication = {
    id: "comm-test",
    channel: "email" as const,
    date: "2026-01-27T12:50:16Z",
    subject: "Test",
    participantIds: ["s-1"],
    summary: "Test summary",
    messages: [
      {
        id: "comm-test-msg-0",
        date: "2026-01-27T12:50:16Z",
        senderId: "s-1",
        bodyPreview: "hello",
      },
    ],
    actionItemIds: [],
    claimIds: [],
    evidenceIds: [],
    riskIds: [],
    conversationIds: [],
  };

  it("accepts producer-shape attachments with filename, mime, size, path", () => {
    const result = CommunicationSchema.safeParse({
      ...baseCommunication,
      attachments: [
        {
          name: "Termination Agreement Ben Purslow.docx.pdf",
          filename: "Termination Agreement Ben Purslow.docx.pdf",
          mime: "application/pdf",
          size: 128_595,
          path: "local-state/emails/attachments/19bfa273eca78c37/Termination Agreement Ben Purslow.docx.pdf",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    // Critical regression guard: verify the rich metadata SURVIVES parsing
    // (previously `.strip()` would drop these silently).
    const att = result.data.attachments?.[0];
    expect(att?.filename).toBe(
      "Termination Agreement Ben Purslow.docx.pdf",
    );
    expect(att?.mime).toBe("application/pdf");
    expect(att?.size).toBe(128_595);
    expect(att?.path).toBe(
      "local-state/emails/attachments/19bfa273eca78c37/Termination Agreement Ben Purslow.docx.pdf",
    );
  });

  it("accepts legacy attachments with only name (back-compat)", () => {
    const result = CommunicationSchema.safeParse({
      ...baseCommunication,
      attachments: [{ name: "Legacy.pdf" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts legacy attachments with only url (back-compat)", () => {
    const result = CommunicationSchema.safeParse({
      ...baseCommunication,
      attachments: [{ url: "https://drive.google.com/file/d/abc123" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts evidence-tagged attachments without filename or url", () => {
    const result = CommunicationSchema.safeParse({
      ...baseCommunication,
      attachments: [{ evidenceId: "ev-1" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects attachments with NONE of filename/name/url/evidenceId", () => {
    const result = CommunicationSchema.safeParse({
      ...baseCommunication,
      attachments: [{ mime: "application/pdf", size: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative attachment size", () => {
    const result = CommunicationSchema.safeParse({
      ...baseCommunication,
      attachments: [{ filename: "f.pdf", size: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer attachment size", () => {
    const result = CommunicationSchema.safeParse({
      ...baseCommunication,
      attachments: [{ filename: "f.pdf", size: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts per-message attachments in producer shape", () => {
    const result = CommunicationSchema.safeParse({
      ...baseCommunication,
      messages: [
        {
          id: "comm-test-msg-0",
          date: "2026-01-27T12:50:16Z",
          senderId: "s-1",
          bodyPreview: "see attached",
          attachments: [
            {
              name: "INTOO Global Outplacement Program.pdf",
              filename: "INTOO Global Outplacement Program.pdf",
              mime: "application/pdf",
              size: 165_351,
              path: "local-state/emails/attachments/19bfa273eca78c37/INTOO Global Outplacement Program.pdf",
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.messages[0]?.attachments?.[0]?.size).toBe(165_351);
  });
});

// ---------------------------------------------------------------------------
// StakeholderSchema — minimal happy + optional-field omission edge.
// ---------------------------------------------------------------------------

describe("StakeholderSchema", () => {
  const baseStakeholder = {
    id: "s1",
    name: "Alice",
    role: "Engineer",
    organisation: "Acme",
    initials: "AA",
    colour: "#abcdef",
  };

  it("accepts a stakeholder with only required fields", () => {
    const parsed = StakeholderSchema.parse(baseStakeholder);
    expect(parsed.id).toBe("s1");
    expect(parsed.email).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
    expect(parsed.avatarUrl).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });

  it("accepts a stakeholder with all optional fields populated", () => {
    const parsed = StakeholderSchema.parse({
      ...baseStakeholder,
      email: "alice@acme.test",
      phone: "+44 7000 000000",
      avatarUrl: "https://example.test/a.png",
      notes: "primary contact",
    });
    expect(parsed.notes).toBe("primary contact");
  });

  it("rejects a stakeholder missing a required field (initials)", () => {
    const { initials: _initials, ...rest } = baseStakeholder;
    void _initials;
    expect(() => StakeholderSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ActionItemSchema — sourceEntityBothOrNeither refine assertions.
// ---------------------------------------------------------------------------

describe("ActionItemSchema sourceEntity refine", () => {
  const baseAction = {
    id: "a1",
    title: "t",
    description: "d",
    status: "todo" as const,
    priority: "high" as const,
    ownerId: "s1",
    createdDate: "2024-01-01",
    dueDate: null,
    completedDate: null,
    tags: [],
  };

  it("accepts both sourceEntity fields null", () => {
    const parsed = ActionItemSchema.parse({
      ...baseAction,
      sourceEntityId: null,
      sourceEntityType: null,
    });
    expect(parsed.sourceEntityId).toBeNull();
    expect(parsed.sourceEntityType).toBeNull();
  });

  it("accepts both sourceEntity fields set", () => {
    const parsed = ActionItemSchema.parse({
      ...baseAction,
      sourceEntityId: "conv-1",
      sourceEntityType: "conversation",
    });
    expect(parsed.sourceEntityId).toBe("conv-1");
    expect(parsed.sourceEntityType).toBe("conversation");
  });

  it("rejects sourceEntityId set without sourceEntityType (half pointer)", () => {
    expect(() =>
      ActionItemSchema.parse({
        ...baseAction,
        sourceEntityId: "conv-1",
        sourceEntityType: null,
      }),
    ).toThrow(/sourceEntityId and sourceEntityType must both be null or both be set/);
  });

  it("rejects sourceEntityType set without sourceEntityId (half pointer)", () => {
    expect(() =>
      ActionItemSchema.parse({
        ...baseAction,
        sourceEntityId: null,
        sourceEntityType: "communication",
      }),
    ).toThrow(/sourceEntityId and sourceEntityType must both be null or both be set/);
  });
});

// ---------------------------------------------------------------------------
// EvidenceItemSchema — sourceEntityBothOrNeither refine assertions (mirrors
// ActionItem). Date-rejection coverage already lives above.
// ---------------------------------------------------------------------------

describe("EvidenceItemSchema sourceEntity refine", () => {
  const baseEvidence = {
    id: "e1",
    title: "t",
    description: "d",
    source: "s",
    sourceType: "document" as const,
    strength: "strong" as const,
    date: "2024-01-01",
    url: null,
    claimIds: [],
  };

  it("accepts both sourceEntity fields null", () => {
    const parsed = EvidenceItemSchema.parse({
      ...baseEvidence,
      sourceEntityId: null,
      sourceEntityType: null,
    });
    expect(parsed.sourceEntityId).toBeNull();
  });

  it("accepts both sourceEntity fields set", () => {
    const parsed = EvidenceItemSchema.parse({
      ...baseEvidence,
      sourceEntityId: "comm-1",
      sourceEntityType: "communication",
    });
    expect(parsed.sourceEntityType).toBe("communication");
  });

  it("rejects sourceEntityId set without sourceEntityType", () => {
    expect(() =>
      EvidenceItemSchema.parse({
        ...baseEvidence,
        sourceEntityId: "comm-1",
        sourceEntityType: null,
      }),
    ).toThrow(/sourceEntityId and sourceEntityType must both be null or both be set/);
  });

  it("rejects sourceEntityType set without sourceEntityId", () => {
    expect(() =>
      EvidenceItemSchema.parse({
        ...baseEvidence,
        sourceEntityId: null,
        sourceEntityType: "conversation",
      }),
    ).toThrow(/sourceEntityId and sourceEntityType must both be null or both be set/);
  });
});

// ---------------------------------------------------------------------------
// ClaimSchema — happy + rejection.
// ---------------------------------------------------------------------------

describe("ClaimSchema", () => {
  it("accepts a minimal claim", () => {
    const parsed = ClaimSchema.parse({
      id: "cl1",
      assertion: "X happened",
      category: "fact",
      status: "supported",
      evidenceIds: [],
      raisedById: "s1",
      date: "2024-01-01",
    });
    expect(parsed.id).toBe("cl1");
    expect(parsed.evidenceIds).toEqual([]);
  });

  it("rejects an unknown status", () => {
    const result = ClaimSchema.safeParse({
      id: "cl1",
      assertion: "X",
      category: "c",
      status: "maybe",
      evidenceIds: [],
      raisedById: "s1",
      date: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TimelineEventSchema — happy + rejection.
// ---------------------------------------------------------------------------

describe("TimelineEventSchema", () => {
  it("accepts a minimal event", () => {
    const parsed = TimelineEventSchema.parse({
      id: "te1",
      date: "2024-01-01",
      type: "milestone",
      title: "Kickoff",
      description: "d",
      stakeholderIds: [],
      linkedEntityId: null,
      linkedEntityType: null,
    });
    expect(parsed.type).toBe("milestone");
    expect(parsed.linkedEntityId).toBeNull();
  });

  it("rejects an unknown event type", () => {
    const result = TimelineEventSchema.safeParse({
      id: "te1",
      date: "2024-01-01",
      type: "not-a-real-type",
      title: "t",
      description: "d",
      stakeholderIds: [],
      linkedEntityId: null,
      linkedEntityType: null,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProjectStateSchema — happy + rejection.
// ---------------------------------------------------------------------------

describe("ProjectStateSchema", () => {
  it("accepts a minimal project state with one metric", () => {
    const parsed = ProjectStateSchema.parse({
      projectName: "p",
      status: "on-track",
      statusMessage: "all good",
      lastUpdated: "2024-01-01",
      metrics: [
        { label: "Done", value: 1, total: 10, unit: "items" },
      ],
      phase: "discovery",
      phaseProgress: 0.25,
    });
    expect(parsed.metrics).toHaveLength(1);
    expect(parsed.metrics[0]?.total).toBe(10);
  });

  it("rejects an unknown project status", () => {
    const result = ProjectStateSchema.safeParse({
      projectName: "p",
      status: "exploding",
      statusMessage: "",
      lastUpdated: "2024-01-01",
      metrics: [],
      phase: "discovery",
      phaseProgress: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SessionMetaSchema — happy + rejection.
// ---------------------------------------------------------------------------

describe("SessionMetaSchema", () => {
  it("accepts a fully populated session meta record", () => {
    const parsed = SessionMetaSchema.parse({
      lastUpdated: "2024-01-01",
      dataVersion: "1.2.3",
      generatedBy: "atticus-finch/export_mockingbird.py",
      notes: "smoke run",
    });
    expect(parsed.dataVersion).toBe("1.2.3");
  });

  it("rejects a session meta record missing a required field", () => {
    const result = SessionMetaSchema.safeParse({
      lastUpdated: "2024-01-01",
      dataVersion: "1.2.3",
      // generatedBy intentionally omitted
      notes: "smoke run",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CommMessageSchema — explicit preflight assertions on both-set / neither-set.
// The preflight produces a human-readable first-failure message; a regression
// to a plain `invalid_union` would still fail-out but with a much noisier
// payload. Assert the message text directly so the bug surface is visible.
// ---------------------------------------------------------------------------

describe("CommMessageSchema preflight messages", () => {
  it("rejects a message with BOTH senderId and externalSender set", () => {
    const result = CommMessageSchema.safeParse({
      id: "m1",
      date: "2024-01-01",
      senderId: "s1",
      externalSender: { name: "Outsider" },
      bodyPreview: "hi",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          /both are set/.test(i.message),
        ),
      ).toBe(true);
    }
  });

  it("rejects a message with NEITHER senderId nor externalSender set", () => {
    const result = CommMessageSchema.safeParse({
      id: "m1",
      date: "2024-01-01",
      bodyPreview: "hi",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          /neither is set/.test(i.message),
        ),
      ).toBe(true);
    }
  });

  it("accepts an internal-sender message", () => {
    const parsed = CommMessageSchema.parse({
      id: "m1",
      date: "2024-01-01",
      senderId: "s1",
      bodyPreview: "hi",
    });
    expect(parsed.id).toBe("m1");
  });

  it("accepts an external-sender message", () => {
    const parsed = CommMessageSchema.parse({
      id: "m1",
      date: "2024-01-01",
      externalSender: { name: "Outsider" },
      bodyPreview: "hi",
    });
    expect(parsed.id).toBe("m1");
  });
});

// ---------------------------------------------------------------------------
// Schema-coupling assertions — these fields are REQUIRED because downstream
// invariant checks dereference them without a presence guard. If a future
// change relaxes them to `.optional()`, these tests fail loudly instead of
// the check crashing at runtime. See `docs/schemas.md` §3.
// ---------------------------------------------------------------------------

describe("schema-coupling: required arrays", () => {
  it("RiskSchema rejects omitted actionIds (consumed by checkRiskActionIds)", () => {
    const result = RiskSchema.safeParse({
      id: "r1",
      title: "t",
      description: "d",
      status: "open",
      severity: "high",
      likelihood: "medium",
      mitigationPlan: "m",
      createdDate: "2024-01-01",
      updatedDate: null,
    });
    expect(result.success).toBe(false);
  });

  it("ClaimSchema rejects omitted evidenceIds (consumed by checkClaimEvidenceIds)", () => {
    const result = ClaimSchema.safeParse({
      id: "cl1",
      assertion: "X happened",
      category: "fact",
      status: "supported",
      raisedById: "s1",
      date: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });
});
