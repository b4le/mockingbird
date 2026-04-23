import { describe, it, expect, vi } from "vitest";
import {
  createReporter,
  checkActionBackref,
  checkEvidenceBackref,
} from "@/lib/invariants";
import { makeComm, makeItem } from "./fixtures";

// ---------------------------------------------------------------------------
// Integration: both checks → one reporter → one flush
//
// The documented guarantee is narrow: *"a single `flush()` accumulates
// findings from both `checkActionBackref` and `checkEvidenceBackref` through
// one shared reporter."* Each existing `invariants.test.ts` case uses its
// own local `msgs: string[]` collector, so none of them exercise the
// shared-reporter composition. These four tests close that gap.
// ---------------------------------------------------------------------------

describe("invariants — cross-check batching through shared reporter", () => {
  it("accumulates action-drift AND evidence-drift into a single flush() emission (non-strict)", () => {
    // Drift on the action side: comm-1 exists but does not list action-1.
    // Drift on the evidence side: comm-2 exists but does not list ev-1.
    const comm1 = makeComm("comm-1"); // missing action-1
    const comm2 = makeComm("comm-2"); // missing ev-1
    const actionItem = makeItem("action-1", "comm-1", "communication");
    const evidenceItem = makeItem("ev-1", "comm-2", "communication");

    const reporter = createReporter(false);
    checkActionBackref(reporter.report, [actionItem], [comm1, comm2], []);
    checkEvidenceBackref(reporter.report, [evidenceItem], [comm1, comm2]);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    reporter.flush();

    // ONE warn call — both findings share the emission.
    expect(warnSpy).toHaveBeenCalledOnce();
    const emitted = warnSpy.mock.calls[0][0] as string;
    expect(emitted).toContain("action-1");
    expect(emitted).toContain("ev-1");
    // Same prefix convention for every line.
    expect(
      emitted.split("\n").every((l) => l.includes("[backref-drift]")),
    ).toBe(true);
    warnSpy.mockRestore();
  });

  it("accumulates across both checks and throws ONCE in strict mode with every message", () => {
    const comm1 = makeComm("comm-1");
    const comm2 = makeComm("comm-2");
    const actionItem = makeItem("action-1", "comm-1", "communication");
    const evidenceItem = makeItem("ev-1", "comm-2", "communication");

    const reporter = createReporter(true);
    checkActionBackref(reporter.report, [actionItem], [comm1, comm2], []);
    checkEvidenceBackref(reporter.report, [evidenceItem], [comm1, comm2]);

    let thrown: unknown = null;
    try {
      reporter.flush();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message).toContain("action-1");
    expect(message).toContain("ev-1");
    // Both violations land in ONE error — fix-all-at-once guarantee.
    expect(message.split("\n").length).toBeGreaterThanOrEqual(2);
  });

  it("interleaved ordering: action-check violations precede evidence-check violations in flush output", () => {
    // Ordering is load-bearing for human-readable diffs in CI logs: the
    // data.ts call order (actions first, evidence second) must be preserved
    // through the shared reporter.
    const comm = makeComm("comm-1");
    const actionItem = makeItem("action-1", "comm-1", "communication");
    const evidenceItem = makeItem("ev-1", "comm-1", "communication");

    const reporter = createReporter(false);
    checkActionBackref(reporter.report, [actionItem], [comm], []);
    checkEvidenceBackref(reporter.report, [evidenceItem], [comm]);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    reporter.flush();
    const emitted = warnSpy.mock.calls[0][0] as string;
    expect(emitted.indexOf("action-1")).toBeLessThan(emitted.indexOf("ev-1"));
    warnSpy.mockRestore();
  });

  it("no drift across both checks → flush() is a no-op (no warn, no throw)", () => {
    const comm = makeComm("comm-1", {
      actionItemIds: ["action-1"],
      evidenceIds: ["ev-1"],
    });
    const actionItem = makeItem("action-1", "comm-1", "communication");
    const evidenceItem = makeItem("ev-1", "comm-1", "communication");

    const reporter = createReporter(true); // strict, to catch any leak
    checkActionBackref(reporter.report, [actionItem], [comm], []);
    checkEvidenceBackref(reporter.report, [evidenceItem], [comm]);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => reporter.flush()).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
