import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render } from "@testing-library/react";

// Vitest does not run @testing-library/react's auto-cleanup unless
// `globals: true` is set; this project keeps globals off (see
// `vitest.config.ts`). Without explicit cleanup the document body
// accumulates DOM from prior renders and `getByRole` finds duplicates.
afterEach(() => {
  cleanup();
});

import { CommunicationDetail } from "../CommunicationDetail";
import type {
  ActionItem,
  Claim,
  Communication,
  Conversation,
  EvidenceItem,
  Risk,
  Stakeholder,
} from "@/types";

const stakeholderEbba: Stakeholder = {
  id: "stakeholder-ebba",
  name: "Ebba",
  role: "HR",
  organisation: "Acme",
  initials: "EB",
  colour: "#112233",
};

const stakeholderBen: Stakeholder = {
  id: "stakeholder-ben-purslow",
  name: "Ben Purslow",
  role: "Engineering",
  organisation: "Acme",
  initials: "BP",
  colour: "#445566",
};

function makeMaps() {
  const stakeholderMap = new Map<string, Stakeholder>([
    [stakeholderEbba.id, stakeholderEbba],
    [stakeholderBen.id, stakeholderBen],
  ]);
  const conversationMap = new Map<string, Conversation>();
  const actionMap = new Map<string, ActionItem>();
  const claimMap = new Map<string, Claim>();
  const evidenceMap = new Map<string, EvidenceItem>();
  const riskMap = new Map<string, Risk>();
  return {
    stakeholderMap,
    conversationMap,
    actionMap,
    claimMap,
    evidenceMap,
    riskMap,
  };
}

describe("CommunicationDetail — per-message attachments", () => {
  it("renders each message attachment under its owning message with filename and MIME · size meta", () => {
    const communication: Communication = {
      id: "email-hr-19bfa273eca78c37",
      channel: "email",
      date: "2026-01-26T11:52:00Z",
      subject: "Proposed Mutual Separation Agreement",
      participantIds: [stakeholderEbba.id, stakeholderBen.id],
      summary: "Proposed Mutual Separation Agreement",
      messages: [
        {
          id: "email-hr-19bfa273eca78c37-msg-0",
          date: "2026-01-26T11:52:00Z",
          senderId: stakeholderEbba.id,
          bodyPreview: "Hi again Ben, please see attached.",
          attachments: [
            {
              filename: "INTOO Global Outplacement Program.pdf",
              name: "INTOO Global Outplacement Program.pdf",
              mime: "application/pdf",
              size: 165351,
              path: "local-state/emails/attachments/19bfa273eca78c37/INTOO Global Outplacement Program.pdf",
            },
            {
              filename: "Termination Agreement Ben Purslow.docx.pdf",
              name: "Termination Agreement Ben Purslow.docx.pdf",
              mime: "application/pdf",
              size: 128595,
              path: "local-state/emails/attachments/19bfa273eca78c37/Termination Agreement Ben Purslow.docx.pdf",
            },
          ],
        },
        {
          id: "email-hr-19bfa273eca78c37-msg-1",
          date: "2026-01-27T12:50:16Z",
          senderId: stakeholderBen.id,
          bodyPreview: "Thanks, will review.",
        },
      ],
      actionItemIds: [],
      claimIds: [],
      evidenceIds: [],
      riskIds: [],
      conversationIds: [],
    };

    const { getByText, queryAllByText } = render(
      <CommunicationDetail
        communication={communication}
        {...makeMaps()}
        onStakeholderClick={() => {}}
      />,
    );

    // Both filenames are present in the rendered output.
    expect(getByText("INTOO Global Outplacement Program.pdf")).toBeTruthy();
    expect(getByText("Termination Agreement Ben Purslow.docx.pdf")).toBeTruthy();

    // Each attachment has a `MIME · size` metadata line. `formatAttachmentMeta`
    // formats application/pdf as "PDF" and bytes as base-1024 KB.
    expect(getByText("PDF · 161 KB")).toBeTruthy();
    expect(getByText("PDF · 126 KB")).toBeTruthy();

    // The legacy Communication-level "Attachments (n)" header must NOT appear
    // when only per-message attachments are present.
    expect(queryAllByText(/^Attachments \(\d+\)$/).length).toBe(0);
  });

  it("renders nothing per-message when attachments array is absent or empty", () => {
    const communication: Communication = {
      id: "comm-2",
      channel: "email",
      date: "2026-02-01T10:00:00Z",
      subject: "Plain note",
      participantIds: [stakeholderEbba.id],
      summary: "no attachments anywhere",
      messages: [
        {
          id: "msg-a",
          date: "2026-02-01T10:00:00Z",
          senderId: stakeholderEbba.id,
          bodyPreview: "Just a heads-up.",
          // attachments omitted entirely
        },
        {
          id: "msg-b",
          date: "2026-02-01T11:00:00Z",
          senderId: stakeholderEbba.id,
          bodyPreview: "Privileged content redacted.",
          attachments: [], // explicit empty (privileged-redacted shape)
        },
      ],
      actionItemIds: [],
      claimIds: [],
      evidenceIds: [],
      riskIds: [],
      conversationIds: [],
    };

    const { container, queryAllByRole } = render(
      <CommunicationDetail
        communication={communication}
        {...makeMaps()}
        onStakeholderClick={() => {}}
      />,
    );

    // No paperclip emojis (📎) anywhere — neither per-message nor
    // Communication-level. Each attachment renders one.
    expect(container.textContent).not.toContain("📎");

    // No "Attachment" aria-labelled elements either.
    expect(queryAllByRole("img", { name: /Attachment/ }).length).toBe(0);
  });

  it("preserves the existing Communication-level renderer for legacy fixtures", () => {
    const communication: Communication = {
      id: "legacy-comm",
      channel: "email",
      date: "2025-09-01T00:00:00Z",
      subject: "Legacy thread",
      participantIds: [stakeholderEbba.id],
      summary: "communication-level attachments only",
      messages: [
        {
          id: "msg-legacy-0",
          date: "2025-09-01T00:00:00Z",
          senderId: stakeholderEbba.id,
          bodyPreview: "See attached.",
          // No per-message attachments.
        },
      ],
      attachments: [
        {
          name: "Legacy.pdf",
          mime: "application/pdf",
          size: 4096,
        },
      ],
      actionItemIds: [],
      claimIds: [],
      evidenceIds: [],
      riskIds: [],
      conversationIds: [],
    };

    const { getByText } = render(
      <CommunicationDetail
        communication={communication}
        {...makeMaps()}
        onStakeholderClick={() => {}}
      />,
    );

    // The Communication-level header still fires.
    expect(getByText("Attachments (1)")).toBeTruthy();
    expect(getByText("Legacy.pdf")).toBeTruthy();
    expect(getByText("PDF · 4 KB")).toBeTruthy();
  });
});
