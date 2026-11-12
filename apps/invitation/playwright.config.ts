import { defineConfig, devices } from "@playwright/test";

/**
 * Browser flows for invitation.managevent.com.au (`tests/e2e`). They run against the REAL stack:
 * PostgreSQL, `apps/api` and a production build of this app. Nothing is mocked.
 *
 * Start the stack first (README "Browser tests"), or set `E2E_WEB_SERVER=1` to have Playwright
 * start the API and `next start` itself (an already running server is reused).
 *
 * - `PW_CHANNEL=chrome` (or `msedge`) uses an installed browser instead of Playwright's bundled
 *   Chromium, for example on a machine where `playwright install` has not been run.
 * - `E2E_BASE_URL` is this app (default `http://localhost:3001`); `E2E_API_URL` (or `API_URL`) is
 *   the API the specs call for set-up (default `http://localhost:4000`).
 * - `API_PROXY_SECRET` must be the same value for the API, this app and the test run. Each test
 *   then counts as its own visitor for the API's rate limits (`tests/e2e/support/stack.ts`).
 *   Without it every test shares one address and a full run exceeds the sign-up limit.
 */
const channel = process.env.PW_CHANNEL?.trim();
const browser = channel ? { channel } : {};

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const apiURL = (process.env.E2E_API_URL ?? process.env.API_URL ?? "http://localhost:4000").replace(
  /\/+$/,
  "",
);
const startStack = process.env.E2E_WEB_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  // One worker: the specs share one API process, whose limits are per visitor and per host.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "en-AU",
    timezoneId: "Australia/Perth",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, ...browser },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], ...browser } },
  ],
  ...(startStack
    ? {
        webServer: [
          {
            // From the repo root, with the root `.env` loaded.
            command: "node ../../scripts/with-env.mjs pnpm --filter @managevent/api start",
            url: `${apiURL}/health`,
            env: { PORT: new URL(apiURL).port || "4000" },
            reuseExistingServer: true,
            timeout: 120_000,
          },
          {
            command: "node ../../scripts/with-env.mjs pnpm start",
            url: baseURL,
            env: { API_URL: apiURL, NEXT_TELEMETRY_DISABLED: "1" },
            reuseExistingServer: true,
            timeout: 120_000,
          },
        ],
      }
    : {}),
});
