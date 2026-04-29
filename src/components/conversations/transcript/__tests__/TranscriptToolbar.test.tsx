import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { TranscriptToolbar } from "../TranscriptToolbar";

afterEach(() => {
  cleanup();
});

describe("TranscriptToolbar", () => {
  it("renders the search input visible on md+ but hidden on mobile by default", () => {
    const { getByLabelText, queryByLabelText } = render(
      <TranscriptToolbar onSearchChange={() => {}} />,
    );

    // The mobile trigger is rendered (and md:hidden via CSS).
    const trigger = queryByLabelText("Open search");
    expect(trigger).not.toBeNull();
    // It carries the md:hidden class so it disappears on md+ via CSS.
    expect(trigger?.className).toContain("md:hidden");

    // The input is in the DOM (md+ shows it via CSS); its wrapper carries
    // the responsive `hidden md:flex` classes so it stays out of view on
    // mobile until the trigger is tapped.
    const input = getByLabelText("Search transcript");
    expect(input).not.toBeNull();
    const wrapper = input.parentElement;
    expect(wrapper?.className).toContain("hidden");
    expect(wrapper?.className).toContain("md:flex");
  });

  it("expanding the mobile search trigger reveals the input and hides the trigger", () => {
    const { getByLabelText, queryByLabelText } = render(
      <TranscriptToolbar onSearchChange={() => {}} />,
    );

    fireEvent.click(getByLabelText("Open search"));

    // Trigger gone, wrapper now flex-visible.
    expect(queryByLabelText("Open search")).toBeNull();
    const input = getByLabelText("Search transcript");
    const wrapper = input.parentElement;
    expect(wrapper?.className).toContain("flex");
    expect(wrapper?.className).not.toContain("hidden");
  });

  it("collapses back to the trigger when the input blurs with an empty query", () => {
    const { getByLabelText, queryByLabelText } = render(
      <TranscriptToolbar searchQuery="" onSearchChange={() => {}} />,
    );

    fireEvent.click(getByLabelText("Open search"));
    expect(queryByLabelText("Open search")).toBeNull();

    fireEvent.blur(getByLabelText("Search transcript"));
    expect(queryByLabelText("Open search")).not.toBeNull();
  });

  it("does NOT collapse on blur when the query is non-empty", () => {
    const { getByLabelText, queryByLabelText } = render(
      <TranscriptToolbar searchQuery="hello" onSearchChange={() => {}} />,
    );

    fireEvent.click(getByLabelText("Open search"));
    fireEvent.blur(getByLabelText("Search transcript"));

    // Stays expanded because the query has content.
    expect(queryByLabelText("Open search")).toBeNull();
  });

  it("hides the help button on mobile via responsive classes", () => {
    const { getByLabelText } = render(
      <TranscriptToolbar onOpenHelp={() => {}} />,
    );
    const helpBtn = getByLabelText("Show keyboard shortcuts");
    expect(helpBtn.className).toContain("hidden");
    expect(helpBtn.className).toContain("md:inline-flex");
  });

  it("Enter triggers onNextMatch and Shift+Enter triggers onPrevMatch", () => {
    const onNextMatch = vi.fn();
    const onPrevMatch = vi.fn();
    const { getByLabelText } = render(
      <TranscriptToolbar
        onSearchChange={() => {}}
        onNextMatch={onNextMatch}
        onPrevMatch={onPrevMatch}
      />,
    );
    const input = getByLabelText("Search transcript");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onNextMatch).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onPrevMatch).toHaveBeenCalledTimes(1);
  });

  it("Escape calls onClearSearch", () => {
    const onClearSearch = vi.fn();
    const { getByLabelText } = render(
      <TranscriptToolbar
        searchQuery="abc"
        onSearchChange={() => {}}
        onClearSearch={onClearSearch}
      />,
    );
    fireEvent.keyDown(getByLabelText("Search transcript"), { key: "Escape" });
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it("forwards a parent ref to the actual input element", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<TranscriptToolbar ref={ref} onSearchChange={() => {}} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("INPUT");
    expect(ref.current?.getAttribute("aria-label")).toBe("Search transcript");
  });
});
