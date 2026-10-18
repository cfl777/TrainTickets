import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration. Goals:
 *
 * - Test the production build, served by vite preview, so what is tested
 *   is what ships.
 * - Two projects on one browser: desktop Chrome and a 375 px mobile
 *   viewport, matching the narrowest width the layout is designed for.
 * - Deterministic: the mock API never fails randomly, so no retries.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
