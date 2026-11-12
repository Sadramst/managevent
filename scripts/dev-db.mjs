#!/usr/bin/env node
/**
 * Local PostgreSQL without Docker.
 *
 * Runs the real PostgreSQL 16 binaries shipped by the `embedded-postgres` npm package
 * (root devDependency) against a cluster stored in the gitignored `.local/pg` directory.
 * Matches docker-compose.yml: port 5432, user postgres / password postgres, database managevent.
 *
 * Usage:
 *   node scripts/dev-db.mjs start            Foreground. Ctrl+C stops PostgreSQL cleanly.
 *   node scripts/dev-db.mjs start --detach   Start in the background and return.
 *   node scripts/dev-db.mjs stop             Fast, clean shutdown.
 *   node scripts/dev-db.mjs status           Exit 0 when running, 3 when stopped.
 *   node scripts/dev-db.mjs reset            Drop and recreate the `managevent` database.
 *
 * Local development only. Never point this at staging or production.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import { arch, platform, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DIR = path.join(ROOT, ".local");
const DATA_DIR = path.join(LOCAL_DIR, "pg");
const LOG_FILE = path.join(LOCAL_DIR, "pg.log");

const HOST = "localhost";
const PORT = 5432;
const USER = "postgres";
const PASSWORD = "postgres";
const DATABASE = "managevent";
const TIMEZONE = "Australia/Perth";
const URL = `postgresql://${USER}:${PASSWORD}@${HOST}:${PORT}/${DATABASE}`;

const log = (message) => console.log(`[dev-db] ${message}`);
const fail = (message, code = 1) => {
  console.error(`[dev-db] ERROR: ${message}`);
  process.exit(code);
};

/** Environment for the PostgreSQL binaries: no inherited PG* overrides, English messages. */
function pgEnv() {
  const env = { ...process.env, LC_MESSAGES: "C" };
  for (const key of Object.keys(env)) {
    if (/^PG[A-Z]+$/.test(key)) delete env[key];
  }
  return env;
}

/** Locates the platform binaries and the `pg` driver that ship with embedded-postgres. */
async function loadToolchain() {
  const packageDir = path.join(ROOT, "node_modules", "embedded-postgres");
  if (!existsSync(packageDir)) {
    fail("embedded-postgres is not installed. Run `pnpm install` from the repository root first.");
  }
  const requireFromPackage = createRequire(path.join(realpathSync(packageDir), "package.json"));
  const platformName = platform() === "win32" ? "windows" : platform();
  const binaryPackage = `@embedded-postgres/${platformName}-${arch()}`;

  let binaryEntry;
  try {
    binaryEntry = requireFromPackage.resolve(binaryPackage);
  } catch {
    fail(
      `No PostgreSQL binaries for this machine (${binaryPackage} is not installed). ` +
        "Use `docker compose up -d` or a system PostgreSQL 16+ instead (see infra/LOCAL_DEV.md).",
    );
  }
  const binaries = await import(pathToFileURL(binaryEntry).href);

  // macOS/Linux packages ship shared-library symlinks as a manifest that a postinstall script
  // recreates. pnpm 10 does not run that script by default, so recreate them here (idempotent).
  const hydrateScript = path.resolve(
    path.dirname(binaryEntry),
    "..",
    "scripts",
    "hydrate-symlinks.js",
  );
  if (existsSync(hydrateScript)) {
    const { hydrateSymlinks } = await import(pathToFileURL(hydrateScript).href);
    await hydrateSymlinks?.();
  }

  const pgCtl = binaries.pg_ctl ?? path.join(path.dirname(binaries.postgres), "pg_ctl");
  for (const file of [binaries.initdb, binaries.postgres, pgCtl]) {
    if (!existsSync(file)) fail(`PostgreSQL binary is missing: ${file}. Re-run \`pnpm install\`.`);
  }
  return {
    initdb: binaries.initdb,
    postgres: binaries.postgres,
    pgCtl,
    pg: requireFromPackage("pg"),
  };
}

function run(file, args, options = {}) {
  const result = spawnSync(file, args, {
    env: pgEnv(),
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
  return {
    code: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
    error: result.error,
  };
}

function isWindowsAdmin() {
  if (platform() !== "win32") return false;
  return spawnSync("net", ["session"], { stdio: "ignore", windowsHide: true }).status === 0;
}

function privilegeHint() {
  if (platform() === "win32" && isWindowsAdmin()) {
    return (
      "\nThis terminal is elevated (Run as administrator). PostgreSQL refuses to run with " +
      "administrator rights: open a normal, non-elevated terminal and run the command again."
    );
  }
  if (platform() !== "win32" && process.getuid?.() === 0) {
    return "\nPostgreSQL refuses to run as root: run the command as a normal user.";
  }
  return "";
}

const isInitialised = () => existsSync(path.join(DATA_DIR, "PG_VERSION"));

/** True when a postmaster is running on our data directory. */
function clusterRunning(tools) {
  if (!isInitialised()) return false;
  return run(tools.pgCtl, ["status", "-D", DATA_DIR]).code === 0;
}

function portInUse() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: PORT });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1500, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

function initCluster(tools) {
  log(`Initialising a new PostgreSQL cluster in ${DATA_DIR}`);
  mkdirSync(LOCAL_DIR, { recursive: true });
  const passwordFile = path.join(tmpdir(), `managevent-pg-${randomBytes(6).toString("hex")}`);
  writeFileSync(passwordFile, `${PASSWORD}\n`, { mode: 0o600 });
  try {
    // --locale=C: the default Windows system locale names are frequently rejected by initdb,
    // and C + UTF8 behaves the same on every developer machine.
    const result = run(tools.initdb, [
      `--pgdata=${DATA_DIR}`,
      `--username=${USER}`,
      `--pwfile=${passwordFile}`,
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
      "--lc-messages=C",
    ]);
    if (result.code !== 0) {
      // A half-written cluster cannot be started and blocks the next initdb: remove it.
      rmSync(DATA_DIR, { recursive: true, force: true });
      fail(
        `initdb failed (exit ${result.code}).\n${result.output || result.error?.message || ""}` +
          privilegeHint(),
      );
    }
  } finally {
    rmSync(passwordFile, { force: true });
  }
}

