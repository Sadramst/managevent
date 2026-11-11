#!/usr/bin/env node
/**
 * Generates the three production secrets required by the deployment guide.
 *
 * Outputs:
 *   PII_ENCRYPTION_KEY  32 random bytes, standard Base64. AES-256-GCM key for
 *                       health & dietary data. See `packages/db/src/encryption.ts`
 *                       (`resolveEncryptionKey` decodes this as Base64 and expects
 *                       exactly 32 bytes, otherwise it hashes the string instead).
 *   BETTER_AUTH_SECRET  32 random bytes, Base64URL. Signs API sessions and cookies.
 *                       Consumed by `packages/auth/src/better-auth.ts`.
 *   GUEST_TOKEN_PEPPER  32 random bytes, Base64URL. Platform HMAC pepper for guest
 *                       invitation tokens. The per-event salt lives in the database,
 *                       never here (root `AGENTS.md` §3, lesson from
 *                       `anniversary-invitation`).
 *
 * Usage:
 *   node scripts/generate-deployment-secrets.mjs
 *   node scripts/generate-deployment-secrets.mjs --out .env.production.local
 *   node scripts/generate-deployment-secrets.mjs --json
 *
 * The `--out` file is written with mode 0600 where the platform supports it and is
 * refused if it already exists unless `--force` is passed. Never commit the output:
 * `.env`, `.env.*` are gitignored (only `.env.example` is tracked).
 */
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** All three secrets are 32 bytes of entropy. */
const KEY_BYTES = 32;

/** @returns {string} 32 random bytes as standard Base64 (44 chars incl. padding). */
function base64Key() {
  return randomBytes(KEY_BYTES).toString("base64");
}

/** @returns {string} 32 random bytes as Base64URL (43 chars, no padding). */
function urlSafeSecret() {
  return randomBytes(KEY_BYTES).toString("base64url");
}

/**
 * Fails loudly if a generated key is not the exact shape the runtime expects.
 * Catches a Node crypto change or an accidental edit to this file.
 * @param {Record<string, string>} secrets
 */
function assertSecretShapes(secrets) {
  const pii = Buffer.from(secrets.PII_ENCRYPTION_KEY, "base64");
  if (pii.length !== KEY_BYTES) {
    throw new Error(`PII_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${pii.length}`);
  }
  for (const name of ["BETTER_AUTH_SECRET", "GUEST_TOKEN_PEPPER"]) {
    const raw = Buffer.from(secrets[name], "base64url");
    if (raw.length !== KEY_BYTES) {
      throw new Error(`${name} must decode to ${KEY_BYTES} bytes, got ${raw.length}`);
    }
  }
}

/**
 * Parses `--flag` / `--flag value` pairs.
 * @param {string[]} argv
 * @returns {{ out?: string, json: boolean, force: boolean, help: boolean }}
 */
function parseArgs(argv) {
  /** @type {{ out?: string, json: boolean, force: boolean, help: boolean }} */
  const args = { json: false, force: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      args.json = true;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--out") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("--out requires a file path, e.g. --out .env.production.local");
      }
      args.out = next;
      i += 1;
    } else if (arg.startsWith("--out=")) {
      args.out = arg.slice("--out=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node scripts/generate-deployment-secrets.mjs [--out <file>] [--json] [--force]",
      "",
      "  --out <file>  Also write the secrets as KEY=VALUE lines to <file>",
      "  --json        Print a JSON object instead of KEY=VALUE lines",
      "  --force       Overwrite <file> if it already exists",
      "  -h, --help    Show this message",
      "",
    ].join("\n"),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  /** @type {Record<string, string>} */
  const secrets = {
    PII_ENCRYPTION_KEY: base64Key(),
    BETTER_AUTH_SECRET: urlSafeSecret(),
    GUEST_TOKEN_PEPPER: urlSafeSecret(),
  };
  assertSecretShapes(secrets);

  for (const name of Object.keys(secrets)) {
    if (!/^[A-Za-z0-9+/_=-]+$/.test(secrets[name])) {
      throw new Error(`${name} contains characters that are unsafe in a .env file`);
    }
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(secrets, null, 2)}\n`);
  } else {
    for (const [name, value] of Object.entries(secrets)) {
      process.stdout.write(`${name}=${value}\n`);
    }
  }

  if (args.out) {
    const target = resolve(process.cwd(), args.out);
    if (existsSync(target) && !args.force) {
      throw new Error(
        `${target} already exists. Refusing to overwrite a file that may hold live keys; pass --force if that is really intended.`,
      );
    }
    const body =
      [
        "# Generated by scripts/generate-deployment-secrets.mjs",
        "# NEVER commit this file. Rotate a key only by re-running with a new file.",
        ...Object.entries(secrets).map(([name, value]) => `${name}=${value}`),
        "",
      ].join("\n");
    writeFileSync(target, body, { encoding: "utf8", mode: 0o600 });
    process.stderr.write(`Wrote 3 secrets to ${target} (mode 0600)\n`);
  }

  process.stderr.write(
    [
      "",
      "Keep these private. Never commit them, paste them in a public channel, or reuse",
      "them across environments. Set them as Fly.io/GitHub secrets, not in git.",
      "",
    ].join("\n"),
  );
}

main();
