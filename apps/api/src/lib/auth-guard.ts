/**
 * Abuse limits in front of the Better Auth mount (`/api/auth/*`).
 *
 * Better Auth has a per-IP limiter of its own, but it reads the address from a header and does
 * nothing at all when that header is missing or is not an IP, and its two-factor plugin has no
 * attempt lockout for TOTP. The API therefore:
 *
 * - hands Better Auth the address it resolved itself (`withTrustedClientIp`), so its limiter and
 *   `Session.ipAddress` never see a caller-supplied value;
 * - applies its own per-IP limits to the sensitive endpoints, which fall back to one shared bucket
 *   when the address is unknown instead of switching off;
 * - adds limits that do not depend on the address: failed password sign-ins per email address,
 *   emailed links per address, and failed two-factor codes per account. A caller with many
 *   addresses still cannot guess one account's password or six-digit code without bound.
 */
import { createHash } from "node:crypto";
import { TRUSTED_CLIENT_IP_HEADER } from "@managevent/auth";
import type { Context, MiddlewareHandler } from "hono";
import type { ApiEnv } from "../middleware/context.js";
import { rateLimitIpKey, toAuthClientIp, UNKNOWN_CLIENT_IP } from "./client-ip.js";
import type { ApiDeps } from "./deps.js";
import { clientIp, failureLimit, rateLimit } from "./rate-limit.js";

const AUTH_BASE_PATH = "/api/auth";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const MAX_EMAIL_LENGTH = 320;

/** The request as Better Auth must see it: the client IP header always comes from the API. */
export function withTrustedClientIp(request: Request, ip: string): Request {
  const headers = new Headers(request.headers);
  headers.set(TRUSTED_CLIENT_IP_HEADER, toAuthClientIp(ip === UNKNOWN_CLIENT_IP ? null : ip));
  return new Request(request, { headers });
}

/** The Better Auth path of the request, for example `/sign-in/email`. */
function authPath(c: Context<ApiEnv>): string {
  const path = c.req.path.startsWith(AUTH_BASE_PATH)
    ? c.req.path.slice(AUTH_BASE_PATH.length)
    : c.req.path;
  return path.replace(/\/+$/, "") || "/";
}

const bodies = new WeakMap<Request, Promise<Record<string, unknown> | null>>();

/** The JSON body, read from a clone so Better Auth still receives the original stream. */
function jsonBody(c: Context<ApiEnv>): Promise<Record<string, unknown> | null> {
  const raw = c.req.raw;
  let body = bodies.get(raw);
  if (!body) {
    body = raw
      .clone()
      .json()
      .then(
        (value: unknown) =>
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : null,
        () => null,
      );
    bodies.set(raw, body);
  }
  return body;
}

/** Keyed by a hash of the address in the body: raw addresses are not held as map keys. */
async function byEmail(c: Context<ApiEnv>): Promise<string | null> {
  const email = (await jsonBody(c))?.email;
  if (typeof email !== "string") return null;
  const normalised = email.trim().toLowerCase();
  if (normalised.length === 0 || normalised.length > MAX_EMAIL_LENGTH) return null;
  return `email:${createHash("sha256").update(normalised).digest("base64url").slice(0, 32)}`;
}

/** The pending two-factor sign-in's identifier, from the signed `two_factor` cookie. */
function twoFactorIdentifier(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (!part.slice(0, separator).trim().endsWith(".two_factor")) continue;
    let value: string;
    try {
      value = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      continue;
    }
    // `<identifier>.<signature>`; Better Auth checks the signature, this only finds the account.
    const dot = value.lastIndexOf(".");
    const identifier = dot === -1 ? value : value.slice(0, dot);
    if (identifier.length > 0 && identifier.length <= 200) return identifier;
  }
  return null;
}

/**
 * The account a two-factor code is being checked for: the user of the pending sign-in (the
 * `two_factor` cookie), or the signed-in user when a code is verified during enrolment. Keyed by
 * account, so starting a new sign-in does not buy more guesses.
 */
function byTwoFactorAccount(deps: ApiDeps) {
  return async (c: Context<ApiEnv>): Promise<string | null> => {
    const identifier = twoFactorIdentifier(c.req.header("cookie"));
    if (identifier) {
      const pending = await deps.db.verification.findFirst({
        where: { identifier },
        select: { value: true },
      });
      if (pending) return `user:${pending.value}`;
    }
    const userId = c.get("actor")?.userId;
    return userId ? `user:${userId}` : null;
  };
}

