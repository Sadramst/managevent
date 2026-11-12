/**
 * Global setup for the real-API run: checks the API is the local one and trusts this run's web
 * origin, then creates the two accounts the tests sign in with.
 *
 * - A staff account, through the same CLI an operator uses (`staff:create`). Its password and
 *   authenticator secret are printed once; they are parsed from stdout and handed to the workers
 *   through environment variables, never written to disk.
 * - An ordinary host account, through the API's public sign-up.
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  E2E_EMAIL_DOMAIN,
  E2E_ENV,
  parseStaffCliOutput,
  REAL_API_URL,
  REAL_WEB_ORIGIN,
} from "./real-api";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function assertLocalApi(): void {
  const { hostname } = new URL(REAL_API_URL);
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "[::1]") {
    throw new Error(
      `The real-API tests create staff accounts, so they only run against a local API. ` +
        `REAL_API_URL is ${REAL_API_URL}.`,
    );
  }
}

/** The CORS allow-list is the API's trusted-origin list, so it answers this without side effects. */
async function assertOriginTrusted(): Promise<void> {
  const response = await fetch(`${REAL_API_URL}/health`, { headers: { origin: REAL_WEB_ORIGIN } });
  if (response.headers.get("access-control-allow-origin") !== REAL_WEB_ORIGIN) {
    throw new Error(
      `The API at ${REAL_API_URL} does not trust ${REAL_WEB_ORIGIN}, so sign-in through the ` +
        `proxy would be refused. Stop that API and let Playwright start its own, or restart it ` +
        `with AUTH_TRUSTED_ORIGINS including ${REAL_WEB_ORIGIN}.`,
    );
  }
}

function createStaff(email: string, name: string): { password: string; totpUri: string } {
  // One shell command line, because pnpm is a .cmd shim on Windows. Every value in it is
  // generated here (hex id, fixed name), so there is nothing to escape.
  const stdout = execSync(
    `node scripts/with-env.mjs pnpm --filter @managevent/api staff:create -- --email ${email} --name "${name}" --role SUPER_ADMIN`,
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  return parseStaffCliOutput(stdout);
}

async function signUpHost(email: string, password: string): Promise<void> {
  const response = await fetch(`${REAL_API_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "E2E Host", email, password }),
  });
  if (!response.ok) {
    throw new Error(`Host sign-up through the API failed with status ${response.status}`);
  }
}

export default async function globalSetup(): Promise<void> {
  assertLocalApi();
  await assertOriginTrusted();

  const run = randomBytes(5).toString("hex");
  const staffEmail = `staff-${run}@${E2E_EMAIL_DOMAIN}`;
  const staffName = "E2E Planner";
  const staff = createStaff(staffEmail, staffName);

  const hostEmail = `host-${run}@${E2E_EMAIL_DOMAIN}`;
  const hostPassword = `Host-${randomBytes(12).toString("base64url")}`;
  await signUpHost(hostEmail, hostPassword);

  process.env[E2E_ENV.staffEmail] = staffEmail;
  process.env[E2E_ENV.staffPassword] = staff.password;
  process.env[E2E_ENV.staffTotpUri] = staff.totpUri;
  process.env[E2E_ENV.staffName] = staffName;
  process.env[E2E_ENV.hostEmail] = hostEmail;
  process.env[E2E_ENV.hostPassword] = hostPassword;
}
