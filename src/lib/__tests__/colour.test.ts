import { describe, expect, it } from "vitest";
import { hashStringToHue } from "../colour";

describe("hashStringToHue", () => {
  it("is deterministic: same input always yields same output", () => {
    const labels = ["Ben", "Johan", "Speaker 1", "Helly R."];
    for (const label of labels) {
      const a = hashStringToHue(label);
      const b = hashStringToHue(label);
      expect(a).toBe(b);
    }
  });

  it("always returns a value in [0, 360)", () => {
    const inputs = [
      "",
      "a",
      "Ben",
      "Speaker 12",
      "a really long speaker label with punctuation, numbers 123, and unicode é",
      "\u{1F600}", // emoji (surrogate pair)
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    ];
    for (const input of inputs) {
      const hue = hashStringToHue(input);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
      expect(Number.isInteger(hue)).toBe(true);
    }
  });

  it("returns 0 for the empty string", () => {
    // Empty input: the for-loop body never executes, so h stays 0.
    // Documenting this as a property test so future refactors don't silently
    // drift (e.g. seeding h with a non-zero constant).
    expect(hashStringToHue("")).toBe(0);
  });

  it("produces stable hue snapshots for known inputs", () => {
    // Snapshot known-good values so any future drift in the hash algorithm
    // (which would also shift every unresolved-speaker colour in the UI) is
    // caught by the test suite rather than discovered by a user.
    const cases: Array<[string, number]> = [
      ["Ben", hashStringToHue("Ben")],
      ["Johan", hashStringToHue("Johan")],
      ["Speaker 1", hashStringToHue("Speaker 1")],
    ];

    // Compute once and assert against the captured values. The assertions
    // below are the actual hash outputs at the time of writing.
    expect(hashStringToHue("Ben")).toBe(67);
    expect(hashStringToHue("Johan")).toBe(256);
    expect(hashStringToHue("Speaker 1")).toBe(120);

    // Sanity check that the array above mirrors the explicit assertions.
    for (const [label, hue] of cases) {
      expect(hashStringToHue(label)).toBe(hue);
    }
  });

  it("distinguishes typical speaker labels (collision sanity check)", () => {
    // Not a strict guarantee, but if "Ben" and "Johan" collide we have a
    // problem — they're the canonical demo speakers.
    expect(hashStringToHue("Ben")).not.toBe(hashStringToHue("Johan"));
  });
});
