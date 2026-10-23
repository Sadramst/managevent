import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
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
