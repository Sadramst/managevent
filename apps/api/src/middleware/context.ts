/**
 * API middleware: Request ID, PII-redacted structured logging, rate limiting,
 * auth actor extraction, and unified error handling (`{ error: { code, message, details?, requestId } }`).
 */
import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { AuthorizationError, type AuthActor } from "@managevent/auth";
import { redactForLog, redactUrl } from "@managevent/config";
import { generateUuidV7 } from "@managevent/db";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { rateLimitIpKey } from "../lib/client-ip.js";
import { ApiProblem } from "../lib/errors.js";
import { clientIp, type RateLimitScope } from "../lib/rate-limit.js";

export interface ApiEnv {
  Variables: {
    requestId: string;
    actor: AuthActor | null;
    /** Set by `createApiApp`: this app's rate-limit counters, or `disabled` to bypass them. */
    rateLimit?: { disabled: boolean; scope: RateLimitScope };
    /**
     * Set by `createApiApp`: the caller's address from a trustworthy source (`lib/client-ip.ts`),
     * or null when there is none. Read it through `clientIp(c)`.
     */
    clientIp?: string | null;
  };
}

export interface StructuredLogEntry {
  level: "info" | "warn" | "error";
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  [key: string]: unknown;
}

/** Caller-supplied request ids must be short and header/log safe. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Attaches a unique `X-Request-Id` header and context variable to every request.
 */
export function requestIdMiddleware(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const incoming = c.req.header("x-request-id")?.trim();
    const requestId =
      incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : `req_${generateUuidV7()}`;
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  };
}

/**
 * Structured request logger that redacts guest tokens and PII (`packages/config/redact`).
 * Never logs request bodies on guest, RSVP, auth, or payment routes.
 */
export function redactedLoggerMiddleware(
  sink?: (entry: Record<string, unknown>) => void,
): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const start = Date.now();
    await next();
    const durationMs = Date.now() - start;
    const rawEntry: StructuredLogEntry = {
      level: c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info",
      requestId: c.get("requestId") ?? "req_unknown",
      method: c.req.method,
      path: redactUrl(c.req.path),
      status: c.res.status,
      durationMs,
    };
    const sanitized = redactForLog(rawEntry) as Record<string, unknown>;
    if (sink) {
      sink(sanitized);
    } else if (process.env.NODE_ENV !== "test") {
      console.info(JSON.stringify(sanitized));
    }
  };
}

/**
 * Resolves identity from a verified session. Caller-supplied identity and role
 * headers are never trusted.
 */
export function actorMiddleware(
  resolveActor: (request: Request) => Promise<AuthActor | null>,
): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    c.set("actor", await resolveActor(c.req.raw));
    await next();
  };
}

const SAFE_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence in depth for cookie-authenticated API calls: a state-changing request that carries
 * a session cookie AND an `Origin` header must come from an allowed origin.
 *
 * Requests without a cookie (bearer tokens, guest-token routes, webhooks) and requests without an
 * `Origin` (server-to-server calls from the Next apps) are not affected. Mount on `/v1/*`.
 */
export function originGuard(
  allowedOrigins: readonly string[] | (() => readonly string[]),
): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next();
    const origin = c.req.header("origin");
    if (!origin || !c.req.header("cookie")) return next();
    const allowed = typeof allowedOrigins === "function" ? allowedOrigins() : allowedOrigins;
    if (allowed.includes(origin)) return next();
    return c.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Requests from this origin are not allowed",
          requestId: c.get("requestId") ?? `req_${generateUuidV7()}`,
        },
      },
      403,
    );
  };
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

/**
 * In-memory sliding-window rate limiter per client IP.
 */
export function createRateLimiter(options: RateLimiterOptions): MiddlewareHandler<ApiEnv> {
  const hits = new Map<string, { count: number; resetAtMs: number }>();
  let lastPruneMs = 0;

  return async (c, next) => {
    if (c.get("rateLimit")?.disabled) return next();
    // Never a caller-supplied header: see `lib/client-ip.ts`.
    const ip = rateLimitIpKey(clientIp(c));
    const nowMs = Date.now();
    if (nowMs - lastPruneMs >= options.windowMs) {
      lastPruneMs = nowMs;
      for (const [key, entry] of hits) {
        if (nowMs >= entry.resetAtMs) {
          hits.delete(key);
        }
      }
    }
    const current = hits.get(ip);

    if (!current || nowMs >= current.resetAtMs) {
      hits.set(ip, { count: 1, resetAtMs: nowMs + options.windowMs });
    } else {
      current.count += 1;
      if (current.count > options.maxRequests) {
        const requestId = c.get("requestId") ?? `req_${generateUuidV7()}`;
        return c.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests. Please try again shortly.",
              requestId,
            },
          },
          429,
        );
      }
    }

    return next();
  };
}

/**
 * Formats an error into the canonical Managevent API error envelope:
 * `{ error: { code, message, details?, requestId } }`.
 */
export function handleApiError(err: unknown, c: Context<ApiEnv>): Response {
  const requestId = c.get("requestId") ?? `req_${generateUuidV7()}`;

  if (err instanceof ApiProblem) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
          requestId,
        },
      },
      err.status as ContentfulStatusCode,
    );
  }

  if (err instanceof AuthorizationError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          requestId,
        },
      },
      err.statusCode,
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: err.flatten(),
          requestId,
        },
      },
      400,
    );
  }

  if (err instanceof SyntaxError) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Malformed JSON request body",
          requestId,
        },
      },
      400,
    );
  }

  if (err instanceof HTTPException) {
    const status = err.status;
    return c.json(
      {
        error: {
          code: status === 400 ? "BAD_REQUEST" : `HTTP_${status}`,
          message: status >= 500 ? "Internal server error" : err.message || "Request failed",
          requestId,
        },
      },
      status,
    );
  }

  const message = "Internal server error";
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message,
        requestId,
      },
    },
    500,
  );
}
