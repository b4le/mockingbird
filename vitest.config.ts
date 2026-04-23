import { defineConfig } from "vitest/config";
import path from "path";

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  test: {
    projects: [
      {
        // Component tests: rendered in a DOM environment
        test: {
          name: "components",
          include: ["src/components/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
          environment: "happy-dom",
        },
        resolve: { alias },
      },
      {
        // Library / data tests: pure Node — no DOM overhead
        test: {
          name: "lib",
          include: ["src/lib/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
          environment: "node",
        },
        resolve: { alias },
      },
    ],
  },
});
