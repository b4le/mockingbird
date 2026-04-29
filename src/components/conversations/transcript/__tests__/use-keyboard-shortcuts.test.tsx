import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import {
  useKeyboardShortcuts,
  type KeyboardShortcutHandlers,
} from "../use-keyboard-shortcuts";

afterEach(() => {
  cleanup();
});

interface HarnessProps extends KeyboardShortcutHandlers {
  withInput?: boolean;
}

function Harness(props: HarnessProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useKeyboardShortcuts({ panelRef: ref, ...props });
  return (
    <div ref={ref} data-testid="panel" tabIndex={-1}>
      <input type="search" data-testid="search" />
      {props.withInput ? <input type="text" data-testid="text-input" /> : null}
    </div>
  );
}

describe("useKeyboardShortcuts", () => {
  it("invokes onPlayPause when Space is pressed outside an input", () => {
    const onPlayPause = vi.fn();
    const { getByTestId } = render(<Harness onPlayPause={onPlayPause} />);
    fireEvent.keyDown(getByTestId("panel"), { key: " ", code: "Space" });
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onPlayPause when Space is pressed inside a text input", () => {
    const onPlayPause = vi.fn();
    const { getByTestId } = render(
      <Harness onPlayPause={onPlayPause} withInput />,
    );
    fireEvent.keyDown(getByTestId("text-input"), { key: " ", code: "Space" });
    expect(onPlayPause).not.toHaveBeenCalled();
  });

  it("invokes onNextCue on j and onPrevCue on k", () => {
    const onNextCue = vi.fn();
    const onPrevCue = vi.fn();
    const { getByTestId } = render(
      <Harness onNextCue={onNextCue} onPrevCue={onPrevCue} />,
    );
    const panel = getByTestId("panel");
    fireEvent.keyDown(panel, { key: "j" });
    expect(onNextCue).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(panel, { key: "k" });
    expect(onPrevCue).toHaveBeenCalledTimes(1);
  });

  it("invokes onNextTurn on Shift+J and onPrevTurn on Shift+K", () => {
    const onNextTurn = vi.fn();
    const onPrevTurn = vi.fn();
    const { getByTestId } = render(
      <Harness onNextTurn={onNextTurn} onPrevTurn={onPrevTurn} />,
    );
    const panel = getByTestId("panel");
    fireEvent.keyDown(panel, { key: "J", shiftKey: true });
    expect(onNextTurn).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(panel, { key: "K", shiftKey: true });
    expect(onPrevTurn).toHaveBeenCalledTimes(1);
  });

  it("invokes onFocusSearch on F and on Cmd/Ctrl+F", () => {
    const onFocusSearch = vi.fn();
    const { getByTestId } = render(
      <Harness onFocusSearch={onFocusSearch} />,
    );
    const panel = getByTestId("panel");
    fireEvent.keyDown(panel, { key: "f" });
    fireEvent.keyDown(panel, { key: "f", metaKey: true });
    fireEvent.keyDown(panel, { key: "f", ctrlKey: true });
    expect(onFocusSearch).toHaveBeenCalledTimes(3);
  });

  it("scopes Cmd/Ctrl+F to the panel — keys outside the panel are not handled by this listener", () => {
    const onFocusSearch = vi.fn();
    const { getByTestId } = render(
      <Harness onFocusSearch={onFocusSearch} />,
    );
    // Dispatching the keydown on a node outside the panel must not trigger
    // the panel-scoped listener.
    fireEvent.keyDown(document.body, { key: "f", metaKey: true });
    expect(onFocusSearch).not.toHaveBeenCalled();
    // But within the panel, it does fire.
    fireEvent.keyDown(getByTestId("panel"), { key: "f", metaKey: true });
    expect(onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it("does not intercept Cmd+F when focus is in a sibling text input", () => {
    const onFocusSearch = vi.fn();
    const { getByTestId } = render(
      <Harness onFocusSearch={onFocusSearch} withInput />,
    );
    const textInput = getByTestId("text-input");
    const event = fireEvent.keyDown(textInput, { key: "f", metaKey: true });
    // fireEvent returns true when the event was NOT cancelled (preventDefault
    // not called). The handler must let the browser's native Find UI take over.
    expect(event).toBe(true);
    expect(onFocusSearch).not.toHaveBeenCalled();
  });

  it("intercepts Cmd+F when focus is inside the search input itself", () => {
    const onFocusSearch = vi.fn();
    const { getByTestId } = render(
      <Harness onFocusSearch={onFocusSearch} />,
    );
    const search = getByTestId("search");
    const event = fireEvent.keyDown(search, { key: "f", metaKey: true });
    // preventDefault was called → fireEvent returns false.
    expect(event).toBe(false);
    expect(onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it("invokes onClearSearch only when Esc is pressed inside the search input", () => {
    const onClearSearch = vi.fn();
    const { getByTestId } = render(
      <Harness onClearSearch={onClearSearch} />,
    );
    fireEvent.keyDown(getByTestId("panel"), { key: "Escape" });
    expect(onClearSearch).not.toHaveBeenCalled();
    fireEvent.keyDown(getByTestId("search"), { key: "Escape" });
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it("invokes onOpenHelp on ?", () => {
    const onOpenHelp = vi.fn();
    const { getByTestId } = render(<Harness onOpenHelp={onOpenHelp} />);
    fireEvent.keyDown(getByTestId("panel"), { key: "?" });
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
  });
});
