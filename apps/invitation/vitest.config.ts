import { defineConfig, mergeConfig } from "vitest/config";
import { createVitestConfig } from "@managevent/config/vitest";

export default defineConfig(
  mergeConfig(createVitestConfig(), {
    test: {
      include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    },
  }),
);
