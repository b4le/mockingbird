import { describe, it, expect, vi } from "vitest";
import {
  createReporter,
  checkActionBackref,
  checkClaimEvidenceIds,
  checkCommunicationClaimIds,
  checkCommunicationConversationIds,
  checkCommunicationRiskIds,
  checkConversationActionIds,
  checkConversationParticipantIds,
  checkConversationSnippetIds,
  checkConversationTranscriptId,
  checkEvidenceBackref,
  checkRiskActionIds,
  checkSnippetBackref,
  checkTimelineLinkedEntity,
  checkTranscriptConversationId,
  checkTranscriptSpeakers,
  type SourceBacked,
} from "@/lib/invariants";
import type {
  Claim,
  Communication,
  Conversation,
  Risk,
  Snippet,
  Stakeholder,
  TimelineEvent,
  Transcript,
  TranscriptCue,
} from "@/types";

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

function makeComm(
  id: string,
  actionItemIds: string[] = [],
  evidenceIds: string[] = [],
  overrides: Partial<Communication> = {},
): Communication {
  return {
    id,
    channel: "email",
    date: "2024-01-01",
    subject: "s",
    participantIds: [],
    summary: "s",
    messages: [],
    actionItemIds,
    claimIds: [],
    evidenceIds,
    riskIds: [],
    conversationIds: [],
    ...overrides,
  };
}

function makeClaim(id: string): Claim {
  return {
    id,
    assertion: "a",
    category: "c",
    status: "unverified",
    evidenceIds: [],
    raisedById: "s1",
    date: "2024-01-01",
  };
}

function makeRisk(id: string): Risk {
  return {
    id,
    title: "t",
    description: "d",
    status: "open",
    severity: "medium",
    likelihood: "medium",
    mitigationPlan: "m",
    actionIds: [],
    createdDate: "2024-01-01",
    updatedDate: null,
  };
}

function makeConv(
  id: string,
  actionItemIds: string[] = [],
  participantIds: string[] = [],
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id,
    date: "2024-01-01",
    title: "t",
    participantIds,
    summary: "s",
    keyPoints: [],
    decisions: [],
    actionItemIds,
    ...overrides,
  };
}

function makeTranscript(
  id: string,
  conversationId: string | null,
  overrides: Partial<Transcript> = {},
): Transcript {
  const base: Transcript = {
    id,
    date: "",
    category: "test",
    conversationId,
    participants: [],
    durationSeconds: null,
    cueCount: 0,
    hasCues: false,
    cues: [],
    sourceFile: "test.md",
  };
  return { ...base, ...overrides };
}

function makeCue(speaker: string, speakerId?: string): TranscriptCue {
  return { startMs: 0, endMs: 1000, speaker, speakerId, text: "..." };
}

function makeSnippet(
  id: string,
  overrides: Partial<Snippet> = {},
): Snippet {
  return {
    id,
    clipId: "clip-x",
    category: "top-20",
    sourceFile: "src.md",
    audioFile: "a.m4a",
    startSeconds: 0,
    endSeconds: 1,
    durationSeconds: 1,
    speaker: "spk",
    transcript: "t",
    whatYoullHear: "w",
    top20Rank: null,
    exhibitMapping: [],
    conversationId: null,
    communicationId: null,
    ...overrides,
  };
}

function makeStakeholder(id: string): Stakeholder {
  return {
    id,
    name: id,
    role: "r",
    organisation: "o",
    initials: "x",
    colour: "#000000",
  };
}

function makeItem(
  id: string,
  sourceEntityId: string | null,
  sourceEntityType: "conversation" | "communication" | null,
): SourceBacked {
  return { id, sourceEntityId, sourceEntityType };
}

// ---------------------------------------------------------------------------
// createReporter
// ---------------------------------------------------------------------------

