import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { KeyboardShortcutsHelp } from "../KeyboardShortcutsHelp";

afterEach(() => {
  cleanup();
});

function Wrapper({
  initialOpen = false,
  onOpenChange,
}: {
  initialOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <KeyboardShortcutsHelp
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    />
  );
}

describe("KeyboardShortcutsHelp", () => {
  it("renders the dialog content when open", () => {
    const { getByRole } = render(<Wrapper initialOpen />);
    const dialog = getByRole("dialog", { hidden: true });
    expect(dialog.textContent).toContain("Keyboard shortcuts");
    expect(dialog.textContent).toContain("Play or pause audio");
  });

  it("does not render dialog content when closed", () => {
    const { queryByRole } = render(<Wrapper initialOpen={false} />);
    expect(queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("calls onOpenChange(false) when Escape is pressed", () => {
    const onOpenChange = vi.fn();
    const { getByRole } = render(
      <Wrapper initialOpen onOpenChange={onOpenChange} />,
    );
    const dialog = getByRole("dialog", { hidden: true });
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
