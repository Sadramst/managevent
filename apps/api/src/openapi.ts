/**
 * OpenAPI 3.1 specification generator for `apps/api`.
 */
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { HealthResponseSchema } from "@managevent/validators";
import type { ApiEnv } from "./middleware/context.js";
import { getLeadsRoute, postLeadRoute } from "./modules/crm/routes.js";

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "API health check",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

export const OPENAPI_DOCUMENT_CONFIG = {
  openapi: "3.1.0",
  info: {
    title: "Managevent API",
    version: "0.1.0",
    description:
      "Core REST API for Managevent (Sydney ap-southeast-2). Contracts defined in @managevent/validators.",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local development server",
    },
    {
      url: "https://api.managevent.com.au",
      description: "Sydney production API (ap-southeast-2)",
    },
  ],
};

export interface OpenApiSpecDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, unknown>>;
  components?: Record<string, unknown>;
}

/**
 * Generates the complete OpenAPI 3.1 JSON document for `apps/api` without starting an HTTP listener.
 * Used by `GET /openapi.json` and `@managevent/api-client` code generation.
 */
export function generateOpenApiSpec(): OpenApiSpecDocument {
  const specApp = new OpenAPIHono<ApiEnv>();
  specApp.openapi(healthRoute, (c) =>
    c.json(
      {
        status: "ok" as const,
        service: "managevent-api" as const,
        region: "syd",
        timestamp: new Date().toISOString(),
      },
      200,
    ),
  );
  specApp.openapi(postLeadRoute, (c) => c.json({} as never, 201));
  specApp.openapi(getLeadsRoute, (c) => c.json({ items: [] }, 200));

  return specApp.getOpenAPIDocument(OPENAPI_DOCUMENT_CONFIG) as unknown as OpenApiSpecDocument;
}
