/**
 * Host moderation of wishing-well and tribute-book entries (`/v1/events/{eventId}/well-entries...`).
 *
 * Route = validated input → service (`requireEventAccess` with `media:moderate`) → repository.
 */
import { createRoute, z } from "@hono/zod-openapi";
import {
  HostWellEntryListQuerySchema,
  HostWellEntryListSchema,
  HostWellEntrySchema,
  WellEntryModerateSchema,
} from "@managevent/validators";
import type { Context } from "hono";
import type { ApiDeps } from "../../lib/deps.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import type { ApiEnv } from "../../middleware/context.js";
import { WellService } from "./service.js";

const TAGS = ["Well"];

/** Loose on purpose: ids that are not real get the service's neutral 404. */
const EventIdParamSchema = z.object({ eventId: z.string().min(1).max(80) });
const EntryParamsSchema = EventIdParamSchema.extend({ entryId: z.string().min(1).max(80) });

function requestIp(c: Context<ApiEnv>): string | undefined {
  const ip = clientIp(c);
  return ip === "unknown" ? undefined : ip;
}

export const listWellEntriesRoute = createRoute({
  method: "get",
  path: "/v1/events/{eventId}/well-entries",
  tags: TAGS,
  summary: "List wishing-well or tribute-book entries, newest first",
  middleware: [RL.hostRead] as const,
  request: { params: EventIdParamSchema, query: HostWellEntryListQuerySchema },
  responses: {
    200: { description: "Entries", content: jsonContent(HostWellEntryListSchema) },
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

export const moderateWellEntryRoute = createRoute({
  method: "patch",
  path: "/v1/events/{eventId}/well-entries/{entryId}",
  tags: TAGS,
  summary: "Approve or reject an entry",
  middleware: [RL.hostWrite] as const,
  request: {
    params: EntryParamsSchema,
    body: { required: true, content: jsonContent(WellEntryModerateSchema) },
  },
  responses: {
    200: { description: "The moderated entry", content: jsonContent(HostWellEntrySchema) },
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

export const deleteWellEntryRoute = createRoute({
  method: "delete",
  path: "/v1/events/{eventId}/well-entries/{entryId}",
  tags: TAGS,
  summary: "Remove an entry",
  middleware: [RL.hostWrite] as const,
  request: { params: EntryParamsSchema },
  responses: {
    204: { description: "Removed" },
    ...errorResponses(401, 403, 404, 429),
  },
});

export function createWellRoutes(deps: ApiDeps) {
  const service = new WellService(deps);
  const router = createApiRouter();

  router.openapi(listWellEntriesRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const { moderation } = c.req.valid("query");
    return c.json(await service.list(c.get("actor"), eventId, moderation), 200);
  });

  router.openapi(moderateWellEntryRoute, async (c) => {
    const { eventId, entryId } = c.req.valid("param");
    const entry = await service.moderate(
      c.get("actor"),
      eventId,
      entryId,
      c.req.valid("json"),
      requestIp(c),
    );
    return c.json(entry, 200);
  });

  router.openapi(deleteWellEntryRoute, async (c) => {
    const { eventId, entryId } = c.req.valid("param");
    await service.remove(c.get("actor"), eventId, entryId, requestIp(c));
    return c.body(null, 204);
  });

  return router;
}
