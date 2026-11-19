/**
 * Hono application factory (`apps/api`).
 *
 * Mounts:
 * - `GET /health`
 * - `ALL /api/auth/*` (Better Auth self-hosted mount per `ADR-0005`)
 * - every module router under `/v1` (see `routers.ts`)
 * - `GET /openapi.json`
 */
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthActor } from "@managevent/auth";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { createApiAuth, createSessionActorResolver } from "./lib/auth.js";
import { createAuthGuard, withTrustedClientIp } from "./lib/auth-guard.js";
import { type ClientIpConfig, clientIpConfigFromEnv } from "./lib/client-ip.js";
import { type ApiDeps, createDefaultDeps } from "./lib/deps.js";
import { getTrustedOrigins } from "./lib/env.js";
import { clientIp, clientIpMiddleware, createRateLimitScope } from "./lib/rate-limit.js";
import {
  actorMiddleware,
  type ApiEnv,
  createRateLimiter,
  handleApiError,
  originGuard,
  type RateLimiterOptions,
  redactedLoggerMiddleware,
  requestIdMiddleware,
} from "./middleware/context.js";
import type { LeadService } from "./modules/crm/service.js";
import { healthRoute, OPENAPI_DOCUMENT_CONFIG } from "./openapi.js";
import { mountApiRouters } from "./routers.js";

const AUTH_BODY_LIMIT_BYTES = 16 * 1024;
const DEFAULT_API_BODY_LIMIT_BYTES = 256 * 1024;
const WEBHOOK_BODY_LIMIT_BYTES = 512 * 1024;
const CSV_IMPORT_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

export interface CreateApiAppOptions {
  resolveActor?: (request: Request) => Promise<AuthActor | null>;
  leadService?: LeadService;
  rateLimit?: RateLimiterOptions;
  logSink?: (entry: Record<string, unknown>) => void;
  /** Overrides for the shared dependencies (database client, job queue, clock). */
  deps?: Partial<ApiDeps>;
  /** Turns every rate limiter into a no-op. For tests only. */
  disableRateLimits?: boolean;
  /**
   * Where the client address may be taken from. Defaults to the environment
   * (`API_PROXY_SECRET`, `TRUSTED_CLIENT_IP_HEADER`); see `lib/client-ip.ts`.
   */
  clientIp?: Partial<ClientIpConfig>;
}

export function createApiApp(options: CreateApiAppOptions = {}) {
  const deps = createDefaultDeps(options.deps);
  const auth = createApiAuth(deps);
  const trustedOrigins = getTrustedOrigins();
  const rateLimitState = {
    disabled: options.disableRateLimits === true,
    scope: createRateLimitScope(),
  };
  const clientIpConfig: ClientIpConfig = { ...clientIpConfigFromEnv(), ...options.clientIp };

  const app = new OpenAPIHono<ApiEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const requestId = c.get("requestId") ?? "req_unknown";
        return c.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Request validation failed",
              details: result.error.flatten(),
              requestId,
            },
          },
          400,
        );
      }
      return undefined;
    },
  });

  app.use("*", requestIdMiddleware());
  app.use("*", redactedLoggerMiddleware(options.logSink));
  // Defence-in-depth security headers on every API response, independent of reverse proxy config.
  app.use("*", async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "no-referrer");
    c.header("Cross-Origin-Resource-Policy", "same-site");
    if (
      !c.res.headers.has("Cache-Control") &&
      (c.req.path.startsWith("/api/auth/") || c.req.path.startsWith("/v1/"))
    ) {
      c.header("Cache-Control", "no-store");
    }
  });
  app.use("*", async (c, next) => {
    c.set("rateLimit", rateLimitState);
    await next();
  });
  // The caller's address, from a source the caller cannot forge. Rate limits, consent records
  // and audit rows all read it through `clientIp(c)`.
  app.use("*", clientIpMiddleware(clientIpConfig));

  // Browsers reach the API through each web app's same-origin proxy, so CORS and the origin
  // guard are defence in depth: only the trusted web origins may send credentialed requests.
  app.use(
    "*",
    cors({
      origin: (origin) => (trustedOrigins.includes(origin) ? origin : null),
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["content-type", "authorization", "idempotency-key", "x-request-id"],
      exposeHeaders: ["x-request-id", "retry-after", "content-disposition"],
      maxAge: 600,
    }),
  );
  app.use("/v1/*", originGuard(trustedOrigins));

  // Cap request body sizes before parsing JSON/CSV to prevent memory exhaustion DoS.
  const payloadTooLarge = (c: { get: (k: "requestId") => string | undefined; json: (body: unknown, status: 413) => Response }) =>
    c.json(
      {
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "The request body is too large",
          requestId: c.get("requestId") ?? "req_unknown",
        },
      },
      413,
    );
  const authBodyLimit = bodyLimit({ maxSize: AUTH_BODY_LIMIT_BYTES, onError: payloadTooLarge });
  const defaultBodyLimit = bodyLimit({
    maxSize: DEFAULT_API_BODY_LIMIT_BYTES,
    onError: payloadTooLarge,
  });
  const webhookBodyLimit = bodyLimit({
    maxSize: WEBHOOK_BODY_LIMIT_BYTES,
    onError: payloadTooLarge,
  });
  const csvImportBodyLimit = bodyLimit({
    maxSize: CSV_IMPORT_BODY_LIMIT_BYTES,
    onError: payloadTooLarge,
  });
  app.use("/api/auth/*", authBodyLimit);
  app.use("/v1/*", (c, next) => {
    if (c.req.path.endsWith("/guests/import")) return csvImportBodyLimit(c, next);
    if (c.req.path === "/v1/webhooks/stripe") return webhookBodyLimit(c, next);
    return defaultBodyLimit(c, next);
  });

  app.use("*", actorMiddleware(options.resolveActor ?? createSessionActorResolver(deps, auth)));

  // Rate limit the public lead form (per IP). Module routers bring their own `RL` buckets.
  const rateLimiter = createRateLimiter(options.rateLimit ?? { windowMs: 60_000, maxRequests: 60 });
  app.use("/v1/leads", rateLimiter);

  // Health endpoint
  app.openapi(healthRoute, (c) => {
    return c.json(
      {
        status: "ok" as const,
        service: "managevent-api" as const,
        region: "syd",
        timestamp: new Date().toISOString(),
      },
      200,
    );
  });

  // Better Auth mount (`/api/auth/*`), behind the API's own abuse limits. Better Auth is given
  // the client address the API resolved, never one read from a request header.
  app.on(["GET", "POST"], "/api/auth/*", createAuthGuard(deps), async (c) => {
    return auth.handler(withTrustedClientIp(c.req.raw, clientIp(c)));
  });

  // Module routers (`/v1/...`)
  mountApiRouters(app, deps, options.leadService ? { leadService: options.leadService } : {});

  // OpenAPI 3.1 JSON endpoint — exposed only outside production so internal routes are not
  // enumerated by unauthenticated internet scanners.
  if (process.env.NODE_ENV !== "production") {
    app.doc31("/openapi.json", OPENAPI_DOCUMENT_CONFIG);
  }

  // 404 handler in standard error envelope
  app.notFound((c) => {
    const requestId = c.get("requestId") ?? "req_unknown";
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: `Route ${c.req.method} ${c.req.path} not found`,
          requestId,
        },
      },
      404,
    );
  });

  // Global error handler
  app.onError((err, c) => handleApiError(err, c));

  return app;
}
