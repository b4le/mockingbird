import { describe, expect, it } from "vitest";
import { formatTime } from "../format-time";

describe("formatTime", () => {
  it("formats sub-minute durations as m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5_000)).toBe("0:05");
    expect(formatTime(59_999)).toBe("0:59");
  });

  it("formats minute-scale durations as m:ss", () => {
    expect(formatTime(60_000)).toBe("1:00");
    expect(formatTime(12 * 60_000 + 34_000)).toBe("12:34");
  });

  it("formats hour-scale durations as h:mm:ss with zero-padded minutes", () => {
    expect(formatTime(60 * 60_000)).toBe("1:00:00");
    expect(formatTime(60 * 60_000 + 2 * 60_000 + 45_000)).toBe("1:02:45");
  });

  it("clamps negative or non-finite values to zero", () => {
    expect(formatTime(-1)).toBe("0:00");
    expect(formatTime(Number.NaN)).toBe("0:00");
  });
});