function startCluster(tools) {
  mkdirSync(LOCAL_DIR, { recursive: true });
  const serverOptions = `-p ${PORT} -c listen_addresses=localhost -c timezone=${TIMEZONE} -c log_timezone=${TIMEZONE}`;
  // stdio "ignore": on Windows pg_ctl hands its own std handles to the server; a pipe here
  // would never close and spawnSync would hang.
  const result = run(
    tools.pgCtl,
    ["start", "-D", DATA_DIR, "-l", LOG_FILE, "-w", "-t", "60", "-o", serverOptions],
    { stdio: "ignore" },
  );
  if (result.code !== 0) {
    let tail = "";
    try {
      tail = readFileSync(LOG_FILE, "utf8").trimEnd().split(/\r?\n/).slice(-15).join("\n");
    } catch {
      // no log written
    }
    fail(
      `PostgreSQL did not start (pg_ctl exit ${result.code}). Last lines of ${LOG_FILE}:\n${tail}` +
        privilegeHint(),
    );
  }
}

function stopCluster(tools) {
  const result = run(tools.pgCtl, ["stop", "-D", DATA_DIR, "-m", "fast", "-w", "-t", "60"]);
  return result.code === 0 || !clusterRunning(tools) ? null : result.output;
}

async function withClient(tools, database, callback) {
  const client = new tools.pg.Client({
    host: HOST,
    port: PORT,
    user: USER,
    password: PASSWORD,
    database,
  });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function ensureDatabase(tools) {
  await withClient(tools, "postgres", async (client) => {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DATABASE]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${client.escapeIdentifier(DATABASE)}`);
      log(`Created database "${DATABASE}".`);
    }
  });
}

/** Starts the cluster if needed. Returns false when it was already running. */
async function ensureStarted(tools) {
  if (clusterRunning(tools)) return false;
  if (await portInUse()) {
    fail(
      `Port ${PORT} is already in use by another process, not by the cluster in ${DATA_DIR}. ` +
        "Stop the other PostgreSQL (Docker container or Windows service) and try again.",
    );
  }
  if (!isInitialised()) initCluster(tools);
  startCluster(tools);
  return true;
}

async function commandStart(tools, detach) {
  const started = await ensureStarted(tools);
  await ensureDatabase(tools);
  if (!started) {
    log(`PostgreSQL is already running on ${HOST}:${PORT} (${URL}). Nothing to do.`);
    return;
  }
  log(`PostgreSQL is ready: ${URL}`);
  log(`Server log: ${LOG_FILE}`);
  if (detach) {
    log("Running in the background. Stop it with `pnpm db:local:stop`.");
    return;
  }

  log("Press Ctrl+C to stop.");
  let stopping = false;
  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    log(`${signal} received, stopping PostgreSQL...`);
    const problem = stopCluster(tools);
    if (problem) fail(`PostgreSQL did not stop cleanly: ${problem}`);
    log("PostgreSQL stopped.");
    process.exit(0);
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK", "SIGHUP"]) {
    process.on(signal, () => shutdown(signal));
  }
  // Stay in the foreground until the server goes away (for example `pnpm db:local:stop`).
  setInterval(() => {
    if (!stopping && !clusterRunning(tools)) {
      log("PostgreSQL is no longer running. Exiting.");
      process.exit(0);
    }
  }, 2000);
}

function commandStop(tools) {
  if (!clusterRunning(tools)) {
    log("PostgreSQL is not running.");
    return;
  }
  const problem = stopCluster(tools);
  if (problem) fail(`PostgreSQL did not stop: ${problem}`);
  log("PostgreSQL stopped.");
}

async function commandStatus(tools) {
  if (!isInitialised()) {
    log(`Not initialised (no cluster in ${DATA_DIR}). Run \`pnpm db:local\`.`);
    process.exit(3);
  }
  if (!clusterRunning(tools)) {
    log("Stopped. Run `pnpm db:local` to start it.");
    process.exit(3);
  }
  const version = await withClient(tools, "postgres", async (client) => {
    const result = await client.query("SHOW server_version");
    return result.rows[0].server_version;
  });
  log(`Running: PostgreSQL ${version} at ${URL}`);
}

async function commandReset(tools) {
  const startedHere = await ensureStarted(tools);
  try {
    await withClient(tools, "postgres", async (client) => {
      const name = client.escapeIdentifier(DATABASE);
      await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await client.query(`CREATE DATABASE ${name}`);
    });
    log(`Database "${DATABASE}" dropped and recreated (empty).`);
    log("Next: `pnpm db:migrate` then `pnpm db:seed`.");
  } finally {
    if (startedHere) {
      stopCluster(tools);
      log("PostgreSQL was not running before the reset, so it has been stopped again.");
    }
  }
}

const [command, ...flags] = process.argv.slice(2);
const tools = await loadToolchain();

try {
  switch (command) {
    case "start":
      await commandStart(tools, flags.includes("--detach"));
      break;
    case "stop":
      commandStop(tools);
      break;
    case "status":
      await commandStatus(tools);
      break;
    case "reset":
      await commandReset(tools);
      break;
    default:
      console.error("Usage: node scripts/dev-db.mjs <start [--detach] | stop | status | reset>");
      process.exit(2);
  }
} catch (error) {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
}
