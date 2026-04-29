import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

import { ConversationsFilters } from "../ConversationsFilters";
import type { Conversation, Stakeholder } from "@/types";

type Medium = NonNullable<Conversation["medium"]>;

const stakeholders: Stakeholder[] = [
  {
    id: "s1",
    name: "Alex Stone",
    role: "PM",
    organisation: "Acme",
    initials: "AS",
    colour: "#112233",
  },
];

describe("ConversationsFilters", () => {
  it("invokes onMediumChange with the medium when an inactive toggle is clicked", () => {
    const onMediumChange = vi.fn<(m: Medium | null) => void>();
    const { getByRole } = render(
      <ConversationsFilters
        stakeholders={stakeholders}
        selectedMedium={null}
        selectedParticipant={null}
        onMediumChange={onMediumChange}
        onParticipantChange={() => {}}
      />,
    );
    const button = getByRole("button", { name: /video call/i });
    fireEvent.click(button);
    expect(onMediumChange).toHaveBeenCalledOnce();
    expect(onMediumChange).toHaveBeenCalledWith("video-call");
  });

  it("clears the medium filter when the active toggle is clicked again", () => {
    const onMediumChange = vi.fn<(m: Medium | null) => void>();
    const { getByRole } = render(
      <ConversationsFilters
        stakeholders={stakeholders}
        selectedMedium="video-call"
        selectedParticipant={null}
        onMediumChange={onMediumChange}
        onParticipantChange={() => {}}
      />,
    );
    const button = getByRole("button", { name: /video call/i });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(onMediumChange).toHaveBeenCalledOnce();
    expect(onMediumChange).toHaveBeenCalledWith(null);
  });
});
