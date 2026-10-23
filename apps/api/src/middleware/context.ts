/**
 * API middleware: Request ID, PII-redacted structured logging, rate limiting,
 * auth actor extraction, and unified error handling (`{ error: { code, message, details?, requestId } }`).
 */
import type { Context, MiddlewareHandler } from "hono";
import { AuthorizationError, type AuthActor } from "@managevent/auth";
import { redactForLog, redactUrl } from "@managevent/config";
import { generateUuidV7 } from "@managevent/db";
import type { Role } from "@managevent/types";
import { RoleEnum } from "@managevent/validators";
import { ZodError } from "zod";

export interface ApiEnv {
  Variables: {
    requestId: string;
    actor: AuthActor | null;
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

/**
 * Attaches a unique `X-Request-Id` header and context variable to every request.
 */
export function requestIdMiddleware(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const incoming = c.req.header("x-request-id")?.trim();
    const requestId = incoming && incoming.length > 0 ? incoming : `req_${generateUuidV7()}`;
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
 * Extracts `AuthActor` from session headers (`x-managevent-user-id`, `x-managevent-roles`, `x-managevent-org-id`)
 * or bearer/cookie session context.
 */
export function actorMiddleware(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const userId = c.req.header("x-managevent-user-id")?.trim();
    const rolesHeader = c.req.header("x-managevent-roles")?.trim();
    const orgId = c.req.header("x-managevent-org-id")?.trim();

    if (rolesHeader) {
      const roles: Role[] = [];
      for (const rawRole of rolesHeader.split(",")) {
        const parsed = RoleEnum.safeParse(rawRole.trim());
        if (parsed.success) {
          roles.push(parsed.data);
        }
      }
      if (roles.length > 0) {
        c.set("actor", {
          ...(userId ? { userId } : {}),
          ...(orgId ? { organisationId: orgId } : {}),
          roles,
        });
      } else {
        c.set("actor", null);
      }
    } else {
      c.set("actor", null);
    }

    await next();
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

  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip")?.trim() ??
      "127.0.0.1";
    const nowMs = Date.now();
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

  const message = err instanceof Error ? err.message : "Internal server error";
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
