import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vite and Vitest share this file. Goals:
 *
 * - One config for build, dev server and tests, so they cannot drift.
 * - jsdom for component tests; vitest-axe does not support happy-dom.
 * - Only src/**\/*.test.* are unit tests; Playwright owns e2e/ later.
 * - 100 % coverage only set on the pure layers (model, api, shared/lib).The ui layer
 *   is tested by behaviour and accessibility, not by a percentage.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src"],
      exclude: ["src/test/**", "src/**/*.test.{ts,tsx}", "src/main.tsx"],
      thresholds: {
        "src/features/*/model/**": { 100: true },
        "src/features/*/api/**": { 100: true },
        "src/shared/lib/**": { 100: true },
      },
    },
  },
});
