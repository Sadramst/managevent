import { defineConfig, devices } from "@playwright/test";

/**
 * The public site against the mock API (`tests/mock-api.mjs`, port 4101).
 *
 * Browser channel override. Set `PW_CHANNEL=chrome` (or `msedge`) to run against an installed
 * browser instead of Playwright's bundled Chromium, for example on a machine where
 * `playwright install` has not been run.
 */
const channel = process.env.PW_CHANNEL?.trim();
const browser = channel ? { channel } : {};

export default defineConfig({
  testDir: "./tests",
  // The staff console spec needs the real API and database: see playwright.real.config.ts.
  testIgnore: "**/admin.spec.ts",
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...browser } },
    { name: "mobile", use: { ...devices["Pixel 7"], ...browser } },
  ],
  webServer: [
    {
      command: "node tests/mock-api.mjs",
      url: "http://127.0.0.1:4101",
      reuseExistingServer: false,
    },
    {
      command: "pnpm start",
      url: "http://localhost:3100",
      env: { API_URL: "http://127.0.0.1:4101", NEXT_TELEMETRY_DISABLED: "1" },
      reuseExistingServer: false,
    },
  ],
});