describe("createReporter", () => {
  it("accumulates messages before flush", () => {
    const r = createReporter(false);
    r.report("msg-1");
    r.report("msg-2");
    // no throw/warn yet — accumulation is silent
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    r.flush();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain("msg-1");
    expect(warnSpy.mock.calls[0][0]).toContain("msg-2");
    warnSpy.mockRestore();
  });

  it("flush() throws in strict mode when messages are present", () => {
    const r = createReporter(true);
    r.report("violation");
    expect(() => r.flush()).toThrow("violation");
  });

  it("flush() warns in non-strict mode when messages are present", () => {
    const r = createReporter(false);
    r.report("warn-me");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => r.flush()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it("flush() is a no-op when there are no messages", () => {
    const r = createReporter(true);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => r.flush()).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// checkActionBackref
// ---------------------------------------------------------------------------

describe("checkActionBackref", () => {
  it("happy path — communication origin mirrored in actionItemIds", () => {
    const comm = makeComm("comm-1", ["action-1"]);
    const item = makeItem("action-1", "comm-1", "communication");
    const msgs: string[] = [];
    checkActionBackref((m) => msgs.push(m), [item], [comm], []);
    expect(msgs).toHaveLength(0);
  });

  it("happy path — conversation origin mirrored in actionItemIds", () => {
    const conv = makeConv("conv-1", ["action-2"]);
    const item = makeItem("action-2", "conv-1", "conversation");
    const msgs: string[] = [];
    checkActionBackref((m) => msgs.push(m), [item], [], [conv]);
    expect(msgs).toHaveLength(0);
  });

  it("drift — communication exists but actionItemIds does not include the action", () => {
    const comm = makeComm("comm-1", []); // missing action-1
    const item = makeItem("action-1", "comm-1", "communication");
    const msgs: string[] = [];
    checkActionBackref((m) => msgs.push(m), [item], [comm], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("action-1");
    expect(msgs[0]).toContain("comm-1");
  });

  it("drift — conversation exists but actionItemIds does not include the action", () => {
    const conv = makeConv("conv-1", []); // missing action-2
    const item = makeItem("action-2", "conv-1", "conversation");
    const msgs: string[] = [];
    checkActionBackref((m) => msgs.push(m), [item], [], [conv]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
  });

  it("orphan parent — sourceEntityId references a non-existent communication", () => {
    const item = makeItem("action-1", "comm-missing", "communication");
    const msgs: string[] = [];
    checkActionBackref((m) => msgs.push(m), [item], [], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("missing communication comm-missing");
  });

  it("orphan parent — sourceEntityId references a non-existent conversation", () => {
    const item = makeItem("action-1", "conv-missing", "conversation");
    const msgs: string[] = [];
    checkActionBackref((m) => msgs.push(m), [item], [], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("missing conversation conv-missing");
  });

  it("null pointer — item with null source is skipped (no-op)", () => {
    const item = makeItem("action-1", null, null);
    const msgs: string[] = [];
    checkActionBackref((m) => msgs.push(m), [item], [], []);
    expect(msgs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkEvidenceBackref
// ---------------------------------------------------------------------------

describe("checkEvidenceBackref", () => {
  it("happy path — communication origin mirrored in evidenceIds", () => {
    const comm = makeComm("comm-1", [], ["ev-1"]);
    const item = makeItem("ev-1", "comm-1", "communication");
    const msgs: string[] = [];
    checkEvidenceBackref((m) => msgs.push(m), [item], [comm]);
    expect(msgs).toHaveLength(0);
  });

  it("drift — communication exists but evidenceIds does not include the evidence", () => {
    const comm = makeComm("comm-1", [], []); // missing ev-1
    const item = makeItem("ev-1", "comm-1", "communication");
    const msgs: string[] = [];
    checkEvidenceBackref((m) => msgs.push(m), [item], [comm]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("ev-1");
    expect(msgs[0]).toContain("comm-1");
  });

  it("missing parent — sourceEntityId references a non-existent communication", () => {
    const item = makeItem("ev-1", "comm-missing", "communication");
    const msgs: string[] = [];
    checkEvidenceBackref((m) => msgs.push(m), [item], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("missing communication comm-missing");
  });

  it("conversation source — no-op by design (Conversation has no evidenceIds)", () => {
    const item = makeItem("ev-1", "conv-1", "conversation");
    const msgs: string[] = [];
    checkEvidenceBackref((m) => msgs.push(m), [item], []);
    expect(msgs).toHaveLength(0);
  });

  it("null pointer — item with null source is skipped (no-op)", () => {
    const item = makeItem("ev-1", null, null);
    const msgs: string[] = [];
    checkEvidenceBackref((m) => msgs.push(m), [item], []);
    expect(msgs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkConversationActionIds
// ---------------------------------------------------------------------------

describe("checkConversationActionIds", () => {
  it("happy path — every conv.actionItemIds id resolves to an action", () => {
    const conv = makeConv("conv-1", ["a1", "a2"]);
    const msgs: string[] = [];
    checkConversationActionIds(
      (m) => msgs.push(m),
      [conv],
      [{ id: "a1" }, { id: "a2" }],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — conv.actionItemIds includes an id with no matching action", () => {
    const conv = makeConv("conv-1", ["a1", "a-missing"]);
    const msgs: string[] = [];
    checkConversationActionIds(
      (m) => msgs.push(m),
      [conv],
      [{ id: "a1" }],
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("conv-1");
    expect(msgs[0]).toContain("a-missing");
  });
});

// ---------------------------------------------------------------------------
// checkConversationParticipantIds
// ---------------------------------------------------------------------------

describe("checkConversationSnippetIds", () => {
  it("happy path — all linked snippet ids resolve", () => {
    const conv = makeConv("conv-1", [], [], { snippetIds: ["snip-1"] });
    const msgs: string[] = [];
    checkConversationSnippetIds(
      (m) => msgs.push(m),
      [conv],
      [{ id: "snip-1" }],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — snippetIds contains a missing snippet id", () => {
    const conv = makeConv("conv-1", [], [], {
      snippetIds: ["snip-1", "snip-missing"],
    });
    const msgs: string[] = [];
    checkConversationSnippetIds(
      (m) => msgs.push(m),
      [conv],
      [{ id: "snip-1" }],
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("missing snippet snip-missing");
  });

  it("no-op — snippetIds undefined (optional-array exception)", () => {
    const conv = makeConv("conv-1");
    expect(conv.snippetIds).toBeUndefined();
    const msgs: string[] = [];
    checkConversationSnippetIds((m) => msgs.push(m), [conv], []);
    expect(msgs).toHaveLength(0);
  });
});

describe("checkConversationParticipantIds", () => {
  it("happy path — every conv.participantIds id resolves to a stakeholder", () => {
    const conv = makeConv("conv-1", [], ["s1", "s2"]);
    const msgs: string[] = [];
    checkConversationParticipantIds(
      (m) => msgs.push(m),
      [conv],
      [makeStakeholder("s1"), makeStakeholder("s2")],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — conv.participantIds includes an id with no matching stakeholder", () => {
    const conv = makeConv("conv-1", [], ["s1", "s-missing"]);
    const msgs: string[] = [];
    checkConversationParticipantIds(
      (m) => msgs.push(m),
      [conv],
      [makeStakeholder("s1")],
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("conv-1");
    expect(msgs[0]).toContain("s-missing");
  });
});

// ---------------------------------------------------------------------------
// checkConversationTranscriptId
// ---------------------------------------------------------------------------

describe("checkConversationTranscriptId", () => {
  it("happy path — conv.transcriptId resolves to a transcript", () => {
    const conv = makeConv("conv-1", [], [], { transcriptId: "t-1" });
    const msgs: string[] = [];
    checkConversationTranscriptId(
      (m) => msgs.push(m),
      [conv],
      [makeTranscript("t-1", "conv-1")],
    );
    expect(msgs).toHaveLength(0);
  });

  it("no-op — conversation has no transcriptId", () => {
    const conv = makeConv("conv-1");
    const msgs: string[] = [];
    checkConversationTranscriptId((m) => msgs.push(m), [conv], []);
    expect(msgs).toHaveLength(0);
  });

  it("drift — conv.transcriptId references a non-existent transcript", () => {
    const conv = makeConv("conv-1", [], [], { transcriptId: "t-missing" });
    const msgs: string[] = [];
    checkConversationTranscriptId((m) => msgs.push(m), [conv], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("conv-1");
    expect(msgs[0]).toContain("t-missing");
  });
});

// ---------------------------------------------------------------------------
// checkTranscriptConversationId
// ---------------------------------------------------------------------------

describe("checkTranscriptConversationId", () => {
  it("happy path — transcript.conversationId resolves to a conversation", () => {
    const transcript = makeTranscript("t-1", "conv-1");
    const msgs: string[] = [];
    checkTranscriptConversationId(
      (m) => msgs.push(m),
      [transcript],
      [makeConv("conv-1")],
    );
    expect(msgs).toHaveLength(0);
  });

  it("no-op — transcript.conversationId is null", () => {
    const transcript = makeTranscript("t-1", null);
    const msgs: string[] = [];
    checkTranscriptConversationId((m) => msgs.push(m), [transcript], []);
    expect(msgs).toHaveLength(0);
  });

  it("drift — transcript.conversationId references a non-existent conversation", () => {
    const transcript = makeTranscript("t-1", "conv-missing");
    const msgs: string[] = [];
    checkTranscriptConversationId((m) => msgs.push(m), [transcript], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("t-1");
    expect(msgs[0]).toContain("conv-missing");
  });
});

// ---------------------------------------------------------------------------
// checkTranscriptSpeakers
// ---------------------------------------------------------------------------

describe("checkTranscriptSpeakers", () => {
  it("happy path — every cue.speakerId and speakerMap value resolves", () => {
    const transcript = makeTranscript("t-1", "conv-1", {
      cues: [makeCue("Ben", "s1"), makeCue("Adrian", "s2")],
      speakerMap: { Ben: "s1", Adrian: "s2" },
    });
    const msgs: string[] = [];
    checkTranscriptSpeakers(
      (m) => msgs.push(m),
      [transcript],
      [makeStakeholder("s1"), makeStakeholder("s2")],
    );
    expect(msgs).toHaveLength(0);
  });

  it("no-op — no speakerId on cues and no speakerMap", () => {
    const transcript = makeTranscript("t-1", "conv-1", {
      cues: [makeCue("Ben"), makeCue("Adrian")],
    });
    const msgs: string[] = [];
    checkTranscriptSpeakers((m) => msgs.push(m), [transcript], []);
    expect(msgs).toHaveLength(0);
  });

  it("drift — cue.speakerId references a non-existent stakeholder", () => {
    const transcript = makeTranscript("t-1", "conv-1", {
      cues: [makeCue("Ben", "s-missing")],
    });
    const msgs: string[] = [];
    checkTranscriptSpeakers((m) => msgs.push(m), [transcript], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("t-1");
    expect(msgs[0]).toContain("s-missing");
  });

  it("drift — speakerMap value references a non-existent stakeholder", () => {
    const transcript = makeTranscript("t-1", "conv-1", {
      speakerMap: { Ben: "s-missing" },
    });
    const msgs: string[] = [];
    checkTranscriptSpeakers((m) => msgs.push(m), [transcript], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("t-1");
    expect(msgs[0]).toContain("s-missing");
    expect(msgs[0]).toContain("Ben");
  });

  it("drift — participantIds references a non-existent stakeholder", () => {
    const transcript = makeTranscript("t-1", "conv-1", {
      participantIds: ["s1", "s-missing"],
    });
    const msgs: string[] = [];
    checkTranscriptSpeakers(
      (m) => msgs.push(m),
      [transcript],
      [makeStakeholder("s1")],
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("t-1");
    expect(msgs[0]).toContain("participantIds");
    expect(msgs[0]).toContain("s-missing");
  });
});

// ---------------------------------------------------------------------------
// checkCommunicationClaimIds
// ---------------------------------------------------------------------------

describe("checkCommunicationClaimIds", () => {
  it("happy path — every comm.claimIds id resolves to a claim", () => {
    const comm = makeComm("comm-1", [], [], { claimIds: ["c1", "c2"] });
    const msgs: string[] = [];
    checkCommunicationClaimIds(
      (m) => msgs.push(m),
      [comm],
      [makeClaim("c1"), makeClaim("c2")],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — comm.claimIds includes an id with no matching claim", () => {
    const comm = makeComm("comm-1", [], [], {
      claimIds: ["c1", "c-missing"],
    });
    const msgs: string[] = [];
    checkCommunicationClaimIds(
      (m) => msgs.push(m),
      [comm],
      [makeClaim("c1")],
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("comm-1");
    expect(msgs[0]).toContain("c-missing");
  });

  it("drift — multiple missing claim ids on one communication produce multiple reports", () => {
    const comm = makeComm("comm-1", [], [], {
      claimIds: ["c-missing-1", "c-missing-2"],
    });
    const msgs: string[] = [];
    checkCommunicationClaimIds((m) => msgs.push(m), [comm], []);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toContain("c-missing-1");
    expect(msgs[1]).toContain("c-missing-2");
  });
});

// ---------------------------------------------------------------------------
// checkCommunicationRiskIds
// ---------------------------------------------------------------------------

describe("checkCommunicationRiskIds", () => {
  it("happy path — every comm.riskIds id resolves to a risk", () => {
    const comm = makeComm("comm-1", [], [], { riskIds: ["r1", "r2"] });
    const msgs: string[] = [];
    checkCommunicationRiskIds(
      (m) => msgs.push(m),
      [comm],
      [makeRisk("r1"), makeRisk("r2")],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — comm.riskIds includes an id with no matching risk", () => {
    const comm = makeComm("comm-1", [], [], {
      riskIds: ["r1", "r-missing"],
    });
    const msgs: string[] = [];
    checkCommunicationRiskIds(
      (m) => msgs.push(m),
      [comm],
      [makeRisk("r1")],
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("comm-1");
    expect(msgs[0]).toContain("r-missing");
  });

  it("drift — multiple missing risk ids on one communication produce multiple reports", () => {
    const comm = makeComm("comm-1", [], [], {
      riskIds: ["r-missing-1", "r-missing-2"],
    });
    const msgs: string[] = [];
    checkCommunicationRiskIds((m) => msgs.push(m), [comm], []);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toContain("r-missing-1");
    expect(msgs[1]).toContain("r-missing-2");
  });
});

// ---------------------------------------------------------------------------
// checkCommunicationConversationIds
// ---------------------------------------------------------------------------

describe("checkCommunicationConversationIds", () => {
  it("happy path — every comm.conversationIds id resolves to a conversation", () => {
    const comm = makeComm("comm-1", [], [], {
      conversationIds: ["conv-1", "conv-2"],
    });
    const msgs: string[] = [];
    checkCommunicationConversationIds(
      (m) => msgs.push(m),
      [comm],
      [makeConv("conv-1"), makeConv("conv-2")],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — comm.conversationIds includes an id with no matching conversation", () => {
    const comm = makeComm("comm-1", [], [], {
      conversationIds: ["conv-1", "conv-missing"],
    });
    const msgs: string[] = [];
    checkCommunicationConversationIds(
      (m) => msgs.push(m),
      [comm],
      [makeConv("conv-1")],
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("comm-1");
    expect(msgs[0]).toContain("conv-missing");
  });

  it("drift — multiple missing conversation ids on one communication produce multiple reports", () => {
    const comm = makeComm("comm-1", [], [], {
      conversationIds: ["conv-missing-1", "conv-missing-2"],
    });
    const msgs: string[] = [];
    checkCommunicationConversationIds((m) => msgs.push(m), [comm], []);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toContain("conv-missing-1");
    expect(msgs[1]).toContain("conv-missing-2");
  });
});

// ---------------------------------------------------------------------------
// checkRiskActionIds
// ---------------------------------------------------------------------------

describe("checkRiskActionIds", () => {
  it("happy path — every risk.actionIds id resolves to an action", () => {
    const risk: Risk = { ...makeRisk("r1"), actionIds: ["a1", "a2"] };
    const msgs: string[] = [];
    checkRiskActionIds(
      (m) => msgs.push(m),
      [risk],
      [{ id: "a1" }, { id: "a2" }],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — risk.actionIds includes an id with no matching action", () => {
    const risk: Risk = { ...makeRisk("r1"), actionIds: ["a1", "a-missing"] };
    const msgs: string[] = [];
    checkRiskActionIds((m) => msgs.push(m), [risk], [{ id: "a1" }]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("r1");
    expect(msgs[0]).toContain("a-missing");
  });
});

// ---------------------------------------------------------------------------
// checkClaimEvidenceIds
// ---------------------------------------------------------------------------

describe("checkClaimEvidenceIds", () => {
  it("happy path — every claim.evidenceIds id resolves to evidence", () => {
    const claim: Claim = { ...makeClaim("c1"), evidenceIds: ["e1", "e2"] };
    const msgs: string[] = [];
    checkClaimEvidenceIds(
      (m) => msgs.push(m),
      [claim],
      [{ id: "e1" }, { id: "e2" }],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — claim.evidenceIds includes an id with no matching evidence", () => {
    const claim: Claim = {
      ...makeClaim("c1"),
      evidenceIds: ["e1", "e-missing"],
    };
    const msgs: string[] = [];
    checkClaimEvidenceIds((m) => msgs.push(m), [claim], [{ id: "e1" }]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("c1");
    expect(msgs[0]).toContain("e-missing");
  });
});

// ---------------------------------------------------------------------------
// checkTimelineLinkedEntity
// ---------------------------------------------------------------------------

function makeTimeline(
  id: string,
  linkedEntityId: string | null,
  linkedEntityType: TimelineEvent["linkedEntityType"],
): TimelineEvent {
  return {
    id,
    date: "2024-01-01",
    type: "milestone",
    title: "t",
    description: "d",
    stakeholderIds: [],
    linkedEntityId,
    linkedEntityType,
  };
}

const emptyLookups = {
  conversations: [] as Conversation[],
  communications: [] as Communication[],
  actions: [] as { id: string }[],
  risks: [] as { id: string }[],
  claims: [] as { id: string }[],
};

describe("checkTimelineLinkedEntity", () => {
  it("no-op — both fields null", () => {
    const event = makeTimeline("t1", null, null);
    const msgs: string[] = [];
    checkTimelineLinkedEntity((m) => msgs.push(m), [event], emptyLookups);
    expect(msgs).toHaveLength(0);
  });

  it("happy path — both set, target exists", () => {
    const event = makeTimeline("t1", "conv-1", "conversation");
    const msgs: string[] = [];
    checkTimelineLinkedEntity((m) => msgs.push(m), [event], {
      ...emptyLookups,
      conversations: [makeConv("conv-1")],
    });
    expect(msgs).toHaveLength(0);
  });

  it("drift — half-pointer with id but null type", () => {
    const event = makeTimeline("t1", "conv-1", null);
    const msgs: string[] = [];
    checkTimelineLinkedEntity((m) => msgs.push(m), [event], emptyLookups);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("mismatched");
    expect(msgs[0]).toContain("t1");
  });

  it("drift — half-pointer with type but null id", () => {
    const event = makeTimeline("t1", null, "conversation");
    const msgs: string[] = [];
    checkTimelineLinkedEntity((m) => msgs.push(m), [event], emptyLookups);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("mismatched");
  });

  it("drift — both set but target does not exist in named collection", () => {
    const event = makeTimeline("t1", "risk-missing", "risk");
    const msgs: string[] = [];
    checkTimelineLinkedEntity((m) => msgs.push(m), [event], emptyLookups);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("missing risk risk-missing");
  });
});

// ---------------------------------------------------------------------------
// checkSnippetBackref
// ---------------------------------------------------------------------------

describe("checkSnippetBackref", () => {
  it("happy path — all three link kinds resolve", () => {
    const snippet = makeSnippet("snip-1", {
      conversationId: "conv-1",
      communicationId: "comm-1",
      evidenceIds: ["ev-1"],
    });
    const msgs: string[] = [];
    checkSnippetBackref(
      (m) => msgs.push(m),
      [snippet],
      [makeConv("conv-1")],
      [makeComm("comm-1")],
      [{ id: "ev-1" }],
    );
    expect(msgs).toHaveLength(0);
  });

  it("drift — conversationId references missing conversation", () => {
    const snippet = makeSnippet("snip-1", { conversationId: "conv-missing" });
    const msgs: string[] = [];
    checkSnippetBackref((m) => msgs.push(m), [snippet], [], [], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("missing conversation conv-missing");
  });

  it("drift — communicationId references missing communication", () => {
    const snippet = makeSnippet("snip-1", { communicationId: "comm-missing" });
    const msgs: string[] = [];
    checkSnippetBackref((m) => msgs.push(m), [snippet], [], [], []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("missing communication comm-missing");
  });

  it("drift — evidenceIds contains a missing evidence id", () => {
    const snippet = makeSnippet("snip-1", {
      evidenceIds: ["ev-1", "ev-missing"],
    });
    const msgs: string[] = [];
    checkSnippetBackref(
      (m) => msgs.push(m),
      [snippet],
      [],
      [],
      [{ id: "ev-1" }],
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/backref-drift/);
    expect(msgs[0]).toContain("missing evidence ev-missing");
  });

  it("no-op — evidenceIds undefined (optional-array exception)", () => {
    const snippet = makeSnippet("snip-1");
    expect(snippet.evidenceIds).toBeUndefined();
    const msgs: string[] = [];
    checkSnippetBackref((m) => msgs.push(m), [snippet], [], [], []);
    expect(msgs).toHaveLength(0);
  });

  it("no-op — both conversationId and communicationId null", () => {
    const snippet = makeSnippet("snip-1", {
      conversationId: null,
      communicationId: null,
    });
    const msgs: string[] = [];
    checkSnippetBackref((m) => msgs.push(m), [snippet], [], [], []);
    expect(msgs).toHaveLength(0);
  });
});
