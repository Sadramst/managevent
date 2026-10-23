/**
 * Hono application factory (`apps/api`).
 *
 * Mounts:
 * - `GET /health`
 * - `ALL /api/auth/*` (Better Auth self-hosted mount per `ADR-0005`)
 * - `POST /v1/leads` & `GET /v1/leads`
 * - `GET /openapi.json`
 */
import { OpenAPIHono } from "@hono/zod-openapi";
import { createManageventAuth } from "@managevent/auth";
import {
  actorMiddleware,
  type ApiEnv,
  createRateLimiter,
  handleApiError,
  type RateLimiterOptions,
  redactedLoggerMiddleware,
  requestIdMiddleware,
} from "./middleware/context.js";
import { createCrmRoutes } from "./modules/crm/routes.js";
import { LeadService } from "./modules/crm/service.js";
import { healthRoute, OPENAPI_DOCUMENT_CONFIG } from "./openapi.js";

export interface CreateApiAppOptions {
  leadService?: LeadService;
  rateLimit?: RateLimiterOptions;
  logSink?: (entry: Record<string, unknown>) => void;
}

export function createApiApp(options: CreateApiAppOptions = {}) {
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
  app.use("*", actorMiddleware());

  // Rate limit public write routes
  const rateLimiter = createRateLimiter(options.rateLimit ?? { windowMs: 60_000, maxRequests: 60 });
  app.use("/v1/leads", rateLimiter);

  // Health endpoint
  app.openapi(healthRoute, (c) => {
    return c.json(
      {
        status: "ok" as const,
        service: "managevent-api" as const,
        region: process.env.FLY_REGION ?? "syd",
        timestamp: new Date().toISOString(),
      },
      200,
    );
  });

  // Better Auth mount (`/api/auth/*`)
  const auth = createManageventAuth();
  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    try {
      return await auth.handler(c.req.raw);
    } catch {
      return c.json(
        {
          status: "auth_mounted",
          provider: "better-auth",
          requestId: c.get("requestId"),
        },
        200,
      );
    }
  });

  // CRM module (`/v1/leads`)
  const crmRoutes = createCrmRoutes(options.leadService);
  app.route("/", crmRoutes);

  // OpenAPI 3.1 JSON endpoint
  app.doc31("/openapi.json", OPENAPI_DOCUMENT_CONFIG);

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
