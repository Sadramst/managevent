import { defineConfig } from "vitest/config";
import { createVitestConfig } from "@managevent/config/vitest";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/managevent";
process.env.DIRECT_URL ??= "postgresql://postgres:postgres@localhost:5432/managevent";

export default defineConfig(createVitestConfig());
