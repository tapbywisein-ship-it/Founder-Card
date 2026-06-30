import { defineConfig, devices } from "@playwright/test";

// Standard Playwright config for the TapByWisein frontend e2e tests.
// Tests live under `tests/` (or `e2e/`); the dev server runs on :8080.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:8080",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
