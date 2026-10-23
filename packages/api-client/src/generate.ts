/**
 * CLI script to regenerate `src/generated.ts` from `@managevent/api/openapi`
 * or check (`--check`) that the committed file is up to date.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateOpenApiSpec } from "@managevent/api/openapi";
import { buildGeneratedClientSource } from "./generator.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const generatedFilePath = resolve(currentDir, "generated.ts");

const spec = generateOpenApiSpec();
const expectedSource = buildGeneratedClientSource(spec);
const isCheckMode = process.argv.includes("--check");

if (isCheckMode) {
  const currentSource = readFileSync(generatedFilePath, "utf8").replace(/\r\n/g, "\n");
  if (currentSource !== expectedSource.replace(/\r\n/g, "\n")) {
    console.error(
      "ERROR: packages/api-client/src/generated.ts is out of date with apps/api OpenAPI spec. Run `pnpm --filter @managevent/api-client generate`.",
    );
    process.exit(1);
  }
  console.info("packages/api-client/src/generated.ts is up to date.");
} else {
  writeFileSync(generatedFilePath, expectedSource, "utf8");
  console.info("Generated packages/api-client/src/generated.ts");
}
