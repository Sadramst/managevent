/**
 * Staff bootstrap: creates (or promotes) a `PLANNER_STAFF` / `SUPER_ADMIN` account and completes
 * two-factor enrolment, because the API rejects staff sessions without it.
 *
 *   pnpm --filter @managevent/api staff:create -- --email <e> --name "<n>" \
 *     --role PLANNER_STAFF|SUPER_ADMIN [--promote]
 *
 * The password comes from `STAFF_BOOTSTRAP_PASSWORD` (at least 12 characters). When it is unset,
 * the account gets 20 random characters, printed once. Everything goes through the same Better
 * Auth instance as the API (`auth.handler`), so no HTTP server is needed.
 *
 * `--promote` never builds on what the account already has. Sign-up is open, so the password and
 * the authenticator of an existing account belong to whoever registered the address first, who
 * need not be the person being made staff. A promotion therefore REPLACES the credentials: it
 * sets the new password, removes the existing authenticator, backup codes, sessions and pending
 * sign-in links, enrols a fresh authenticator, and prints the new secrets for the operator to
 * hand over. The old password and authenticator stop working.
 *
 * The TOTP URI and backup codes are printed once to stdout and stored nowhere else in clear text.
 */
import { randomInt } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { generateUuidV7 } from "@managevent/db";
import { type ApiAuth, createApiAuth } from "../lib/auth.js";
import { writeAudit } from "../lib/audit.js";
import { type ApiDeps, createDefaultDeps } from "../lib/deps.js";
import { secretFromTotpUri, totpCode } from "./totp.js";

export const STAFF_ROLES = ["PLANNER_STAFF", "SUPER_ADMIN"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const GENERATED_PASSWORD_LENGTH = 20;
/** No 0/O, 1/l/I: the password is read off a terminal once and typed into a password manager. */
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export interface CreateStaffInput {
  email: string;
  /** Required for a new account; ignored when promoting an existing one. */
  name?: string;
  role: StaffRole;
  /** Allow an existing account to be given the staff role (its credentials are replaced). */
  promote?: boolean;
  /** `STAFF_BOOTSTRAP_PASSWORD`: the password the account will have. Generated when absent. */
  password?: string;
}

export interface CreateStaffResult {
  userId: string;
  email: string;
  role: StaffRole;
  created: boolean;
  /** Set only when this run generated the password. */
  generatedPassword: string | null;
  /** The authenticator secret enrolled by this run. Every run enrols a new one. */
  totpURI: string;
  backupCodes: string[];
}

/** A failure the operator can act on; the CLI prints the message and exits non-zero. */
export class StaffBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffBootstrapError";
  }
}

function generatePassword(): string {
  let password = "";
  for (let i = 0; i < GENERATED_PASSWORD_LENGTH; i += 1) {
    password += PASSWORD_ALPHABET.charAt(randomInt(PASSWORD_ALPHABET.length));
  }
  return password;
}

function authBaseUrl(): string {
  return (process.env.BETTER_AUTH_URL?.trim() || "http://localhost:4000").replace(/\/+$/, "");
}

