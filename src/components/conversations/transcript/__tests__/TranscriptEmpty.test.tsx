import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TranscriptEmpty } from "../TranscriptEmpty";

afterEach(() => {
  cleanup();
});

describe("TranscriptEmpty", () => {
  it("renders the no-transcript message for kind='none'", () => {
    const { getByText } = render(<TranscriptEmpty kind="none" />);
    expect(
      getByText(/No transcript available for this conversation\./i),
    ).not.toBeNull();
  });

  it("renders the no-cues message for kind='no-cues'", () => {
    const { getByText } = render(<TranscriptEmpty kind="no-cues" />);
    expect(getByText(/No cues to display\./i)).not.toBeNull();
  });
});
