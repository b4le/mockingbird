import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TranscriptEmpty } from "../TranscriptEmpty";

afterEach(() => {
  cleanup();
});

describe("TranscriptEmpty", () => {
  describe("kind='none'", () => {
    it("renders the dashed no-transcript box", () => {
      const { getByText } = render(<TranscriptEmpty kind="none" />);
      expect(
        getByText(/No transcript available for this conversation\./i),
      ).not.toBeNull();
    });
  });

  describe("kind='no-cues'", () => {
    it("renders the terminal copy explaining cue-level is unavailable", () => {
      const { getByText } = render(<TranscriptEmpty kind="no-cues" />);
      expect(
        getByText(
          /Cue-level navigation isn't available for this transcript — only flat text\. Search and timestamp seek are disabled\./i,
        ),
      ).not.toBeNull();
    });

    it("does not use the old transient/loading copy", () => {
      const { queryByText } = render(<TranscriptEmpty kind="no-cues" />);
      expect(queryByText(/Recording transcribed but no cues yet/i)).toBeNull();
    });

    it("renders the dashed 'No cues to display.' box when hasFlat is false", () => {
      const { getByText } = render(<TranscriptEmpty kind="no-cues" />);
      expect(getByText(/No cues to display\./i)).not.toBeNull();
    });

    it("treats whitespace-only flatTranscript as empty (hasFlat false)", () => {
      const { getByText } = render(
        <TranscriptEmpty kind="no-cues" flatTranscript={"   \n  "} />,
      );
      expect(getByText(/No cues to display\./i)).not.toBeNull();
    });

    it("renders a single <p> when flatTranscript has no paragraph breaks", () => {
      const { container } = render(
        <TranscriptEmpty
          kind="no-cues"
          flatTranscript="Just one paragraph of flat text."
        />,
      );
      // The flat-fallback box contains its own paragraph <p> elements.
      const flatBox = container.querySelector(".bg-muted\\/30");
      expect(flatBox).not.toBeNull();
      const paras = flatBox!.querySelectorAll("p");
      expect(paras.length).toBe(1);
      expect(paras[0]!.textContent).toBe("Just one paragraph of flat text.");
    });

    it("renders multiple <p> elements when flatTranscript has blank-line paragraph breaks", () => {
      const flat = "First paragraph here.\n\nSecond paragraph here.\n\nThird.";
      const { container } = render(
        <TranscriptEmpty kind="no-cues" flatTranscript={flat} />,
      );
      const flatBox = container.querySelector(".bg-muted\\/30");
      expect(flatBox).not.toBeNull();
      const paras = flatBox!.querySelectorAll("p");
      expect(paras.length).toBe(3);
      expect(paras[0]!.textContent).toBe("First paragraph here.");
      expect(paras[1]!.textContent).toBe("Second paragraph here.");
      expect(paras[2]!.textContent).toBe("Third.");
    });

    it("preserves single-newlines inside a paragraph via whitespace-pre-wrap", () => {
      const flat = "Line one\nLine two\n\nNew paragraph";
      const { container } = render(
        <TranscriptEmpty kind="no-cues" flatTranscript={flat} />,
      );
      const flatBox = container.querySelector(".bg-muted\\/30");
      const paras = flatBox!.querySelectorAll("p");
      expect(paras.length).toBe(2);
      expect(paras[0]!.textContent).toBe("Line one\nLine two");
      expect(paras[0]!.className).toContain("whitespace-pre-wrap");
    });

    it("renders the flat-text box at text-sm (matches cued-transcript typography)", () => {
      const { container } = render(
        <TranscriptEmpty kind="no-cues" flatTranscript="Body text here." />,
      );
      const flatBox = container.querySelector(".bg-muted\\/30");
      expect(flatBox).not.toBeNull();
      expect(flatBox!.className).toContain("text-sm");
      expect(flatBox!.className).not.toContain("text-xs");
    });

    it("does not use a <pre> element for the flat fallback (drops monospace)", () => {
      const { container } = render(
        <TranscriptEmpty kind="no-cues" flatTranscript="Body text." />,
      );
      expect(container.querySelector("pre")).toBeNull();
    });
  });
});
