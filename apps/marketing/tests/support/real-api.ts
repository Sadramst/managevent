/**
 * Shared settings for the real-API end-to-end run (`playwright.real.config.ts`).
 *
 * That run talks to the real API and the real local PostgreSQL: nothing is mocked. It creates
 * its own accounts and enquiries under one throwaway email domain and soft-deletes them again
 * afterwards (`real-api.teardown.ts`).
 */

/**
 * The real API for this run. By default Playwright starts its own instance of `apps/api` on
 * port 4110 against the local database, so the run neither depends on nor disturbs an API a
 * developer already has on port 4000 (trusted origins and rate-limit counters are per process).
 * Set `REAL_API_URL` to use a running API instead; it must trust `REAL_WEB_ORIGIN`.
 */
export const USES_OWN_API = !process.env.REAL_API_URL;
export const REAL_API_URL = (process.env.REAL_API_URL || "http://localhost:4110").replace(
  /\/+$/,
  "",
);

/** The marketing server for this run. Not 3100, so it never collides with the mock-API run. */
export const REAL_WEB_PORT = Number.parseInt(process.env.REAL_WEB_PORT || "3110", 10);
export const REAL_WEB_ORIGIN = `http://localhost:${REAL_WEB_PORT}`;

/** Every address this run creates ends with this, so cleanup can find exactly its own rows. */
export const E2E_EMAIL_DOMAIN = "e2e.managevent.test";

/** Environment variables the global setup hands to the test workers. */
export const E2E_ENV = {
  staffEmail: "E2E_STAFF_EMAIL",
  staffPassword: "E2E_STAFF_PASSWORD",
  staffTotpUri: "E2E_STAFF_TOTP_URI",
  staffName: "E2E_STAFF_NAME",
  hostEmail: "E2E_HOST_EMAIL",
  hostPassword: "E2E_HOST_PASSWORD",
} as const;

export interface E2eAccounts {
  staff: { email: string; password: string; totpUri: string; name: string };
  host: { email: string; password: string };
}

/** The accounts created by the global setup, read inside a test worker. */
export function e2eAccounts(): E2eAccounts {
  const read = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not set: run with playwright.real.config.ts`);
    return value;
  };
  return {
    staff: {
      email: read(E2E_ENV.staffEmail),
      password: read(E2E_ENV.staffPassword),
      totpUri: read(E2E_ENV.staffTotpUri),
      name: read(E2E_ENV.staffName),
    },
    host: { email: read(E2E_ENV.hostEmail), password: read(E2E_ENV.hostPassword) },
  };
}

/** The password and TOTP URI the staff bootstrap CLI prints once. */
export function parseStaffCliOutput(stdout: string): { password: string; totpUri: string } {
  const password = /^\s*Password:\s+(\S+)\s*$/m.exec(stdout)?.[1];
  const totpUri = /^\s*TOTP URI:\s+(otpauth:\/\/\S+)\s*$/m.exec(stdout)?.[1];
  if (!password || !totpUri) {
    throw new Error("The staff bootstrap CLI did not print a password and a TOTP URI");
  }
  return { password, totpUri };
}
