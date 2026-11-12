/**
 * In-memory, per-process rate limiting (fixed windows).
 *
 * Buckets live in a scope object. `createApiApp` gives every app instance its own scope, so two
 * apps in one process (tests) never share counters; routers used without the app share one
 * process-wide scope. `CreateApiAppOptions.disableRateLimits` turns every limiter into a no-op.
 *
 * The client address comes from `client-ip.ts`, never from a header the caller controls. A caller
 * whose address cannot be established shares one bucket (`"unknown"`). Known limit: counters are
 * not shared between API processes.
 */
import { createHash } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import type { ApiEnv } from "../middleware/context.js";
import {
  type ClientIpConfig,
  clientIpConfigFromEnv,
  rateLimitIpKey,
  resolveClientIp,
  UNKNOWN_CLIENT_IP,
} from "./client-ip.js";

interface Bucket {
  count: number;
  resetAtMs: number;
}

/** Holder for one app's counters. */
export interface RateLimitScope {
  readonly stores: Map<string, Map<string, Bucket>>;
}

export function createRateLimitScope(): RateLimitScope {
  return { stores: new Map() };
}

const processScope = createRateLimitScope();

const MAX_KEYS_PER_STORE = 50_000;

function getStore(c: Context<ApiEnv>, name: string): Map<string, Bucket> {
  const scope = c.get("rateLimit")?.scope ?? processScope;
  let store = scope.stores.get(name);
  if (!store) {
    store = new Map();
    scope.stores.set(name, store);
  }
  return store;
}

function prune(store: Map<string, Bucket>, nowMs: number): void {
  if (store.size < MAX_KEYS_PER_STORE) return;
  for (const [key, bucket] of store) {
    if (nowMs >= bucket.resetAtMs) store.delete(key);
  }
  // Still full of live keys: drop the oldest insertions rather than grow without bound.
  if (store.size >= MAX_KEYS_PER_STORE) {
    let toDrop = Math.ceil(MAX_KEYS_PER_STORE / 10);
    for (const key of store.keys()) {
      if (toDrop <= 0) break;
      store.delete(key);
      toDrop -= 1;
    }
  }
}

function isDisabled(c: Context<ApiEnv>): boolean {
  return c.get("rateLimit")?.disabled === true;
}

function tooManyRequests(c: Context<ApiEnv>, resetAtMs: number, nowMs: number): Response {
  const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
  c.header("retry-after", String(retryAfterSec));
  return c.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
        requestId: c.get("requestId") ?? "req_unknown",
      },
    },
    429,
  );
}

/** The address of the TCP connection, when the app runs on `@hono/node-server`. */
function socketAddress(c: Context<ApiEnv>): string | undefined {
  const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return env?.incoming?.socket?.remoteAddress;
}

/**
 * The caller's address from a source the caller cannot forge (see `client-ip.ts`), else
 * `"unknown"`. `createApiApp` resolves it once per request; routers mounted without the app
 * resolve it here from the environment configuration.
 */
export function clientIp(c: Context<ApiEnv>): string {
  const resolved = c.get("clientIp");
  if (resolved !== undefined) return resolved ?? UNKNOWN_CLIENT_IP;
  return (
    resolveClientIp(c.req.raw.headers, socketAddress(c), clientIpConfigFromEnv()) ??
    UNKNOWN_CLIENT_IP
  );
}

/** Resolves the caller's address once and keeps it on the context for `clientIp`. */
export function clientIpMiddleware(config: ClientIpConfig): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    c.set("clientIp", resolveClientIp(c.req.raw.headers, socketAddress(c), config));
    await next();
  };
}

/**
 * Allows `max` requests per `windowMs` for each key. A `null` key skips the limiter for that
 * request (for example a per-user limiter on a request with no session, which is rejected later).
 */
export function rateLimit(o: {
  name: string;
  windowMs: number;
  max: number;
  key: (c: Context<ApiEnv>) => string | null;
}): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    if (isDisabled(c)) return next();
    const key = o.key(c);
    if (key === null) return next();

    const nowMs = Date.now();
    const store = getStore(c, o.name);
    const bucket = store.get(key);
    if (!bucket || nowMs >= bucket.resetAtMs) {
      prune(store, nowMs);
      store.set(key, { count: 1, resetAtMs: nowMs + o.windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > o.max) return tooManyRequests(c, bucket.resetAtMs, nowMs);
    return next();
  };
}

/** Runs several limiters in order; the first one that rejects wins. */
function all(...limiters: MiddlewareHandler<ApiEnv>[]): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    for (const limiter of limiters) {
      let passed = false;
      const rejection = await limiter(c, async () => {
        passed = true;
      });
      if (!passed) return rejection ?? undefined;
    }
    return next();
  };
}

