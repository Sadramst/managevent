import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { createVitestConfig } from "@managevent/config/vitest";

export default defineConfig(
  mergeConfig(
    createVitestConfig({
      // Unit tests sit next to the code they cover. Browser flows live in `tests/e2e` (Playwright).
      include: ["lib/**/*.test.ts", "components/**/*.test.{ts,tsx}", "app/**/*.test.ts"],
    }),
    {
      resolve: {
        alias: {
          "@": fileURLToPath(new URL(".", import.meta.url)),
          // `server-only` throws outside a React Server Components build; tests load a no-op.
          "server-only": fileURLToPath(new URL("./lib/test/server-only-stub.ts", import.meta.url)),
        },
      },
    },
  ),
);
