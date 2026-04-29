import { afterEach, describe, it, expect } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

// Vitest does not run @testing-library/react's auto-cleanup unless
// `globals: true` is set; this project keeps globals off (see
// `vitest.config.ts`). Without explicit cleanup the document body
// accumulates DOM from prior renders and `getByRole` finds duplicates.
afterEach(() => {
  cleanup();
});

import { ConversationDetail } from "../ConversationDetail";
import type {
  ActionItem,
  AudioReference,
  Conversation,
  Stakeholder,
  Transcript,
} from "@/types";

const stakeholderA: Stakeholder = {
  id: "s1",
  name: "Alex Stone",
  role: "PM",
  organisation: "Acme",
  initials: "AS",
  colour: "#112233",
};

const stakeholderB: Stakeholder = {
  id: "s2",
  name: "Maria Lin",
  role: "Eng",
  organisation: "Acme",
  initials: "ML",
  colour: "#445566",
};

const baseConversation: Conversation = {
  id: "c1",
  date: "2026-03-04T09:00:00Z",
  title: "Architecture Decision: Database",
  participantIds: ["s1", "s2"],
  summary: "Picked Postgres.",
  keyPoints: ["Postgres benchmarked well", "Tom confirmed infra fit"],
  decisions: ["Selected PostgreSQL"],
  actionItemIds: ["a1"],
  medium: "in-person",
};

const action: ActionItem = {
  id: "a1",
  title: "Spike on schema migration",
  description: "",
  status: "todo",
  priority: "high",
  ownerId: "s2",
  createdDate: "2026-03-04",
  dueDate: null,
  completedDate: null,
  tags: [],
  sourceEntityId: "c1",
  sourceEntityType: "conversation",
};

const audioReference: AudioReference = {
  driveId: "10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS",
  filename: "Architecture Decision.m4a",
  driveFolderId: "1Q4wFg7jZTdNty03u2GJL54FZxfsdPE0m",
  mimeType: "audio/x-m4a",
  viewUrl:
    "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/view?usp=drive_link",
  previewUrl:
    "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/preview",
  sizeBytes: null,
  durationSeconds: null,
  status: "complete",
};

interface RenderDetailOptions {
  conversation?: Partial<Conversation>;
  transcript?: Transcript | null;
}

function makeTranscript(overrides: Partial<Transcript> = {}): Transcript {
  return {
    id: "t1",
    date: "",
    category: "demo",
    conversationId: "c1",
    participants: ["Alex Stone"],
    durationSeconds: 120,
    cueCount: 1,
    hasCues: true,
    cues: [{ startMs: 0, endMs: 1000, speaker: "Alex Stone", text: "Hello." }],
    sourceFile: "x",
    ...overrides,
  };
}

function renderDetail(
  overridesOrOptions: Partial<Conversation> | RenderDetailOptions = {},
) {
  const options: RenderDetailOptions =
    "conversation" in overridesOrOptions || "transcript" in overridesOrOptions
      ? (overridesOrOptions as RenderDetailOptions)
      : { conversation: overridesOrOptions as Partial<Conversation> };
  const conversation: Conversation = {
    ...baseConversation,
    ...options.conversation,
  };
  const stakeholderMap = new Map([
    [stakeholderA.id, stakeholderA],
    [stakeholderB.id, stakeholderB],
  ]);
  const actionMap = new Map([[action.id, action]]);
  return render(
    <ConversationDetail
      conversation={conversation}
      stakeholderMap={stakeholderMap}
      actionMap={actionMap}
      stakeholders={[stakeholderA, stakeholderB]}
      transcript={options.transcript ?? null}
      onStakeholderClick={() => {}}
    />,
  );
}

describe("ConversationDetail", () => {
  it("renders the title and the medium badge", () => {
    const { getByText, getAllByText } = renderDetail();
    expect(getByText("Architecture Decision: Database")).not.toBeNull();
    // Badge plus aria-label both surface the same string — assert at
    // least one mention is in the DOM rather than over-specifying.
    expect(getAllByText(/in-person meeting/i).length).toBeGreaterThan(0);
  });

  it("renders a non-null date via DateDisplay", () => {
    const { container } = renderDetail();
    // DateDisplay's server pass renders a span with the formatted
    // absolute date; assert the container does NOT show the null
    // placeholder.
    expect(container.textContent).not.toContain("—");
  });

  it("hides the key points section when keyPoints is empty", () => {
    const { queryByText } = renderDetail({ keyPoints: [] });
    expect(queryByText("Key points")).toBeNull();
  });

  it("hides the decisions section when decisions is empty", () => {
    const { queryByText } = renderDetail({ decisions: [] });
    expect(queryByText("Decisions")).toBeNull();
  });

  it("does not render the audio player when audioReference is absent", () => {
    const { container } = renderDetail();
    expect(container.querySelector("audio")).toBeNull();
  });

  it("renders the audio player when audioReference is present", () => {
    const { container } = renderDetail({ audioReference });
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute("src")).toBe(audioReference.previewUrl);
  });

  it("renders linked actions when the user opens the Linked tab", () => {
    const { getByRole, getByText } = renderDetail();
    fireEvent.click(getByRole("tab", { name: "Linked" }));
    expect(getByText("Action items")).not.toBeNull();
    expect(getByText("Spike on schema migration")).not.toBeNull();
  });

  it("renders three tab triggers", () => {
    const { getByRole } = renderDetail();
    expect(getByRole("tab", { name: "Overview" })).not.toBeNull();
    expect(getByRole("tab", { name: "Transcript" })).not.toBeNull();
    expect(getByRole("tab", { name: "Linked" })).not.toBeNull();
  });

  it("defaults to the Overview tab when no transcript is supplied", () => {
    const { getByRole } = renderDetail();
    const overviewTab = getByRole("tab", { name: "Overview" });
    expect(overviewTab.getAttribute("data-active")).toBe("");
  });

  it("defaults to the Transcript tab when a transcript is supplied", () => {
    const { getByRole } = renderDetail({ transcript: makeTranscript() });
    const transcriptTab = getByRole("tab", { name: "Transcript" });
    expect(transcriptTab.getAttribute("data-active")).toBe("");
  });

  it("disables the Transcript trigger when neither structured nor flat transcript exists", () => {
    const { getByRole } = renderDetail();
    const transcriptTab = getByRole("tab", { name: "Transcript" });
    expect(transcriptTab.getAttribute("aria-disabled")).toBe("true");
  });

  it("enables the Transcript trigger when only a flat fallback exists", () => {
    const { getByRole } = renderDetail({
      conversation: { transcript: "Some flat transcript text." },
    });
    const transcriptTab = getByRole("tab", { name: "Transcript" });
    expect(transcriptTab.getAttribute("aria-disabled")).not.toBe("true");
  });

  it("renders the audio player above the tab list", () => {
    const { container } = renderDetail({
      conversation: { audioReference },
    });
    const audio = container.querySelector("audio");
    const tabList = container.querySelector('[role="tablist"]');
    expect(audio).not.toBeNull();
    expect(tabList).not.toBeNull();
    // Both nodes should share an ancestor and audio precedes the tab list
    // in document order.
    const compared = audio!.compareDocumentPosition(tabList!);
    // DOCUMENT_POSITION_FOLLOWING (4) means tabList comes after audio.
    expect(compared & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
