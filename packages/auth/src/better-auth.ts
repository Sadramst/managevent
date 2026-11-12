/**
 * Self-hosted Better Auth configuration (`ADR-0005`).
 *
 * Email and password sign-in with `twoFactor` and `bearer`, plus `magicLink` only when the caller
 * supplies a real sender. Roles are assigned on the server (`databaseHooks.user.create.before`),
 * never by the client.
 *
 * The `organization` plugin is deliberately absent: its `invitation` model would resolve to the
 * event `Invitation` table through `prismaAdapter`.
 */
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { bearer, magicLink, twoFactor } from "better-auth/plugins";

export interface ManageventAuthConfigOptions {
  /** Base URL for Better Auth (defaults to `process.env.BETTER_AUTH_URL ?? "http://localhost:4000"`). */
  baseURL?: string;
  /** Secret for signing tokens/cookies (defaults to `process.env.BETTER_AUTH_SECRET`). */
  secret?: string;
  /**
   * Cookie domain for cross-subdomain SSO (defaults to `process.env.AUTH_COOKIE_DOMAIN`).
   * Unset, `localhost` or an IP address gives host-only cookies.
   */
  cookieDomain?: string;
  /** Database adapter (e.g. the Prisma adapter in `apps/api`). */
  database?: BetterAuthOptions["database"];
  /** Origins allowed to call the auth endpoints with credentials (CSRF origin check). */
  trustedOrigins?: string[];
  /** Custom id generator, e.g. `usr_` prefixed ids for the `user` model. */
  generateId?: (o: { model: string }) => string;
  /** Magic-link sender. Its presence registers the `magicLink` plugin. */
  sendMagicLink?: (p: { email: string; url: string; token: string }) => Promise<void>;
  /** Password-reset sender. Its presence enables the reset flow. */
  sendResetPassword?: (p: { email: string; url: string; token: string }) => Promise<void>;
}

/**
 * The ONLY header Better Auth reads the client IP from (rate limits, `Session.ipAddress`).
 *
 * It is an internal header: the host application must overwrite it on every request it hands to
 * `auth.handler`, with an address taken from a source the caller cannot forge (the connection, or
 * a header set by its own proxy). `x-forwarded-for` is deliberately not used: its first hop is
 * whatever the caller typed, and Better Auth skips its rate limiter when that is not an IP.
 */
export const TRUSTED_CLIENT_IP_HEADER = "x-managevent-client-ip";

/** Roles that must always sign in with a second factor. */
export const MFA_REQUIRED_ROLES: readonly string[] = ["PLANNER_STAFF", "SUPER_ADMIN"];

