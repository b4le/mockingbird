import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AudioReferenceIndicator } from "../AudioReferenceIndicator";

// Vitest does not run @testing-library/react's auto-cleanup unless
// `globals: true` is set; this project keeps globals off (see
// `vitest.config.ts`). Without explicit cleanup the document body
// accumulates DOM from prior renders.
afterEach(() => {
  cleanup();
});

describe("AudioReferenceIndicator", () => {
  it("renders an icon with an accessible label so screen readers announce it", () => {
    const { getByRole } = render(<AudioReferenceIndicator />);
    const icon = getByRole("img", { name: /has audio recording/i });
    expect(icon).not.toBeNull();
  });

  it("merges parent className with the default styles", () => {
    const { getByRole } = render(
      <AudioReferenceIndicator className="custom-class" />,
    );
    const icon = getByRole("img", { name: /has audio recording/i });
    // cn() preserves the default text-muted-foreground class and
    // appends the parent override.
    expect(icon.getAttribute("class")).toContain("custom-class");
    expect(icon.getAttribute("class")).toContain("text-muted-foreground");
  });
});
