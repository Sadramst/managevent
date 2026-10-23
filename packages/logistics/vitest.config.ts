import { defineConfig } from "vitest/config";
import { createVitestConfig } from "@managevent/config/vitest";

export default defineConfig(
  createVitestConfig({
    coverageThresholds: {
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
    },
  }),
);