const EMAIL_LIKE = /[^\s@'"<>(),;]+@[^\s@'"<>(),;]+/g;

/**
 * Better Auth's default logger prints its arguments, and those carry the email address of every
 * failed sign-in and reset request ("User not found { email }"). This logger keeps the message
 * and the error class and drops everything else, so no address, token or id reaches the logs.
 */
export function logAuthEvent(level: string, message: unknown, ...args: unknown[]): void {
  const text = typeof message === "string" ? message : "auth event";
  const error = args.find((arg): arg is Error => arg instanceof Error);
  const line = JSON.stringify({
    level,
    msg: `better-auth: ${text.replace(EMAIL_LIKE, "[REDACTED]").slice(0, 300)}`,
    ...(error ? { error: error.name } : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

interface MagicLinkUser {
  id: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean | null;
  roles?: unknown;
}

/**
 * Runs before `GET /magic-link/verify` (Better Auth 1.2.12 has no such checks of its own):
 *
 * - An account with two-factor enabled, or with a role that requires it, never signs in by
 *   emailed link: the two-factor hook only covers password sign-in, so the link would be a way
 *   round the second factor. The link is consumed and the request refused.
 * - An account whose address was never verified may have been registered by someone else, with
 *   their password. The link proves who owns the mailbox, so that password and every session
 *   opened with it are removed before the owner is signed in. A password is set again through
 *   the reset flow.
 */
const magicLinkVerifyGuard = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/magic-link/verify") return;
  const query = ctx.query as Record<string, unknown> | undefined;
  const token = typeof query?.token === "string" ? query.token : null;
  if (!token) return;

  const stored = await ctx.context.internalAdapter.findVerificationValue(token);
  // Unknown or expired: the endpoint itself answers.
  if (!stored || stored.expiresAt < new Date()) return;
  let email: unknown;
  try {
    email = (JSON.parse(stored.value) as { email?: unknown }).email;
  } catch {
    return;
  }
  if (typeof email !== "string") return;

  const found = await ctx.context.internalAdapter.findUserByEmail(email);
  const user = found?.user as MagicLinkUser | undefined;
  if (!user) return;

  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (user.twoFactorEnabled || roles.some((role) => MFA_REQUIRED_ROLES.includes(String(role)))) {
    await ctx.context.internalAdapter.deleteVerificationValue(stored.id);
    throw new APIError("FORBIDDEN", {
      code: "TWO_FACTOR_REQUIRED",
      message: "This account signs in with its password and two-factor code",
    });
  }

  if (!user.emailVerified) {
    await ctx.context.adapter.deleteMany({
      model: "account",
      where: [
        { field: "userId", value: user.id },
        { field: "providerId", value: "credential" },
      ],
    });
    await ctx.context.internalAdapter.deleteSessions(user.id);
  }
});

/** Every self-registered account starts as a host. Staff roles are granted by the bootstrap CLI. */
const DEFAULT_SIGN_UP_ROLES = ["CUSTOMER_HOST"] as const;

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
const ONE_DAY_SECONDS = 60 * 60 * 24;

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * A cookie `Domain` attribute is only meaningful for a registrable domain. `localhost` and IP
 * addresses must use host-only cookies, otherwise browsers drop the cookie.
 */
function isShareableCookieDomain(domain: string | undefined): domain is string {
  if (!domain) return false;
  const host = domain.trim().replace(/^\./, "").toLowerCase();
  if (host === "" || host === "localhost") return false;
  if (IPV4_PATTERN.test(host) || host.includes(":")) return false;
  return true;
}

/**
 * Builds the Better Auth options object with Managevent's sign-in methods, plugins and cookie policy.
 */
export function buildBetterAuthConfig(
  options: ManageventAuthConfigOptions = {},
): BetterAuthOptions {
  const cookieDomain = options.cookieDomain ?? process.env.AUTH_COOKIE_DOMAIN;
  const baseURL = options.baseURL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:4000";
  if (process.env.NODE_ENV === "production" && !options.secret && !process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  const secret =
    options.secret ??
    process.env.BETTER_AUTH_SECRET ??
    "local-dev-only-better-auth-secret-32chars-minimum";

  const { sendMagicLink, sendResetPassword, generateId } = options;

  return {
    appName: "Managevent",
    baseURL,
    secret,
    ...(options.database ? { database: options.database } : {}),
    ...(options.trustedOrigins ? { trustedOrigins: options.trustedOrigins } : {}),
    // Never the default console logger: it prints email addresses (see `logAuthEvent`).
    logger: { level: "error", log: logAuthEvent },
    ...(sendMagicLink ? { hooks: { before: magicLinkVerifyGuard } } : {}),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      ...(sendResetPassword
        ? {
            sendResetPassword: async ({ user, url, token }) => {
              await sendResetPassword({ email: user.email, url, token });
            },
          }
        : {}),
    },
    user: {
      additionalFields: {
        roles: {
          type: "string[]",
          required: false,
          input: false,
          defaultValue: [...DEFAULT_SIGN_UP_ROLES],
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          // Authoritative: whatever the request carried, a new account is a host and nothing more.
          before: async (user) => ({ data: { ...user, roles: [...DEFAULT_SIGN_UP_ROLES] } }),
        },
      },
    },
    session: {
      expiresIn: THIRTY_DAYS_SECONDS,
      updateAge: ONE_DAY_SECONDS,
    },
    account: {
      accountLinking: { enabled: false },
    },
    rateLimit: {
      enabled: process.env.NODE_ENV !== "test",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 3600, max: 20 },
        "/two-factor/verify-totp": { window: 60, max: 10 },
        "/sign-in/magic-link": { window: 3600, max: 10 },
      },
    },
    advanced: {
      cookiePrefix: "managevent",
      useSecureCookies: baseURL.startsWith("https://"),
      ipAddress: { ipAddressHeaders: [TRUSTED_CLIENT_IP_HEADER] },
      ...(generateId ? { database: { generateId: ({ model }) => generateId({ model }) } } : {}),
      ...(isShareableCookieDomain(cookieDomain)
        ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } }
        : {}),
    },
    plugins: [
      twoFactor({ issuer: "Managevent" }),
      bearer(),
      ...(sendMagicLink
        ? [
            magicLink({
              expiresIn: 600,
              sendMagicLink: async ({ email, url, token }) => {
                await sendMagicLink({ email, url, token });
              },
            }),
          ]
        : []),
    ] as unknown as NonNullable<BetterAuthOptions["plugins"]>,
  };
}

/**
 * Creates a Better Auth server instance configured for Managevent.
 */
export function createManageventAuth(options: ManageventAuthConfigOptions = {}) {
  return betterAuth(buildBetterAuthConfig(options));
}
