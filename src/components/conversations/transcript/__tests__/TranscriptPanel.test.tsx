import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { TranscriptPanel } from "../TranscriptPanel";
import type { Stakeholder, Transcript } from "@/types";

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

function makeTranscript(overrides: Partial<Transcript> = {}): Transcript {
  return {
    id: "t1",
    date: "",
    category: "demo",
    conversationId: "c1",
    participants: ["Ben"],
    durationSeconds: 120,
    cueCount: 1,
    hasCues: true,
    cues: [{ startMs: 0, endMs: 1000, speaker: "Ben", text: "Hello." }],
    sourceFile: "x",
    ...overrides,
  };
}

describe("TranscriptPanel", () => {
  it("renders the 'none' empty state when no transcript and no flat fallback", () => {
    const { getByText } = render(
      <TranscriptPanel
        transcript={null}
        speakerStakeholderMap={new Map()}
      />,
    );
    expect(getByText(/No transcript available/i)).not.toBeNull();
  });

  it("renders the flat fallback when no transcript record but flatTranscript provided", () => {
    const { getByText } = render(
      <TranscriptPanel
        transcript={null}
        flatTranscript="Raw transcript line one"
        speakerStakeholderMap={new Map()}
      />,
    );
    expect(getByText(/Raw transcript line one/)).not.toBeNull();
  });

  it("renders the no-cues empty state when transcript has zero cues", () => {
    const transcript = makeTranscript({
      cues: [],
      cueCount: 0,
      hasCues: false,
    });
    const { getByText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map()}
      />,
    );
    expect(getByText(/no cues yet/i)).not.toBeNull();
  });

  it("renders the toolbar and at least one cue button when cues are present", () => {
    const transcript = makeTranscript();
    const map = new Map<string, Stakeholder>([["Ben", ben]]);
    const { getByLabelText, getByText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={map}
      />,
    );
    expect(getByLabelText("Search transcript")).not.toBeNull();
    expect(getByText("Hello.")).not.toBeNull();
  });

  it("propagates onSearchChange when the user types into the search field", () => {
    const onSearchChange = vi.fn();
    const transcript = makeTranscript();
    const { getByLabelText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map([["Ben", ben]])}
        onSearchChange={onSearchChange}
      />,
    );
    fireEvent.change(getByLabelText("Search transcript"), {
      target: { value: "hello" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("hello");
  });

  it("forwards onSeek with the cue's startMs when a cue is clicked", () => {
    const onSeek = vi.fn();
    const transcript = makeTranscript({
      cues: [
        { startMs: 0, endMs: 1000, speaker: "Ben", text: "Hello." },
        { startMs: 5000, endMs: 6000, speaker: "Ben", text: "Second cue." },
      ],
    });
    const { getByText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map([["Ben", ben]])}
        onSeek={onSeek}
      />,
    );
    fireEvent.click(getByText("Second cue."));
    expect(onSeek).toHaveBeenCalledWith(5000);
  });

  it("match counter is empty when no query is entered", () => {
    const transcript = makeTranscript();
    const { getAllByRole } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map([["Ben", ben]])}
      />,
    );
    // Wave 3b adds a second `role="status"` LiveRegion for speaker change
    // announcements; the toolbar's match counter is the one with empty text
    // when no search query has been entered.
    const matchCounter = getAllByRole("status").find(
      (el) => el.textContent === "",
    );
    expect(matchCounter).toBeTruthy();
  });

  it("derives an active cue index from useAudioPlayerState and styles the active cue", async () => {
    const { AudioPlayerProvider, useAudioPlayerRegistry } = await import(
      "../../AudioPlayerContext"
    );
    const transcript = makeTranscript({
      cues: [
        { startMs: 0, endMs: 1000, speaker: "Ben", text: "First." },
        { startMs: 5000, endMs: 6000, speaker: "Ben", text: "Second." },
        { startMs: 9000, endMs: 10000, speaker: "Ben", text: "Third." },
      ],
    });

    function TestHarness() {
      const registry = useAudioPlayerRegistry();
      // The provider only exposes registerAudioElement; in tests we drive
      // playback state by directly mutating the registered <audio> element
      // and dispatching events. Easier: register a fake element whose
      // currentTime we can set, then dispatch `seeked` to force a flush.
      if (registry) {
        const fake = {
          currentTime: 5,
          duration: 10,
          paused: true,
          ended: false,
          play: () => Promise.resolve(),
          pause: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
        } as unknown as HTMLAudioElement;
        registry.registerAudioElement(fake);
      }
      return (
        <TranscriptPanel
          transcript={transcript}
          speakerStakeholderMap={new Map([["Ben", ben]])}
        />
      );
    }

    const { container } = render(
      <AudioPlayerProvider>
        <TestHarness />
      </AudioPlayerProvider>,
    );

    // Cue at 5000ms should be the active one when currentMs = 5000.
    const buttons = container.querySelectorAll("[data-cue-index]");
    expect(buttons.length).toBe(3);
    const active = container.querySelector('[aria-current="true"]');
    expect(active?.textContent).toContain("Second.");
  });

  it("renders a Follow audio toggle that defaults to checked and toggles off", () => {
    const transcript = makeTranscript({
      cues: [
        { startMs: 0, endMs: 1000, speaker: "Ben", text: "Alpha." },
        { startMs: 5000, endMs: 6000, speaker: "Ben", text: "Bravo." },
      ],
    });

    const { getByLabelText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map([["Ben", ben]])}
      />,
    );

    const toggle = getByLabelText("Follow audio") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
  });

  // The 5s follow-audio pause timer is exercised via wheel/touchstart on
  // the scroll container — happy-dom's event timing makes asserting on
  // setTimeout-driven state unreliable, so this is intentionally
  // verified through manual smoke testing rather than a unit assertion.

  it("typing in search reveals the match counter", () => {
    const transcript = makeTranscript({
      cues: [
        { startMs: 0, endMs: 1000, speaker: "Ben", text: "Alpha bravo." },
        { startMs: 5000, endMs: 6000, speaker: "Ben", text: "Charlie alpha." },
      ],
    });
    const { getAllByRole, getByLabelText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map([["Ben", ben]])}
      />,
    );
    fireEvent.change(getByLabelText("Search transcript"), {
      target: { value: "alpha" },
    });
    const counter = getAllByRole("status").find(
      (el) => el.textContent === "2 matches",
    );
    expect(counter).toBeTruthy();
  });

  it("Enter advances current match in the counter", () => {
    const transcript = makeTranscript({
      cues: [
        { startMs: 0, endMs: 1000, speaker: "Ben", text: "Alpha bravo." },
        { startMs: 5000, endMs: 6000, speaker: "Ben", text: "Charlie alpha." },
        { startMs: 9000, endMs: 10000, speaker: "Ben", text: "Delta alpha." },
      ],
    });
    const { getAllByRole, getByLabelText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map([["Ben", ben]])}
      />,
    );
    const input = getByLabelText("Search transcript");
    fireEvent.change(input, { target: { value: "alpha" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(
      getAllByRole("status").find((el) => el.textContent === "1 of 3"),
    ).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(
      getAllByRole("status").find((el) => el.textContent === "2 of 3"),
    ).toBeTruthy();
  });

  it("Esc clears the search query", () => {
    const transcript = makeTranscript({
      cues: [{ startMs: 0, endMs: 1000, speaker: "Ben", text: "Hello world." }],
    });
    const { getByLabelText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map([["Ben", ben]])}
      />,
    );
    const input = getByLabelText("Search transcript") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input.value).toBe("hello");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });

  it("clicking a <mark> fires onSeek with the cue's startMs", () => {
    const onSeek = vi.fn();
    const transcript = makeTranscript({
      cues: [
        { startMs: 0, endMs: 1000, speaker: "Ben", text: "Hello world." },
        { startMs: 5000, endMs: 6000, speaker: "Ben", text: "World peace." },
      ],
    });
    const { container, getByLabelText } = render(
      <TranscriptPanel
        transcript={transcript}
        speakerStakeholderMap={new Map([["Ben", ben]])}
        onSeek={onSeek}
      />,
    );
    fireEvent.change(getByLabelText("Search transcript"), {
      target: { value: "world" },
    });
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(2);
    // Click the second <mark> (in the second cue, startMs 5000).
    fireEvent.click(marks[1]);
    expect(onSeek).toHaveBeenCalledWith(5000);
  });
});
