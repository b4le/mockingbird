import { describe, it, expect } from "vitest";
import {
  buildTranscriptByConversationId,
  resolveAudioReference,
} from "@/lib/audio-reference";
import type { AudioReference, Conversation, Transcript } from "@/types";

const audioA: AudioReference = {
  driveId: "drive-A",
  filename: "A.m4a",
  driveFolderId: "folder-A",
  mimeType: "audio/x-m4a",
  viewUrl: "https://drive.google.com/file/d/drive-A/view",
  previewUrl: "https://drive.google.com/file/d/drive-A/preview",
  sizeBytes: 1024,
  durationSeconds: 60,
  status: "complete",
};

const audioB: AudioReference = {
  ...audioA,
  driveId: "drive-B",
  filename: "B.m4a",
  driveFolderId: "folder-B",
  viewUrl: "https://drive.google.com/file/d/drive-B/view",
  previewUrl: "https://drive.google.com/file/d/drive-B/preview",
};

function makeConversation(audioReference?: AudioReference): Conversation {
  return {
    id: "c1",
    date: "2026-04-01",
    title: "Kickoff",
    participantIds: [],
    summary: "",
    keyPoints: [],
    decisions: [],
    actionItemIds: [],
    audioReference,
  };
}

function makeTranscript(audioReference?: AudioReference): Transcript {
  return {
    id: "t1",
    date: "2026-04-01",
    category: "internal",
    conversationId: "c1",
    participants: [],
    durationSeconds: null,
    cueCount: 0,
    hasCues: false,
    cues: [],
    sourceFile: "t1.json",
    audioReference,
  };
}

describe("resolveAudioReference", () => {
  it("returns the Transcript's audioReference when both are set (Transcript wins)", () => {
    const conversation = makeConversation(audioA);
    const transcript = makeTranscript(audioB);
    expect(resolveAudioReference(conversation, transcript)).toBe(audioB);
  });

  it("falls back to the Conversation's audioReference when the Transcript has none", () => {
    const conversation = makeConversation(audioA);
    const transcript = makeTranscript(undefined);
    expect(resolveAudioReference(conversation, transcript)).toBe(audioA);
  });

  it("returns the Conversation's audioReference when no Transcript exists", () => {
    const conversation = makeConversation(audioA);
    expect(resolveAudioReference(conversation, null)).toBe(audioA);
  });

  it("returns undefined when neither has an audioReference", () => {
    const conversation = makeConversation(undefined);
    const transcript = makeTranscript(undefined);
    expect(resolveAudioReference(conversation, transcript)).toBeUndefined();
    expect(resolveAudioReference(conversation, null)).toBeUndefined();
  });

  it("treats `undefined` and `null` transcript identically (Map.get convenience)", () => {
    const conversation = makeConversation(audioA);
    expect(resolveAudioReference(conversation, undefined)).toBe(audioA);
    expect(resolveAudioReference(conversation, null)).toBe(audioA);
  });
});

describe("buildTranscriptByConversationId", () => {
  it("indexes transcripts by conversationId", () => {
    const t1: Transcript = { ...makeTranscript(undefined), id: "t1", conversationId: "c1" };
    const t2: Transcript = { ...makeTranscript(undefined), id: "t2", conversationId: "c2" };
    const map = buildTranscriptByConversationId([t1, t2]);
    expect(map.get("c1")).toBe(t1);
    expect(map.get("c2")).toBe(t2);
    expect(map.size).toBe(2);
  });

  it("skips transcripts whose conversationId is null", () => {
    const orphan: Transcript = { ...makeTranscript(undefined), id: "orphan", conversationId: null };
    const map = buildTranscriptByConversationId([orphan]);
    expect(map.size).toBe(0);
  });
});
