import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { TranscriptCue } from "../TranscriptCue";

afterEach(() => {
  cleanup();
});

describe("TranscriptCue", () => {
  it("renders as a real <button> with cue text", () => {
    const { getByRole } = render(
      <TranscriptCue index={0} text="Hello world" startMs={0} />,
    );
    const btn = getByRole("button");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.textContent).toContain("Hello world");
  });

  it("exposes start timestamp + cue text via aria-label", () => {
    // The visible timestamp is aria-hidden, so AT depends on aria-label
    // including both the timestamp and the cue text. 65000ms -> "1:05".
    const { getByRole } = render(
      <TranscriptCue index={0} text="Hello world" startMs={65000} />,
    );
    expect(getByRole("button").getAttribute("aria-label")).toBe(
      "At 1:05: Hello world",
    );
  });

  it("omits aria-pressed and aria-current when not active", () => {
    const { getByRole } = render(
      <TranscriptCue index={0} text="x" startMs={0} />,
    );
    expect(getByRole("button").getAttribute("aria-pressed")).toBeNull();
    expect(getByRole("button").getAttribute("aria-current")).toBeNull();
  });

  it("sets aria-pressed=true and aria-current=true when active", () => {
    const { getByRole } = render(
      <TranscriptCue index={3} text="x" startMs={1000} isActive />,
    );
    const btn = getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.getAttribute("aria-current")).toBe("true");
  });

  it("invokes onSeek with the cue's startMs on click", () => {
    const onSeek = vi.fn();
    const { getByRole } = render(
      <TranscriptCue index={2} text="x" startMs={4321} onSeek={onSeek} />,
    );
    fireEvent.click(getByRole("button"));
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(4321);
  });

  it("exposes data-cue-index for tests", () => {
    const { getByRole } = render(
      <TranscriptCue index={7} text="x" startMs={0} />,
    );
    expect(getByRole("button").getAttribute("data-cue-index")).toBe("7");
  });

  it("renders <mark> segments for searchRanges", () => {
    const { container } = render(
      <TranscriptCue
        index={0}
        text="foo bar baz bar"
        startMs={0}
        searchRanges={[
          [4, 7],
          [12, 15],
        ]}
      />,
    );
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(2);
    expect(marks[0].textContent).toBe("bar");
    expect(marks[1].textContent).toBe("bar");
  });

  it("uses the stronger style class on the current-match cue's marks", () => {
    const { container: nonCurrent } = render(
      <TranscriptCue
        index={0}
        text="hello world"
        startMs={0}
        searchRanges={[[0, 5]]}
        isCurrentMatch={false}
      />,
    );
    const { container: current } = render(
      <TranscriptCue
        index={1}
        text="hello world"
        startMs={0}
        searchRanges={[[0, 5]]}
        isCurrentMatch
      />,
    );
    const nonCurrentMark = nonCurrent.querySelector("mark");
    const currentMark = current.querySelector("mark");
    expect(nonCurrentMark?.className).toContain("yellow-200");
    expect(currentMark?.className).toContain("yellow-300");
  });
});
