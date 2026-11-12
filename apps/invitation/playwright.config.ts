import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3005", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm exec next start -p 3005",
    url: "http://127.0.0.1:3005",
    env: { NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false,
    timeout: 60000,
  },
});