const byIp = (c: Context<ApiEnv>): string => `ip:${rateLimitIpKey(clientIp(c))}`;
/** A wrong password or code. A 429 from another limiter is not a guess. */
const isRejectedAttempt = (status: number): boolean => status >= 400 && status !== 429;

const TWO_FACTOR_VERIFY_PATHS: ReadonlySet<string> = new Set([
  "/two-factor/verify-totp",
  "/two-factor/verify-otp",
  "/two-factor/verify-backup-code",
]);
const EMAILED_LINK_PATHS: ReadonlySet<string> = new Set([
  "/sign-in/magic-link",
  "/forget-password",
  "/request-password-reset",
]);
const PASSWORD_RESET_PATHS: ReadonlySet<string> = new Set([
  "/forget-password",
  "/request-password-reset",
  "/reset-password",
]);

/** Runs limiters as nested middleware, so one that counts failures sees the final response. */
function chain(limiters: readonly MiddlewareHandler<ApiEnv>[]): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const run = async (index: number): Promise<void> => {
      const limiter = limiters[index];
      if (!limiter) return next();
      // A limiter that lets the request through returns whatever `next()` returned.
      const rejection: unknown = await limiter(c, () => run(index + 1));
      if (rejection instanceof Response) c.res = rejection;
    };
    await run(0);
    return undefined;
  };
}

/** The limits for `POST /api/auth/*`. Mount in front of `auth.handler`. */
export function createAuthGuard(deps: ApiDeps): MiddlewareHandler<ApiEnv> {
  const signInPerIp = rateLimit({ name: "auth:sign-in:ip", windowMs: MINUTE, max: 10, key: byIp });
  const signUpPerIp = rateLimit({ name: "auth:sign-up:ip", windowMs: HOUR, max: 20, key: byIp });
  const twoFactorPerIp = rateLimit({
    name: "auth:two-factor:ip",
    windowMs: MINUTE,
    max: 10,
    key: byIp,
  });
  const magicLinkPerIp = rateLimit({
    name: "auth:magic-link:ip",
    windowMs: HOUR,
    max: 10,
    key: byIp,
  });
  const resetPerIp = rateLimit({ name: "auth:reset:ip", windowMs: HOUR, max: 10, key: byIp });

  /** 10 wrong passwords per address in 15 minutes, whatever the caller's IP. */
  const signInPerEmail = failureLimit({
    name: "auth:sign-in:email",
    windowMs: 15 * MINUTE,
    max: 10,
    key: byEmail,
    isFailure: isRejectedAttempt,
  });
  /** 5 emailed links per address an hour, so nobody's mailbox can be flooded through us. */
  const linkPerEmail = failureLimit({
    name: "auth:link:email",
    windowMs: HOUR,
    max: 5,
    key: byEmail,
    isFailure: () => true,
  });
  /** 5 wrong codes per account in 15 minutes: the lockout the two-factor plugin lacks. */
  const twoFactorPerAccount = failureLimit({
    name: "auth:two-factor:account",
    windowMs: 15 * MINUTE,
    max: 5,
    key: byTwoFactorAccount(deps),
    isFailure: isRejectedAttempt,
  });

  const forPath = (path: string): MiddlewareHandler<ApiEnv>[] => {
    const limiters: MiddlewareHandler<ApiEnv>[] = [];
    if (path === "/sign-in/email") limiters.push(signInPerIp, signInPerEmail);
    if (path === "/sign-up/email") limiters.push(signUpPerIp);
    if (path.startsWith("/two-factor/")) limiters.push(twoFactorPerIp);
    if (TWO_FACTOR_VERIFY_PATHS.has(path)) limiters.push(twoFactorPerAccount);
    if (path === "/sign-in/magic-link") limiters.push(magicLinkPerIp);
    if (PASSWORD_RESET_PATHS.has(path)) limiters.push(resetPerIp);
    if (EMAILED_LINK_PATHS.has(path)) limiters.push(linkPerEmail);
    return limiters;
  };

  return async (c, next) => {
    if (c.req.method !== "POST") return next();
    const limiters = forPath(authPath(c));
    if (limiters.length === 0) return next();
    // The per-address limits read the address from a JSON body. Better Auth would also accept
    // a form-encoded one, which they could not see, so these endpoints take JSON and nothing else.
    const contentType = c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (contentType !== "application/json") {
      return c.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Send this request as application/json",
            requestId: c.get("requestId") ?? "req_unknown",
          },
        },
        415,
      );
    }
    return chain(limiters)(c, next);
  };
}
