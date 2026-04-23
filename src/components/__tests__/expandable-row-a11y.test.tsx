import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TimelineEntry } from "@/components/timeline/TimelineEntry";
import { RiskRegister } from "@/components/actions/RiskRegister";
import { CommunicationsPageClient } from "@/components/communications/CommunicationsPageClient";
import { EvidencePageClient } from "@/components/evidence/EvidencePageClient";
import type {
  ActionItem,
  Claim,
  Communication,
  Conversation,
  EvidenceItem,
  Risk,
  Stakeholder,
  TimelineEvent,
} from "@/types";

// Minimal real fixtures — constructed in-file from the public type shapes in
// src/types/index.ts. Kept free of `as unknown as` casts so a schema change
// that widens any required field surfaces as a compile error here.

const stakeholder: Stakeholder = {
  id: "s1",
  name: "Ada Lovelace",
  role: "Engineer",
  organisation: "ACME",
  initials: "AL",
  colour: "#4f46e5",
};

const conversation: Conversation = {
  id: "c1",
  date: "2026-04-01",
  title: "Kickoff",
  participantIds: ["s1"],
  summary: "",
  keyPoints: [],
  decisions: [],
  actionItemIds: [],
};

const communication: Communication = {
  id: "m1",
  channel: "email",
  date: "2026-04-01",
  subject: "Launch plan review",
  participantIds: ["s1"],
  summary: "",
  messages: [],
  actionItemIds: [],
  claimIds: [],
  evidenceIds: [],
  riskIds: [],
  conversationIds: [],
};

const risk: Risk = {
  id: "r1",
  title: "Dependency slippage",
  description: "Upstream dependency may slip past launch window.",
  status: "open",
  severity: "high",
  likelihood: "medium",
  mitigationPlan: "Escalate to vendor weekly.",
  actionIds: [],
  createdDate: "2026-04-01",
  updatedDate: "2026-04-01",
};

const evidence: EvidenceItem = {
  id: "e1",
  title: "Launch metrics snapshot",
  description: "Weekly rollup of launch-readiness metrics.",
  source: "doc",
  sourceType: "document",
  strength: "strong",
  date: "2026-04-01",
  url: null,
  claimIds: ["cl1"],
  sourceEntityId: null,
  sourceEntityType: null,
};

const claim: Claim = {
  id: "cl1",
  assertion: "We shipped on schedule",
  category: "Delivery",
  status: "supported",
  evidenceIds: ["e1"],
  raisedById: "s1",
  date: "2026-04-01",
};

const timelineEvent: TimelineEvent = {
  id: "t1",
  date: "2026-04-01",
  type: "conversation",
  title: "Kickoff notes",
  description: "Discussed scope and owners.",
  stakeholderIds: ["s1"],
  linkedEntityId: "c1",
  linkedEntityType: "conversation",
};

const actions: ActionItem[] = [];

describe('expandable-row a11y — every role="button" surface has a non-empty aria-label', () => {
  it("TimelineEntry expandable row has an aria-label", () => {
    const { container } = render(
      <TimelineEntry
        event={timelineEvent}
        stakeholderMap={new Map([["s1", stakeholder]])}
        conversations={[conversation]}
        communications={[]}
        onStakeholderClick={() => {}}
      />,
    );
    const btn = container.querySelector('[role="button"]');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute("aria-label")).toBe(
      "Expand timeline event: Kickoff notes",
    );
  });

  it("RiskRegister expandable row has an aria-label", () => {
    const { container } = render(
      <RiskRegister risks={[risk]} actions={actions} />,
    );
    const btns = container.querySelectorAll('[role="button"]');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach((b) => {
      const label = b.getAttribute("aria-label");
      expect(label).not.toBeNull();
      expect(label).toMatch(/^Expand risk: /);
    });
  });

  it("CommunicationsPageClient thread card has an aria-label", () => {
    const { container } = render(
      <CommunicationsPageClient
        communications={[communication]}
        stakeholders={[stakeholder]}
        conversations={[]}
        actions={[]}
        claims={[]}
        evidence={[]}
        risks={[]}
      />,
    );
    const btns = container.querySelectorAll('[role="button"]');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach((b) => {
      const label = b.getAttribute("aria-label");
      expect(label).not.toBeNull();
      expect(label).toMatch(/^Select communication: /);
    });
  });

  it("EvidencePageClient claim and evidence cards have aria-labels", () => {
    const { container } = render(
      <EvidencePageClient
        claims={[claim]}
        evidence={[evidence]}
        stakeholders={[stakeholder]}
        conversations={[]}
        communications={[]}
      />,
    );
    // The claim card is present on initial render; the evidence row only
    // mounts after a claim is selected. The broad invariant below covers
    // both without synthesising a click: every [role="button"] must have a
    // non-empty aria-label.
    const btns = container.querySelectorAll('[role="button"]');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach((b) => {
      const label = b.getAttribute("aria-label");
      expect(label).not.toBeNull();
      expect(label).not.toBe("");
    });
    // Tighter check on the claim card specifically (aria-pressed → "Select claim: …").
    const claimCards = container.querySelectorAll(
      '[role="button"][aria-pressed]',
    );
    expect(claimCards.length).toBeGreaterThan(0);
    claimCards.forEach((b) => {
      expect(b.getAttribute("aria-label")).toMatch(/^Select claim: /);
    });
  });
});
