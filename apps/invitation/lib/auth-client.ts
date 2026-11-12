/**
 * Browser-side calls to the same-origin auth proxy (`/api/auth/*`, CONTRACT section D).
 *
 * Client components only. The proxy forwards to Better Auth on the API and passes the session
 * cookies back, so a successful call here signs the browser in or out. Auth endpoints accept
 * JSON only.
 */

/** Keys of `invitationShellEn.auth.errors`: the message a form shows for a failed call. */
export type AuthErrorKey =
  | "invalidCredentials"
  | "accountExists"
  | "invalidEmail"
  | "passwordTooShort"
  | "passwordTooLong"
  | "rateLimited"
  | "network"
  | "invalidCode"
  | "twoFactorExpired"
  | "invalidToken"
  | "linkFailed"
  | "unknown";

export type AuthResult<T = Record<string, unknown>> =
  { ok: true; data: T } | { ok: false; status: number; error: AuthErrorKey };

const CODE_TO_KEY: Readonly<Record<string, AuthErrorKey>> = {
  INVALID_EMAIL_OR_PASSWORD: "invalidCredentials",
  INVALID_PASSWORD: "invalidCredentials",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "invalidCredentials",
  USER_NOT_FOUND: "invalidCredentials",
  USER_ALREADY_EXISTS: "accountExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "accountExists",
  INVALID_EMAIL: "invalidEmail",
  PASSWORD_TOO_SHORT: "passwordTooShort",
  PASSWORD_TOO_LONG: "passwordTooLong",
  RATE_LIMITED: "rateLimited",
  TOO_MANY_REQUESTS: "rateLimited",
  NETWORK_ERROR: "network",
  INVALID_CODE: "invalidCode",
  INVALID_BACKUP_CODE: "invalidCode",
  INVALID_TWO_FACTOR_COOKIE: "twoFactorExpired",
  INVALID_TOKEN: "invalidToken",
};

/**
 * Maps a failed response to a message key. Better Auth answers `{ code, message }`; the API's
 * own limiters answer `{ error: { code } }`. Messages from the server are never shown as-is.
 */
export function authErrorKey(status: number, body: unknown): AuthErrorKey {
  if (status === 429) return "rateLimited";
  if (status === 0 || status === 502 || status === 503 || status === 504) return "network";
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const nested =
    typeof record.error === "object" && record.error !== null
      ? (record.error as Record<string, unknown>)
      : {};
  const code = typeof record.code === "string" ? record.code : nested.code;
  if (typeof code === "string" && Object.hasOwn(CODE_TO_KEY, code)) {
    return CODE_TO_KEY[code] ?? "unknown";
  }
  // A wrong password without a code still reads as "does not match", never as a server fault.
  if (status === 401) return "invalidCredentials";
  return "unknown";
}

async function post<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<AuthResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: "network" };
  }
  let parsed: unknown = null;
  try {
    const text = await response.text();
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    return { ok: false, status: response.status, error: authErrorKey(response.status, parsed) };
  }
  return { ok: true, data: (parsed ?? {}) as T };
}

/** `POST /api/auth/sign-in/email`. `twoFactorRedirect: true` means a code is needed next. */
export function signInWithPassword(input: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<AuthResult<{ twoFactorRedirect?: boolean }>> {
  return post("/sign-in/email", input);
}

/** `POST /api/auth/sign-up/email`. Signs the new host in straight away. */
export function signUpWithPassword(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  return post("/sign-up/email", input);
}

/**
 * `POST /api/auth/sign-in/magic-link`. Only offered when `capabilities.magicLink` is true.
 * `callbackPath` is a same-origin path; the emailed link returns through this site.
 */
export function requestMagicLink(input: {
  email: string;
  callbackPath: string;
}): Promise<AuthResult> {
  return post("/sign-in/magic-link", {
    email: input.email,
    callbackURL: `${window.location.origin}${input.callbackPath}`,
  });
}

/** `POST /api/auth/two-factor/verify-totp`, or the backup-code endpoint. */
export function verifyTwoFactor(input: {
  code: string;
  method: "totp" | "backup";
}): Promise<AuthResult> {
  return post(
    input.method === "totp" ? "/two-factor/verify-totp" : "/two-factor/verify-backup-code",
    { code: input.code },
  );
}

/**
 * `POST /api/auth/forget-password`. Only offered when `capabilities.passwordReset` is true.
 * The emailed link lands on `/reset-password?token=...` on this site.
 */
export function requestPasswordReset(input: { email: string }): Promise<AuthResult> {
  return post("/forget-password", {
    email: input.email,
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

/** `POST /api/auth/reset-password` with the token from the emailed link. */
export function resetPassword(input: { token: string; newPassword: string }): Promise<AuthResult> {
  return post("/reset-password", input);
}

/** `POST /api/auth/sign-out`. */
export function signOut(): Promise<AuthResult> {
  return post("/sign-out", {});
}

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** A deliberately simple check: something@something.tld, no spaces. The API is the authority. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) && value.trim().length <= 254;
}

/**
 * Password strength for the hint under the field: 0 = too short, 1 = fair, 2 = good,
 * 3 = strong. Length matters most; variety of character kinds is the tie-breaker.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  const length = password.length;
  if (length < PASSWORD_MIN_LENGTH) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
  // Repeating one or two characters adds length without adding strength.
  const distinct = new Set(password).size;
  if (distinct < 5) return 1;
  if (length >= 18 || (length >= 14 && kinds >= 3)) return 3;
  if (length >= 14 || kinds >= 3) return 2;
  return 1;
}
