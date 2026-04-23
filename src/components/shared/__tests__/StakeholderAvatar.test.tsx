import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StakeholderAvatar } from "../StakeholderAvatar";
import type { Stakeholder } from "@/types";

const stakeholder: Stakeholder = {
  id: "s1",
  name: "Ada Lovelace",
  role: "Engineer",
  organisation: "ACME",
  initials: "AL",
  colour: "#4f46e5",
};

describe("StakeholderAvatar — nested-button hydration invariant", () => {
  it("renders a <span> trigger when no onClick is provided", () => {
    const { container } = render(<StakeholderAvatar stakeholder={stakeholder} />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders a <button> trigger when onClick is provided", () => {
    const { container } = render(
      <StakeholderAvatar stakeholder={stakeholder} onClick={() => {}} />,
    );
    expect(container.querySelector("button")).not.toBeNull();
  });

  it("produces no nested buttons when wrapped in a caller <button> without onClick", () => {
    const { container } = render(
      <button>
        <StakeholderAvatar stakeholder={stakeholder} />
      </button>,
    );
    expect(container.querySelectorAll("button button")).toHaveLength(0);
  });
});
