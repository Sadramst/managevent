/**
 * Self-hosted Better Auth configuration (`ADR-0005`).
 *
 * Includes `organization`, `twoFactor`, `magicLink`, and `bearer` plugins,
 * with cross-subdomain cookies configured from `AUTH_COOKIE_DOMAIN`.
 */
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { bearer, magicLink, organization, twoFactor } from "better-auth/plugins";

export interface ManageventAuthConfigOptions {
  /** Base URL for Better Auth (defaults to `process.env.BETTER_AUTH_URL ?? "http://localhost:4000"`). */
  baseURL?: string;
  /** Secret for signing tokens/cookies (defaults to `process.env.BETTER_AUTH_SECRET`). */
  secret?: string;
  /** Cookie domain for cross-subdomain SSO (defaults to `process.env.AUTH_COOKIE_DOMAIN ?? "localhost"`). */
  cookieDomain?: string;
  /** Optional custom magic-link sender callback. */
  onSendMagicLink?: (params: { email: string; url: string; token: string }) => Promise<void> | void;
  /** Optional database adapter (e.g. Prisma adapter in `apps/api`). */
  database?: BetterAuthOptions["database"];
}

/**
 * Builds the Better Auth options object with Managevent's required plugins and SSO cookie policy.
 */
export function buildBetterAuthConfig(
  options: ManageventAuthConfigOptions = {},
): BetterAuthOptions {
  const cookieDomain = options.cookieDomain ?? process.env.AUTH_COOKIE_DOMAIN ?? "localhost";
  const baseURL = options.baseURL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:4000";
  const secret =
    options.secret ??
    process.env.BETTER_AUTH_SECRET ??
    "local-dev-only-better-auth-secret-32chars-minimum";
  const isSecure = baseURL.startsWith("https://") || process.env.NODE_ENV === "production";

  return {
    appName: "Managevent",
    baseURL,
    secret,
    ...(options.database ? { database: options.database } : {}),
    advanced: {
      cookiePrefix: "managevent",
      useSecureCookies: isSecure,
      crossSubDomainCookies: {
        enabled: true,
        domain: cookieDomain,
      },
    },
    plugins: [
      organization(),
      twoFactor({
        issuer: "Managevent",
      }),
      magicLink({
        sendMagicLink: async ({ email, url, token }) => {
          if (options.onSendMagicLink) {
            await options.onSendMagicLink({ email, url, token });
          }
        },
      }),
      bearer(),
    ] as unknown as NonNullable<BetterAuthOptions["plugins"]>,
  };
}

/**
 * Creates a Better Auth server instance configured for Managevent.
 */
export function createManageventAuth(options: ManageventAuthConfigOptions = {}) {
  return betterAuth(buildBetterAuthConfig(options));
}
