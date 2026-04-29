import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TranscriptList } from "../TranscriptList";
import type { Stakeholder, TranscriptCue as TranscriptCueModel } from "@/types";

afterEach(() => {
  cleanup();
});

const ben: Stakeholder = {
  id: "stakeholder-ben",
  name: "Ben",
  role: "Founder",
  organisation: "Acme",
  initials: "B",
  colour: "#111",
};

const adrian: Stakeholder = {
  id: "stakeholder-adrian",
  name: "Adrian",
  role: "Engineer",
  organisation: "Acme",
  initials: "A",
  colour: "#222",
};

const cues: TranscriptCueModel[] = [
  { startMs: 0, endMs: 1000, speaker: "Ben", text: "Hello." },
  { startMs: 1000, endMs: 2000, speaker: "Ben", text: "How are you?" },
  { startMs: 2000, endMs: 3000, speaker: "Adrian", text: "Good thanks." },
  { startMs: 3000, endMs: 4000, speaker: "Ben", text: "Great." },
];

describe("TranscriptList", () => {
  it("renders speaker headers for grouped consecutive cues", () => {
    const map = new Map<string, Stakeholder>([
      ["Ben", ben],
      ["Adrian", adrian],
    ]);
    const { getAllByText } = render(
      <TranscriptList cues={cues} speakerStakeholderMap={map} />,
    );
    // Speaker labels render as visible text in headers. We expect at least one
    // header per turn — three turns total (Ben, Adrian, Ben).
    expect(getAllByText("Ben").length).toBeGreaterThanOrEqual(2);
    expect(getAllByText("Adrian").length).toBeGreaterThanOrEqual(1);
  });

  it("renders cue text for every cue", () => {
    const map = new Map<string, Stakeholder>([
      ["Ben", ben],
      ["Adrian", adrian],
    ]);
    const { getByText } = render(
      <TranscriptList cues={cues} speakerStakeholderMap={map} />,
    );
    expect(getByText("Hello.")).not.toBeNull();
    expect(getByText("How are you?")).not.toBeNull();
    expect(getByText("Good thanks.")).not.toBeNull();
    expect(getByText("Great.")).not.toBeNull();
  });
});
