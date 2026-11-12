import { defineConfig, devices } from "@playwright/test";
import {
  REAL_API_URL,
  REAL_WEB_ORIGIN,
  REAL_WEB_PORT,
  USES_OWN_API,
} from "./tests/support/real-api";

/**
 * End-to-end tests against the REAL API and the real local PostgreSQL (nothing mocked):
 * the staff console in `tests/admin.spec.ts`.
 *
 *   pnpm db:local:detach                                   # once, from the repo root
 *   pnpm --filter @managevent/marketing build
 *   PW_CHANNEL=chrome pnpm --filter @managevent/marketing test:e2e:real
 *
 * The default `playwright.config.ts` keeps using the mock API (port 4101, site on 3100) and
 * skips that spec. This run uses its own ports (API 4110, site 3110), so the two never collide
 * and an API a developer has running on port 4000 is left alone.
 *
 * The API is `apps/api` itself, started here with the root `.env` and this run's web origin in
 * its trusted origins. With `REAL_API_URL` set, a running API is used instead; the global setup
 * stops with a clear message if that one does not trust the origin.
 */
const channel = process.env.PW_CHANNEL?.trim();
const browser = channel ? { channel } : {};

export default defineConfig({
  testDir: "./tests",
  testMatch: "admin.spec.ts",
  fullyParallel: false,
  // One worker: the tests share one staff account and the API's per-address sign-in limits.
  workers: 1,
  globalSetup: "./tests/support/real-api.setup.ts",
  globalTeardown: "./tests/support/real-api.teardown.ts",
  use: { baseURL: REAL_WEB_ORIGIN, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...browser } },
    { name: "mobile", use: { ...devices["Pixel 7"], ...browser } },
  ],
  webServer: [
    {
      // `with-env` loads the root .env (database, auth secret); values set here win over it.
      command: "node ../../scripts/with-env.mjs pnpm --filter @managevent/api start",
      url: `${REAL_API_URL}/health`,
      env: {
        PORT: new URL(REAL_API_URL).port || "80",
        BETTER_AUTH_URL: REAL_API_URL,
        AUTH_TRUSTED_ORIGINS: REAL_WEB_ORIGIN,
      },
      reuseExistingServer: !USES_OWN_API,
      timeout: 120_000,
    },
    {
      command: `pnpm exec next start --port ${REAL_WEB_PORT}`,
      url: `${REAL_WEB_ORIGIN}/robots.txt`,
      env: { API_URL: REAL_API_URL, NEXT_TELEMETRY_DISABLED: "1" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
