/**
 * Host responses (`/v1/events/{eventId}/responses...`).
 *
 * Route = validated input → service (which authorises through `requireEventAccess`) →
 * repository. No Prisma here.
 */
import { createRoute, z } from "@hono/zod-openapi";
import { DietaryMatrixSchema, ResponsesSummarySchema } from "@managevent/validators";
import type { ApiDeps } from "../../lib/deps.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import { createResponsesService } from "./service.js";

const TAGS = ["Responses"];

/** Loose on purpose: an unknown id gets the service's neutral 404. */
const EventParamsSchema = z.object({ eventId: z.string().min(1).max(80) });

export const getResponsesRoute = createRoute({
  method: "get",
  path: "/v1/events/{eventId}/responses",
  tags: TAGS,
  summary: "RSVP totals, dietary counts, song requests and messages for the host",
  middleware: [RL.hostRead] as const,
  request: { params: EventParamsSchema },
  responses: {
    200: { description: "Responses summary", content: jsonContent(ResponsesSummarySchema) },
    ...errorResponses(401, 403, 404, 429),
  },
});

export const getDietaryRoute = createRoute({
  method: "get",
  path: "/v1/events/{eventId}/responses/dietary",
  tags: TAGS,
  summary: "Per-guest dietary and allergy detail (health information; needs health:read)",
  middleware: [RL.hostRead] as const,
  request: { params: EventParamsSchema },
  responses: {
    200: { description: "Dietary matrix", content: jsonContent(DietaryMatrixSchema) },
    ...errorResponses(401, 403, 404, 429),
  },
});

export function createResponsesRoutes(deps: ApiDeps) {
  const router = createApiRouter();
  const service = createResponsesService(deps);

  router.openapi(getResponsesRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const ip = clientIp(c);
    const summary = await service.getSummary(
      { actor: c.get("actor"), ...(ip === "unknown" ? {} : { ip }) },
      eventId,
    );
    // Carries dietary counts for callers who may read health information.
    c.header("cache-control", "no-store");
    return c.json(summary, 200);
  });

  router.openapi(getDietaryRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const ip = clientIp(c);
    const matrix = await service.getDietary(
      { actor: c.get("actor"), ...(ip === "unknown" ? {} : { ip }) },
      eventId,
    );
    // Health information must not sit in a shared cache.
    c.header("cache-control", "no-store");
    return c.json(matrix, 200);
  });

  return router;
}
