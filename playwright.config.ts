import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for browser tests.
 *
 * Tests run against the server at TEST_BASE_URL (default: http://localhost:3000).
 * When running via `bun run test`, the test-with-branch.ts script starts
 * a test server with a fresh database branch.
 */

const baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Don't start dev server - test-with-branch.ts handles this
  webServer: undefined,
});
