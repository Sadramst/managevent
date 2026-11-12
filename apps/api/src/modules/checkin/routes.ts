/**
 * Door check-in (`/v1/events/{eventId}/check-in...`).
 *
 * Route = validated input → service (`requireEventAccess` with `checkin:scan`, then the
 * `qrPassesAndCheckin` entitlement) → repository. No Prisma here.
 */
import { createRoute, z } from "@hono/zod-openapi";
import {
  CheckInRosterSchema,
  CheckInScanResultSchema,
  CheckInScanSchema,
} from "@managevent/validators";
import type { ApiDeps } from "../../lib/deps.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import { CheckInService } from "./service.js";

const TAGS = ["Check-in"];

/** Loose on purpose: an id that is not a real event id gets the service's neutral 404. */
const EventIdParamSchema = z.object({ eventId: z.string().min(1).max(80) });

export const getCheckInRosterRoute = createRoute({
  method: "get",
  path: "/v1/events/{eventId}/check-in",
  tags: TAGS,
  summary: "The door list: every guest with RSVP status and check-in time",
  middleware: [RL.scan] as const,
  request: { params: EventIdParamSchema },
  responses: {
    200: { description: "Door list", content: jsonContent(CheckInRosterSchema) },
    ...errorResponses(401, 403, 404, 429),
  },
});

export const postCheckInScanRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/check-in/scans",
  tags: TAGS,
  summary: "Check a guest in by QR pass or by hand (idempotent on clientUuid)",
  middleware: [RL.scan] as const,
  request: {
    params: EventIdParamSchema,
    body: { required: true, content: jsonContent(CheckInScanSchema) },
  },
  responses: {
    200: {
      description:
        "The scan outcome, or the stored outcome of an earlier scan with this clientUuid",
      content: jsonContent(CheckInScanResultSchema),
    },
    ...errorResponses(400, 401, 403, 404, 409, 429),
  },
});

export function createCheckInRoutes(deps: ApiDeps) {
  const service = new CheckInService(deps);
  const router = createApiRouter();

  router.openapi(getCheckInRosterRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const ip = clientIp(c);
    const roster = await service.getRoster(
      c.get("actor"),
      eventId,
      ip === "unknown" ? undefined : ip,
    );
    return c.json(roster, 200);
  });

  router.openapi(postCheckInScanRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const ip = clientIp(c);
    const result = await service.scan(
      c.get("actor"),
      eventId,
      c.req.valid("json"),
      ip === "unknown" ? undefined : ip,
    );
    return c.json(result, 200);
  });

  return router;
}
