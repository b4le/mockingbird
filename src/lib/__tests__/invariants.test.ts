import { describe, it, expect, vi } from "vitest";
import {
  createReporter,
  checkActionBackref,
  checkConversationActionIds,
  checkConversationParticipantIds,
  checkEvidenceBackref,
  type SourceBacked,
} from "@/lib/invariants";
import type { Communication, Conversation, Stakeholder } from "@/types";

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

function makeComm(
  id: string,
  actionItemIds: string[] = [],
  evidenceIds: string[] = [],
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
  };
}

function makeConv(
  id: string,
  actionItemIds: string[] = [],
  participantIds: string[] = [],
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
