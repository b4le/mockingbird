import { describe, expect, it } from "vitest";
import { findActiveCueIndex } from "../use-active-cue";

const cues = [
  { startMs: 0 },
  { startMs: 1000 },
  { startMs: 2500 },
  { startMs: 5000 },
  { startMs: 9000 },
];

describe("findActiveCueIndex", () => {
  it("returns null for empty cues", () => {
    expect(findActiveCueIndex([], 0)).toBeNull();
    expect(findActiveCueIndex([], 1234)).toBeNull();
  });

  it("returns null when currentMs is before the first cue", () => {
    expect(findActiveCueIndex([{ startMs: 500 }], 0)).toBeNull();
    expect(findActiveCueIndex(cues, -1)).toBeNull();
  });

  it("returns 0 on exact start of the first cue", () => {
    expect(findActiveCueIndex(cues, 0)).toBe(0);
  });

  it("returns the matching index on an exact start time", () => {
    expect(findActiveCueIndex(cues, 1000)).toBe(1);
    expect(findActiveCueIndex(cues, 2500)).toBe(2);
    expect(findActiveCueIndex(cues, 5000)).toBe(3);
    expect(findActiveCueIndex(cues, 9000)).toBe(4);
  });

  it("returns the latest cue whose startMs <= currentMs (between cues)", () => {
    expect(findActiveCueIndex(cues, 500)).toBe(0);
    expect(findActiveCueIndex(cues, 1500)).toBe(1);
    expect(findActiveCueIndex(cues, 4999)).toBe(2);
    expect(findActiveCueIndex(cues, 5001)).toBe(3);
  });

  it("returns the last index when currentMs is past the final cue", () => {
    expect(findActiveCueIndex(cues, 60000)).toBe(cues.length - 1);
  });

  it("works for a single-cue transcript", () => {
    const single = [{ startMs: 100 }];
    expect(findActiveCueIndex(single, 0)).toBeNull();
    expect(findActiveCueIndex(single, 100)).toBe(0);
    expect(findActiveCueIndex(single, 9999)).toBe(0);
  });
});