/** Calls a Better Auth endpoint in-process and returns its JSON body. */
async function callAuth(
  auth: ApiAuth,
  path: string,
  body: Record<string, unknown>,
  bearerToken?: string,
): Promise<Record<string, unknown>> {
  const response = await auth.handler(
    new Request(`${authBaseUrl()}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
  const parsed = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    // Better Auth's own code (for example INVALID_EMAIL_OR_PASSWORD); never the request body.
    const code = typeof parsed?.code === "string" ? parsed.code : `HTTP_${response.status}`;
    throw new StaffBootstrapError(`Auth step ${path} failed: ${code}`);
  }
  return parsed ?? {};
}

function sessionTokenOf(body: Record<string, unknown>, step: string): string {
  if (typeof body.token !== "string" || body.token.length === 0) {
    throw new StaffBootstrapError(`Auth step ${step} did not return a session`);
  }
  return body.token;
}

/** Steps 3 and 4: enable two-factor, then prove possession of the secret with a current code. */
async function enrolTwoFactor(
  auth: ApiAuth,
  deps: ApiDeps,
  sessionToken: string,
  password: string,
): Promise<{ totpURI: string; backupCodes: string[] }> {
  const enabled = await callAuth(auth, "/two-factor/enable", { password }, sessionToken);
  const totpURI = typeof enabled.totpURI === "string" ? enabled.totpURI : "";
  if (!totpURI) throw new StaffBootstrapError("Two-factor enrolment did not return a TOTP URI");
  const backupCodes = Array.isArray(enabled.backupCodes)
    ? enabled.backupCodes.filter((code): code is string => typeof code === "string")
    : [];

  // Verifying a code is what flips `twoFactorEnabled`; until then the account cannot use the API.
  const code = totpCode(secretFromTotpUri(totpURI), deps.now().getTime());
  await callAuth(auth, "/two-factor/verify-totp", { code }, sessionToken);
  return { totpURI, backupCodes };
}

/**
 * Replaces everything an existing account can sign in with, in one transaction: the password,
 * the authenticator and its backup codes, every session, and any pending emailed sign-in or
 * reset link. Afterwards only `password` opens the account, and it has no second factor yet.
 */
async function replaceCredentials(
  deps: ApiDeps,
  auth: ApiAuth,
  account: { userId: string; email: string; password: string },
): Promise<void> {
  const { userId, email, password } = account;
  // Hashed by Better Auth itself, exactly like a sign-up or a password reset.
  const passwordHash = await (await auth.$context).password.hash(password);

  await deps.db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.twoFactor.deleteMany({ where: { userId } });
    await tx.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    // Pending two-factor sign-ins and reset links hold the user id; magic links hold the address.
    await tx.verification.deleteMany({
      where: { OR: [{ value: userId }, { value: { contains: JSON.stringify(email) } }] },
    });
    const updated = await tx.account.updateMany({
      where: { userId, providerId: "credential" },
      data: { password: passwordHash },
    });
    if (updated.count === 0) {
      // An account made by an emailed link has no password yet.
      await tx.account.create({
        data: {
          id: generateUuidV7(),
          userId,
          accountId: userId,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }
  });
}

export async function createStaff(
  deps: ApiDeps,
  input: CreateStaffInput,
  auth: ApiAuth = createApiAuth(deps),
): Promise<CreateStaffResult> {
  const emailResult = z.string().trim().toLowerCase().email().max(254).safeParse(input.email);
  if (!emailResult.success) throw new StaffBootstrapError("--email must be a valid email address");
  const email = emailResult.data;
  if (!STAFF_ROLES.includes(input.role)) {
    throw new StaffBootstrapError("--role must be PLANNER_STAFF or SUPER_ADMIN");
  }
  const suppliedPassword = input.password;
  if (
    suppliedPassword !== undefined &&
    (suppliedPassword.length < MIN_PASSWORD_LENGTH || suppliedPassword.length > MAX_PASSWORD_LENGTH)
  ) {
    throw new StaffBootstrapError(
      `STAFF_BOOTSTRAP_PASSWORD must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters`,
    );
  }

  const existing = await deps.db.user.findUnique({ where: { email } });
  if (existing && !input.promote) {
    throw new StaffBootstrapError(
      "An account with this email already exists. Pass --promote to give it the staff role.",
    );
  }
  if (existing?.deletedAt) {
    throw new StaffBootstrapError("This account has been deleted and cannot be promoted");
  }

  let userId: string;
  let generatedPassword: string | null = null;
  let enrolment: { totpURI: string; backupCodes: string[] };

  if (!existing) {
    const name = input.name?.trim();
    if (!name) throw new StaffBootstrapError("--name is required for a new account");
    const password = suppliedPassword ?? (generatedPassword = generatePassword());

    // 1. Sign up through Better Auth, so the password is hashed exactly as a normal sign-up.
    const signedUp = await callAuth(auth, "/sign-up/email", { name, email, password });
    const sessionToken = sessionTokenOf(signedUp, "/sign-up/email");
    const created = await deps.db.user.findUnique({ where: { email }, select: { id: true } });
    if (!created) throw new StaffBootstrapError("The account was not created");
    userId = created.id;

    // 2. Grant the role. Sign-up itself can only ever produce CUSTOMER_HOST.
    await deps.db.user.update({ where: { id: userId }, data: { roles: [input.role] } });
    // 3 and 4.
    enrolment = await enrolTwoFactor(auth, deps, sessionToken, password);
  } else {
    userId = existing.id;
    const password = suppliedPassword ?? (generatedPassword = generatePassword());

    // Nothing the account already has is trusted (see the file header): not its password, and
    // not an authenticator that is already enrolled. Both are replaced before the role is granted.
    await replaceCredentials(deps, auth, { userId, email, password });
    const signedIn = await callAuth(auth, "/sign-in/email", { email, password });
    const sessionToken = sessionTokenOf(signedIn, "/sign-in/email");
    await deps.db.user.update({ where: { id: userId }, data: { roles: [input.role] } });
    enrolment = await enrolTwoFactor(auth, deps, sessionToken, password);
  }

  const user = await deps.db.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, roles: true },
  });
  if (!user?.twoFactorEnabled) {
    throw new StaffBootstrapError(
      "Two-factor was not enabled. Run again with --promote to finish the enrolment.",
    );
  }

  // 5. Every session from the bootstrap (and any older one) ends here; staff sign in with TOTP.
  await deps.db.session.deleteMany({ where: { userId } });

  // 6. Recorded as an operator action: whoever can run this CLI holds the database credentials.
  await writeAudit(deps.db, {
    actor: { roles: ["SUPER_ADMIN"] },
    action: "staff.bootstrap",
    entity: "User",
    entityId: userId,
    diff: {
      role: input.role,
      created: !existing,
      twoFactorEnrolled: true,
      credentialsReplaced: Boolean(existing),
      via: "cli",
    },
  });

  return {
    userId,
    email,
    role: input.role,
    created: !existing,
    generatedPassword,
    totpURI: enrolment.totpURI,
    backupCodes: enrolment.backupCodes,
  };
}

const USAGE =
  'Usage: pnpm --filter @managevent/api staff:create -- --email <email> --name "<name>" ' +
  "--role PLANNER_STAFF|SUPER_ADMIN [--promote]";

export function parseStaffArgs(argv: readonly string[]): CreateStaffInput {
  // pnpm passes a literal `--` through to the script; it is not one of ours.
  const args = argv.filter((arg, index) => !(arg === "--" && index === 0));
  let values: { email?: string; name?: string; role?: string; promote?: boolean };
  try {
    ({ values } = parseArgs({
      args,
      options: {
        email: { type: "string" },
        name: { type: "string" },
        role: { type: "string" },
        promote: { type: "boolean", default: false },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch {
    throw new StaffBootstrapError(USAGE);
  }
  if (!values.email || !values.role) throw new StaffBootstrapError(USAGE);
  if (!(STAFF_ROLES as readonly string[]).includes(values.role)) {
    throw new StaffBootstrapError("--role must be PLANNER_STAFF or SUPER_ADMIN");
  }
  return {
    email: values.email,
    ...(values.name !== undefined ? { name: values.name } : {}),
    role: values.role as StaffRole,
    promote: values.promote === true,
  };
}

function printResult(result: CreateStaffResult): void {
  const lines = [
    result.created ? "Staff account created." : "Existing account promoted.",
    `  User id:      ${result.userId}`,
    `  Email:        ${result.email}`,
    `  Role:         ${result.role}`,
  ];
  if (result.generatedPassword) {
    lines.push(`  Password:     ${result.generatedPassword}`);
  }
  lines.push(`  TOTP URI:     ${result.totpURI}`);
  lines.push(`  Backup codes: ${result.backupCodes.join(" ")}`);
  lines.push(
    "",
    "Add the TOTP URI to an authenticator app now. These values are shown once and are not",
    "stored anywhere in readable form.",
  );
  if (!result.created) {
    lines.push(
      "",
      "The account's earlier password, authenticator, backup codes and sessions no longer work.",
      result.generatedPassword
        ? "Give the new password and authenticator to the staff member in person."
        : "It now signs in with STAFF_BOOTSTRAP_PASSWORD and the authenticator above.",
    );
  }
  console.info(lines.join("\n"));
}

async function main(): Promise<void> {
  const deps = createDefaultDeps();
  try {
    const args = parseStaffArgs(process.argv.slice(2));
    const password = process.env.STAFF_BOOTSTRAP_PASSWORD;
    const result = await createStaff(deps, {
      ...args,
      ...(password ? { password } : {}),
    });
    printResult(result);
  } catch (err) {
    process.exitCode = 1;
    if (err instanceof StaffBootstrapError) {
      console.error(err.message);
    } else {
      // The error class only: a database or auth error message can carry the email address.
      console.error(`Staff bootstrap failed (${err instanceof Error ? err.name : "UnknownError"})`);
    }
  } finally {
    await deps.db.$disconnect();
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isMainModule) {
  await main();
}
