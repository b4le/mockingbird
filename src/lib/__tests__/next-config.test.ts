import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

// Static export (`output: "export"`) is load-bearing for the security analysis
// in `ErrorDisplay.tsx` and for the GitHub Pages deploy pipeline. Flipping it
// to SSR/ISR would reactivate the server-component disclosure risk that the
// NODE_ENV gate defends against. This test fails the build if the option is
// removed or changed — see PR #29 follow-up Item 3.
describe("next.config — static export invariant", () => {
  it("declares output: \"export\"", () => {
    expect(nextConfig.output).toBe("export");
  });
});
