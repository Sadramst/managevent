/**
 * The API's Better Auth instance and session → actor resolution.
 *
 * One factory is shared by the HTTP app and the CLI tools (`cli/create-staff.ts`), so both use
 * the same adapter, id generator, trusted origins and email senders.
 */
import {
  type AuthActor,
  createManageventAuth,
  MFA_REQUIRED_ROLES,
  prismaAdapter,
} from "@managevent/auth";
import { generateId, generateUuidV7 } from "@managevent/db";
import { t } from "@managevent/i18n";
import type { ApiDeps } from "./deps.js";
import { isEmailConfigured, sendTransactionalEmail } from "./email.js";
import { getTrustedOrigins, toOrigin } from "./env.js";

const STAFF_ROLES: ReadonlySet<string> = new Set(MFA_REQUIRED_ROLES);

/**
 * Better Auth builds email links on the API origin. Browsers reach auth through each web app's
 * `/api/auth` proxy, so the link is moved to the origin of its `callbackURL` when that origin is
 * trusted. Verification then runs through the proxy and the session cookie lands on the app the
 * person started from. A relative or untrusted callback leaves the link untouched.
 */
export function rewriteAuthLinkOrigin(link: string, trustedOrigins: readonly string[]): string {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return link;
  }
  const callbackOrigin = toOrigin(url.searchParams.get("callbackURL") ?? undefined);
  if (!callbackOrigin || !trustedOrigins.includes(callbackOrigin)) return link;
  const target = new URL(callbackOrigin);
  url.protocol = target.protocol;
  url.host = target.host;
  return url.toString();
}

export function createApiAuth(deps: ApiDeps) {
  const trustedOrigins = getTrustedOrigins();
  const emailConfigured = isEmailConfigured();

  return createManageventAuth({
    database: prismaAdapter(deps.db, { provider: "postgresql" }),
    generateId: ({ model }) => (model === "user" ? generateId("usr_") : generateUuidV7()),
    trustedOrigins,
    ...(emailConfigured
      ? {
          sendMagicLink: async ({ email, url }) => {
            // A magic-link sign-in would skip TOTP (the 2FA hook only covers /sign-in/email), so
            // an account that has two-factor turned on, or whose role requires it, never
            // receives one. The verify endpoint refuses such an account too, in case
            // two-factor is enabled after a link has gone out (`magicLinkVerifyGuard`).
            const user = await deps.db.user.findUnique({
              where: { email: email.trim().toLowerCase() },
              select: { roles: true, twoFactorEnabled: true },
            });
            if (user?.twoFactorEnabled || user?.roles.some((role) => STAFF_ROLES.has(role))) {
              return;
            }
            await sendTransactionalEmail({
              to: email,
              subject: t("en", "emails.authMagicLinkSubject"),
              text: t("en", "emails.authMagicLinkBody", {
                url: rewriteAuthLinkOrigin(url, trustedOrigins),
              }),
            });
          },
          sendResetPassword: async ({ email, url }) => {
            await sendTransactionalEmail({
              to: email,
              subject: t("en", "emails.authResetPasswordSubject"),
              text: t("en", "emails.authResetPasswordBody", {
                url: rewriteAuthLinkOrigin(url, trustedOrigins),
              }),
            });
          },
        }
      : {}),
  });
}

export type ApiAuth = ReturnType<typeof createApiAuth>;

/**
 * Resolves the request's actor from a verified Better Auth session (cookie or bearer token).
 * Identity and role headers are never trusted.
 *
 * - no credentials, no session, or a deleted user → null
 * - staff (`PLANNER_STAFF`, `SUPER_ADMIN`) without two-factor enabled → null
 */
export function createSessionActorResolver(
  deps: ApiDeps,
  auth: ApiAuth,
): (request: Request) => Promise<AuthActor | null> {
  return async (request) => {
    if (!request.headers.has("cookie") && !request.headers.has("authorization")) return null;
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return null;
    const user = await deps.db.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.deletedAt) return null;
    if (user.roles.some((role) => STAFF_ROLES.has(role)) && !user.twoFactorEnabled) return null;
    return { userId: user.id, roles: user.roles, mfaVerified: user.twoFactorEnabled };
  };
}
