import { describe, it, expect } from "vitest";
import { getStakeholderInitials } from "../stakeholders";

describe("getStakeholderInitials", () => {
  it("derives first+last initials for multi-word names", () => {
    expect(getStakeholderInitials("Johan Sellgren")).toBe("JS");
    expect(getStakeholderInitials("Helena Borg Jodelsohn")).toBe("HJ");
  });

  it("derives the first two letters for single-word names", () => {
    expect(getStakeholderInitials("Babar")).toBe("BA");
    expect(getStakeholderInitials("Ebba")).toBe("EB");
  });

  it("returns the redaction sentinel for fully bracketed names", () => {
    expect(getStakeholderInitials("[Privileged]")).toBe("--");
    expect(getStakeholderInitials("[Redacted]")).toBe("--");
  });

  it("strips punctuation, treating it as a word boundary", () => {
    // Apostrophe is stripped to whitespace, so "O'Brien" becomes two words.
    expect(getStakeholderInitials("O'Brien")).toBe("OB");
    // Hyphen likewise separates words.
    expect(getStakeholderInitials("Jose-Manuel")).toBe("JM");
  });

  it("falls back to the sentinel when no letters remain", () => {
    expect(getStakeholderInitials("123")).toBe("--");
    expect(getStakeholderInitials("   ")).toBe("--");
  });
});