/**
 * Allows `max` FAILED requests per `windowMs` for each key; after that every request with the key
 * gets 429 until the window ends. Used where only failures should count: wrong links (enumeration),
 * wrong passwords, wrong two-factor codes.
 *
 * A request takes a slot before it runs and gives it back when it turns out not to be a failure.
 * Checking first and counting afterwards would let any number of concurrent failures through.
 * A `null` key skips the guard for that request.
 */
export function failureLimit(o: {
  name: string;
  windowMs: number;
  max: number;
  key: (c: Context<ApiEnv>) => string | null | Promise<string | null>;
  isFailure: (status: number) => boolean;
}): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    if (isDisabled(c)) return next();
    const key = await o.key(c);
    if (key === null) return next();

    const store = getStore(c, o.name);
    const nowMs = Date.now();
    let bucket = store.get(key);
    if (!bucket || nowMs >= bucket.resetAtMs) {
      prune(store, nowMs);
      bucket = { count: 0, resetAtMs: nowMs + o.windowMs };
      store.set(key, bucket);
    }
    if (bucket.count >= o.max) return tooManyRequests(c, bucket.resetAtMs, nowMs);
    bucket.count += 1;

    let failed = true;
    try {
      await next();
      failed = o.isFailure(c.res.status);
    } finally {
      if (!failed && store.get(key) === bucket && bucket.count > 0) bucket.count -= 1;
    }
    return undefined;
  };
}

const isMissingOrGone = (status: number): boolean => status === 404 || status === 410;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const byIp = (c: Context<ApiEnv>): string => `ip:${rateLimitIpKey(clientIp(c))}`;

/** Per signed-in user; anonymous callers of a host route are limited by IP instead. */
const byUser = (c: Context<ApiEnv>): string => {
  const userId = c.get("actor")?.userId;
  return userId ? `user:${userId}` : byIp(c);
};

/** Per guest link. The token is hashed so raw tokens are not held as map keys. */
const byGuestLink = (c: Context<ApiEnv>): string | null => {
  const eventSlug = c.req.param("eventSlug");
  const guestToken = c.req.param("guestToken");
  if (!eventSlug || !guestToken) return null;
  // Normalised exactly as `GuestSiteService.resolveLink` does, so every spelling the service
  // accepts for one link (case, surrounding whitespace) lands in the same bucket.
  return createHash("sha256")
    .update(`${eventSlug.trim().toLowerCase()}/${guestToken.trim().toLowerCase()}`)
    .digest("base64url")
    .slice(0, 32);
};

const byEvent = (c: Context<ApiEnv>): string | null => {
  const eventId = c.req.param("eventId");
  return eventId ? `event:${eventId}` : null;
};

/**
 * The agreed buckets. Use as route middleware, e.g.
 * `createRoute({ ..., middleware: [RL.guestRead, RL.enumGuard] as const })` or `router.use(path, RL.hostRead)`.
 */
export const RL = {
  /** 120/min per IP + 60/min per slug+token. */
  guestRead: all(
    rateLimit({ name: "guestRead:ip", windowMs: MINUTE, max: 120, key: byIp }),
    rateLimit({ name: "guestRead:link", windowMs: MINUTE, max: 60, key: byGuestLink }),
  ),
  /** 20/min per IP + 10/min per slug+token. */
  guestWrite: all(
    rateLimit({ name: "guestWrite:ip", windowMs: MINUTE, max: 20, key: byIp }),
    rateLimit({ name: "guestWrite:link", windowMs: MINUTE, max: 10, key: byGuestLink }),
  ),
  /** After 30 404/410 responses per IP in 10 minutes, 429 for the rest of the window. */
  enumGuard: failureLimit({
    name: "enumGuard",
    windowMs: 10 * MINUTE,
    max: 30,
    key: byIp,
    isFailure: isMissingOrGone,
  }),
  /** 600/min per user. */
  hostRead: rateLimit({ name: "hostRead", windowMs: MINUTE, max: 600, key: byUser }),
  /** 120/min per user. */
  hostWrite: rateLimit({ name: "hostWrite", windowMs: MINUTE, max: 120, key: byUser }),
  /** 10/hour per event. */
  bulk: rateLimit({ name: "bulk", windowMs: HOUR, max: 10, key: byEvent }),
  /** 10/hour per user. */
  checkout: rateLimit({ name: "checkout", windowMs: HOUR, max: 10, key: byUser }),
  /** 600/min per user. */
  scan: rateLimit({ name: "scan", windowMs: MINUTE, max: 600, key: byUser }),
  /** 60/min per IP. */
  publicMisc: rateLimit({ name: "publicMisc", windowMs: MINUTE, max: 60, key: byIp }),
} as const;
