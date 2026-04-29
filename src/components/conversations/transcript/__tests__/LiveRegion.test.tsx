import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { LiveRegion } from "../LiveRegion";

afterEach(() => {
  cleanup();
});

describe("LiveRegion", () => {
  it("renders aria-live=polite, aria-atomic=true, and visually hidden", () => {
    const { getByRole } = render(<LiveRegion message="Now speaking, Ben." />);
    const region = getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("true");
    expect(region.className).toContain("sr-only");
    expect(region.textContent).toBe("Now speaking, Ben.");
  });

  it("renders an empty body when given an empty message", () => {
    const { getByRole } = render(<LiveRegion message="" />);
    expect(getByRole("status").textContent).toBe("");
  });
});
