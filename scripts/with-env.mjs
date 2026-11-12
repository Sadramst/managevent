#!/usr/bin/env node
/**
 * Runs a command with the root `.env` loaded into its environment.
 *
 *   node scripts/with-env.mjs <command> [args...]
 *   pnpm with-env pnpm --filter @managevent/api dev
 *
 * Nothing in this repository reads `.env` by itself (no dotenv; Prisma only looks next to its
 * own schema), so the root scripts go through this wrapper.
 *
 * Rules:
 * - Variables that are already set in the shell or in CI win over `.env`.
 * - Empty values in `.env` are skipped, so validators see "missing" rather than "".
 * - NODE_ENV is never taken from `.env`: Next.js, Vitest and tsx choose it per command, and a
 *   forced NODE_ENV=development breaks `next build` and test runs.
 * - When `.env` does not exist (CI) the command runs unchanged.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/with-env.mjs <command> [args...]");
  process.exit(2);
}

const env = { ...process.env };
if (existsSync(envFile)) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync(envFile, "utf8")))) {
    if (key === "NODE_ENV" || value === "" || env[key] !== undefined) continue;
    env[key] = value;
  }
}

// A shell is required on Windows to run .cmd shims (pnpm, turbo), so quote arguments ourselves.
const quote = (value) => (/[\s"&|<>^()]/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value);
const child = spawn([command, ...args].map(quote).join(" "), {
  stdio: "inherit",
  shell: true,
  env,
});

child.on("error", (error) => {
  console.error(`[with-env] Could not run "${command}": ${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
