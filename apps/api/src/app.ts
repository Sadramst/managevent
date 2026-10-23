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
import { createManageventAuth, prismaAdapter, type AuthActor } from "@managevent/auth";
import { db } from "@managevent/db";
import { cors } from "hono/cors";
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
  resolveActor?: (request: Request) => Promise<AuthActor | null>;
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
  const auth = createManageventAuth({ database: prismaAdapter(db, { provider: "postgresql" }) });
  app.use("*", cors({ origin: "https://www.managevent.com.au", credentials: true }));
  app.use(
    "*",
    actorMiddleware(
      options.resolveActor ??
        (async (request) => {
          if (!request.headers.has("cookie") && !request.headers.has("authorization")) return null;
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session) return null;
          const user = await db.user.findUnique({ where: { id: session.user.id } });
          if (!user || user.deletedAt) return null;
          if (
            user.roles.some((role) => role === "PLANNER_STAFF" || role === "SUPER_ADMIN") &&
            !user.twoFactorEnabled
          )
            return null;
          return { userId: user.id, roles: user.roles };
        }),
    ),
  );

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
  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    return auth.handler(c.req.raw);
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
