import { afterEach, describe, it, expect } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { TimelineEntry } from "@/components/timeline/TimelineEntry";
import type {
  AudioReference,
  Conversation,
  Stakeholder,
  TimelineEvent,
} from "@/types";

afterEach(() => {
  cleanup();
});

const stakeholder: Stakeholder = {
  id: "s1",
  name: "Ada Lovelace",
  role: "Engineer",
  organisation: "ACME",
  initials: "AL",
  colour: "#4f46e5",
};

const audioRef: AudioReference = {
  driveId: "10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS",
  filename: "Adrian + Ben 11th Feb.m4a",
  driveFolderId: "1Q4wFg7jZTdNty03u2GJL54FZxfsdPE0m",
  mimeType: "audio/x-m4a",
  viewUrl:
    "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/view?usp=drive_link",
  previewUrl:
    "https://drive.google.com/file/d/10SFoR3TACZTsUgmoT86ZbRR5Ja20mBrS/preview",
  sizeBytes: 53896450,
  durationSeconds: null,
  status: "complete",
};

const conversationWithAudio: Conversation = {
  id: "c1",
  date: "2026-04-01",
  title: "Kickoff",
  participantIds: ["s1"],
  summary: "",
  keyPoints: [],
  decisions: [],
  actionItemIds: [],
  audioReference: audioRef,
};

const conversationNoAudio: Conversation = {
  ...conversationWithAudio,
  id: "c2",
  audioReference: undefined,
};

const event: TimelineEvent = {
  id: "e1",
  date: "2026-04-01",
  type: "conversation",
  title: "Kickoff conversation",
  description: "First sync.",
  stakeholderIds: ["s1"],
  linkedEntityType: "conversation",
  linkedEntityId: "c1",
};

const eventNoAudio: TimelineEvent = {
  ...event,
  id: "e2",
  linkedEntityId: "c2",
};

const stakeholderMap = new Map([[stakeholder.id, stakeholder]]);

describe("TimelineEntry audio indicator", () => {
  it("shows the audio indicator on a collapsed row when the linked conversation has audio", () => {
    const { getByRole } = render(
      <TimelineEntry
        event={event}
        stakeholderMap={stakeholderMap}
        conversations={[conversationWithAudio]}
        communications={[]}
        onStakeholderClick={() => {}}
      />,
    );
    expect(
      getByRole("img", { name: /has audio recording/i }),
    ).not.toBeNull();
  });

  it("hides the audio indicator after the row is expanded (player takes over)", () => {
    const { getByRole, queryByRole } = render(
      <TimelineEntry
        event={event}
        stakeholderMap={stakeholderMap}
        conversations={[conversationWithAudio]}
        communications={[]}
        onStakeholderClick={() => {}}
      />,
    );
    // Confirm the indicator is visible while collapsed.
    expect(
      queryByRole("img", { name: /has audio recording/i }),
    ).not.toBeNull();

    // Click the expandable row.
    const row = getByRole("button", { name: /expand timeline event/i });
    fireEvent.click(row);

    // Indicator should disappear; the embedded player provides the
    // affordance instead.
    expect(
      queryByRole("img", { name: /has audio recording/i }),
    ).toBeNull();
  });

  it("does not render the indicator when the linked conversation has no audioReference", () => {
    const { queryByRole } = render(
      <TimelineEntry
        event={eventNoAudio}
        stakeholderMap={stakeholderMap}
        conversations={[conversationNoAudio]}
        communications={[]}
        onStakeholderClick={() => {}}
      />,
    );
    expect(
      queryByRole("img", { name: /has audio recording/i }),
    ).toBeNull();
  });
});
