import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

// Static export (`output: "export"`) is load-bearing for the security analysis
// behind the NODE_ENV gate in `src/components/shared/ErrorDisplay.tsx` and for
// the GitHub Pages deploy pipeline. Flipping to SSR/ISR would reactivate the
// server-component disclosure risk that the gate defends against — at which
// point the gate is the *only* remaining line of defense. This test fails the
// build if the option is removed or changed, so the two protections stay
// coupled.
describe("next.config — static export invariant", () => {
  it("declares output: \"export\"", () => {
    expect(nextConfig.output).toBe("export");
  });
});
