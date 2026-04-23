import { describe, it, expect } from "vitest";
import { resolveSourceLabel } from "@/lib/stakeholder-activity";
import {
  CONVERSATION_FALLBACK_ICON,
  CONVERSATION_FALLBACK_LABEL,
} from "@/lib/constants";
import { makeComm, makeConv } from "./fixtures";

describe("resolveSourceLabel", () => {
  describe("null-source cases → null (no provenance chip)", () => {
    it.each([
      {
        name: "both inputs null (the canonical 'no source' case)",
        id: null as string | null,
        type: null as "conversation" | "communication" | null,
      },
      {
        // Per the schema's sourceEntityBothOrNeither refine this state is
        // unreachable at runtime, but resolveSourceLabel defends against
        // it anyway — covering both OR branches of the guard.
        name: "id null, type non-null (defensive)",
        id: null,
        type: "communication" as const,
      },
      {
        name: "id non-null, type null (defensive)",
        id: "anything",
        type: null,
      },
    ])("$name", ({ id, type }) => {
      expect(resolveSourceLabel(id, type, [], [])).toBeNull();
    });
  });

  describe("matched communication sources", () => {
    it.each([
      { channel: "email" as const, icon: "✉️", ariaLabel: "Email" },
      { channel: "slack" as const, icon: "📣", ariaLabel: "Slack" },
      { channel: "whatsapp" as const, icon: "📲", ariaLabel: "WhatsApp" },
      { channel: "sms" as const, icon: "📱", ariaLabel: "SMS" },
      { channel: "other" as const, icon: "📌", ariaLabel: "Other" },
    ])(
      "returns channel-specific icon + ariaLabel for channel=$channel",
      ({ channel, icon, ariaLabel }) => {
        // Fresh fixture per row — the factory is called with explicit args
        // so rows never share a Communication instance.
        const comm = makeComm("comm-1", { channel, subject: "Kickoff thread" });
        const label = resolveSourceLabel(
          "comm-1",
          "communication",
          [],
          [comm],
        );
        expect(label).toEqual({
          kind: "communication",
          id: "comm-1",
          title: "Kickoff thread",
          icon,
          ariaLabel,
        });
      },
    );
  });

  describe("matched conversation sources", () => {
    it("uses medium-specific icon when medium is set (video-call)", () => {
      const conv = makeConv("conv-1", {
        medium: "video-call",
        title: "Design review",
      });
      expect(
        resolveSourceLabel("conv-1", "conversation", [conv], []),
      ).toEqual({
        kind: "conversation",
        id: "conv-1",
        title: "Design review",
        icon: "🎥",
        ariaLabel: "Video call",
      });
    });

    it.each([
      {
        medium: "in-person" as const,
        icon: "👥",
        ariaLabel: "In-person meeting",
      },
      { medium: "phone-call" as const, icon: "📞", ariaLabel: "Phone call" },
    ])(
      "medium=$medium → icon/ariaLabel from CONVERSATION_MEDIUM_* maps",
      ({ medium, icon, ariaLabel }) => {
        const conv = makeConv("conv-1", { medium });
        const label = resolveSourceLabel(
          "conv-1",
          "conversation",
          [conv],
          [],
        );
        expect(label).toMatchObject({ icon, ariaLabel });
      },
    );

    it("falls back to CONVERSATION_FALLBACK_ICON/LABEL when medium is undefined", () => {
      // Asserting equality against the imported constants (rather than the
      // literal glyph) means a rebrand of the fallback icon in constants.ts
      // does not churn this test.
      const conv = makeConv("conv-1", { title: "Corridor chat" }); // no medium
      expect(
        resolveSourceLabel("conv-1", "conversation", [conv], []),
      ).toEqual({
        kind: "conversation",
        id: "conv-1",
        title: "Corridor chat",
        icon: CONVERSATION_FALLBACK_ICON,
        ariaLabel: CONVERSATION_FALLBACK_LABEL,
      });
    });
  });

  describe("orphan-pointer cases (schema-drift defence) → null", () => {
    it("returns null when communication id has no matching entity", () => {
      const present = makeComm("comm-1");
      const result = resolveSourceLabel(
        "comm-missing",
        "communication",
        [],
        [present],
      );
      expect(result).toBeNull();
    });

    it("returns null when conversation id has no matching entity", () => {
      const present = makeConv("conv-1");
      const result = resolveSourceLabel(
        "conv-missing",
        "conversation",
        [present],
        [],
      );
      expect(result).toBeNull();
    });

    it("returns null when both collections are empty (cold-start project)", () => {
      expect(
        resolveSourceLabel("any-id", "communication", [], []),
      ).toBeNull();
      expect(
        resolveSourceLabel("any-id", "conversation", [], []),
      ).toBeNull();
    });
  });

  describe("type discrimination", () => {
    it("ignores conversations collection when type='communication'", () => {
      // Defensive: an id collision (conv-1 shares its id with a comm-1 twin)
      // must NOT accidentally resolve via the wrong collection.
      const matchingConv = makeConv("same-id", { title: "Conv title" });
      const label = resolveSourceLabel(
        "same-id",
        "communication",
        [matchingConv],
        [], // no matching comm
      );
      expect(label).toBeNull();
    });

    it("ignores communications collection when type='conversation'", () => {
      const matchingComm = makeComm("same-id", {
        channel: "email",
        subject: "Comm subject",
      });
      const label = resolveSourceLabel(
        "same-id",
        "conversation",
        [],
        [matchingComm],
      );
      expect(label).toBeNull();
    });
  });
});
