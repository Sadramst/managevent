#!/usr/bin/env node
/**
 * Generates the secrets a Managevent deployment needs, as `KEY=value` lines.
 *
 *   node scripts/generate-deployment-secrets.mjs                 # print to the terminal
 *   node scripts/generate-deployment-secrets.mjs --out <file>    # write a new file, mode 0600
 *
 * Paste the lines into `infra/vps/.env` on the server (production) or the root `.env` (local).
 * Every run produces new values: run it once per environment and keep the result somewhere
 * safe. Never commit the output or paste it into a chat, an issue or a pull request.
 *
 * With `--out` the values are not printed and an existing file is never overwritten.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SECRETS = [
  {
    name: "POSTGRES_PASSWORD",
    value: () => randomBytes(24).toString("hex"),
    note: "Database password (hex, safe inside a connection URL). Production only; local development uses postgres/postgres.",
  },
  {
    name: "PII_ENCRYPTION_KEY",
    value: () => randomBytes(32).toString("base64"),
    note: "32-byte Base64 AES-256-GCM key for guest health and dietary fields. Back it up off the server: without it those fields are unreadable in every backup.",
  },
  {
    name: "BETTER_AUTH_SECRET",
    value: () => randomBytes(32).toString("hex"),
    note: "Signs sessions and cookies. Changing it signs everyone out.",
  },
  {
    name: "GUEST_TOKEN_PEPPER",
    value: () => randomBytes(32).toString("hex"),
    note: "Signs guest links, QR passes and unsubscribe links (api and worker, same value). Changing it invalidates every link already sent.",
  },
  {
    name: "API_PROXY_SECRET",
    value: () => randomBytes(32).toString("hex"),
    note: "Shared by api, marketing and invitation (same value). Lets the API believe the visitor address the web apps forward.",
  },
];

function usage() {
  console.log("Usage: node scripts/generate-deployment-secrets.mjs [--out <file>]");
}

function parseArgs(argv) {
  const args = { out: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--out") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--out needs a file path");
      }
      args.out = value;
      index += 1;
    } else if (arg.startsWith("--out=")) {
      args.out = arg.slice("--out=".length);
      if (!args.out) throw new Error("--out needs a file path");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function render() {
  const lines = [
    "# Managevent deployment secrets. Generated locally with node:crypto; never commit this.",
  ];
  for (const secret of SECRETS) {
    lines.push("", `# ${secret.note}`, `${secret.name}=${secret.value()}`);
  }
  return `${lines.join("\n")}\n`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
  } else if (args.out) {
    const target = resolve(args.out);
    // `wx` fails when the file exists, so an earlier set of secrets is never destroyed.
    writeFileSync(target, render(), { mode: 0o600, flag: "wx" });
    console.log(`Wrote ${SECRETS.length} secrets to ${target} (mode 0600).`);
    console.log(`Names: ${SECRETS.map((secret) => secret.name).join(", ")}`);
  } else {
    console.error("Keep these values secret. Never commit them or paste them in a chat.\n");
    process.stdout.write(render());
  }
} catch (error) {
  const message =
    error instanceof Error && "code" in error && error.code === "EEXIST"
      ? "The output file already exists. Refusing to overwrite it: choose another path."
      : error instanceof Error
        ? error.message
        : String(error);
  console.error(message);
  usage();
  process.exitCode = 1;
}
