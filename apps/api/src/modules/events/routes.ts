/**
 * Host events and invitation editing (`/v1/events...`).
 *
 * Route = validated input → service (which authorises through `requireEventAccess` /
 * `requirePermission`) → repository. No Prisma here.
 */
import { createRoute, z } from "@hono/zod-openapi";
import {
  HostEventCreateSchema,
  HostEventDetailSchema,
  HostEventListSchema,
  HostEventUpdateSchema,
  HostInvitationUpdateSchema,
} from "@managevent/validators";
import type { Context } from "hono";
import type { ApiDeps } from "../../lib/deps.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import type { ApiEnv } from "../../middleware/context.js";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  publishInvitation,
  type RequestMeta,
  unpublishInvitation,
  updateEvent,
  updateInvitation,
} from "./service.js";

const TAGS = ["Events"];

/**
 * Deliberately loose: an id that is not a real event id is answered by the service with the same
 * neutral 404 as an event the caller may not see.
 */
export const EventIdParamSchema = z.object({ eventId: z.string().min(1).max(80) });

/** What the audit trail records about the request itself. */
export function requestMeta(c: Context<ApiEnv>): RequestMeta {
  const ip = clientIp(c);
  return ip === "unknown" ? {} : { ip };
}

const eventDetailResponse = {
  description: "The event with its invitation",
  content: jsonContent(HostEventDetailSchema),
} as const;

export const listEventsRoute = createRoute({
  method: "get",
  path: "/v1/events",
  tags: TAGS,
  summary: "List the events the signed-in host owns or co-hosts",
  middleware: [RL.hostRead] as const,
  responses: {
    200: { description: "Events, newest first", content: jsonContent(HostEventListSchema) },
    ...errorResponses(401, 429),
  },
});

export const createEventRoute = createRoute({
  method: "post",
  path: "/v1/events",
  tags: TAGS,
  summary: "Create an event with its draft invitation",
  middleware: [RL.hostWrite] as const,
  request: {
    body: { required: true, content: jsonContent(HostEventCreateSchema) },
  },
  responses: {
    201: eventDetailResponse,
    ...errorResponses(400, 401, 403, 429),
  },
});

export const getEventRoute = createRoute({
  method: "get",
  path: "/v1/events/{eventId}",
  tags: TAGS,
  summary: "Get one event with its invitation",
  middleware: [RL.hostRead] as const,
  request: { params: EventIdParamSchema },
  responses: {
    200: eventDetailResponse,
    ...errorResponses(401, 404, 429),
  },
});

export const updateEventRoute = createRoute({
  method: "patch",
  path: "/v1/events/{eventId}",
  tags: TAGS,
  summary: "Change the event title, date, time or time zone",
  middleware: [RL.hostWrite] as const,
  request: {
    params: EventIdParamSchema,
    body: { required: true, content: jsonContent(HostEventUpdateSchema) },
  },
  responses: {
    200: eventDetailResponse,
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

export const deleteEventRoute = createRoute({
  method: "delete",
  path: "/v1/events/{eventId}",
  tags: TAGS,
  summary: "Delete an event (owner only). Every guest link stops working.",
  middleware: [RL.hostWrite] as const,
  request: { params: EventIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    ...errorResponses(401, 403, 404, 429),
  },
});

export const updateInvitationRoute = createRoute({
  method: "patch",
  path: "/v1/events/{eventId}/invitation",
  tags: TAGS,
  summary: "Change the invitation design, content or settings",
  middleware: [RL.hostWrite] as const,
  request: {
    params: EventIdParamSchema,
    body: { required: true, content: jsonContent(HostInvitationUpdateSchema) },
  },
  responses: {
    200: eventDetailResponse,
    ...errorResponses(400, 401, 403, 404, 409, 429),
  },
});

export const publishInvitationRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/invitation/publish",
  tags: TAGS,
  summary: "Publish the invitation so guest links open",
  middleware: [RL.hostWrite] as const,
  request: { params: EventIdParamSchema },
  responses: {
    200: eventDetailResponse,
    ...errorResponses(401, 403, 404, 422, 429),
  },
});

export const unpublishInvitationRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/invitation/unpublish",
  tags: TAGS,
  summary: "Take the invitation offline",
  middleware: [RL.hostWrite] as const,
  request: { params: EventIdParamSchema },
  responses: {
    200: eventDetailResponse,
    ...errorResponses(401, 403, 404, 429),
  },
});

export function createEventRoutes(deps: ApiDeps) {
  const router = createApiRouter();

  router.openapi(listEventsRoute, async (c) => {
    return c.json(await listEvents(deps, c.get("actor")), 200);
  });

  router.openapi(createEventRoute, async (c) => {
    const detail = await createEvent(deps, c.get("actor"), c.req.valid("json"), requestMeta(c));
    return c.json(detail, 201);
  });

  router.openapi(getEventRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    return c.json(await getEvent(deps, c.get("actor"), eventId), 200);
  });

  router.openapi(updateEventRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const detail = await updateEvent(
      deps,
      c.get("actor"),
      eventId,
      c.req.valid("json"),
      requestMeta(c),
    );
    return c.json(detail, 200);
  });

  router.openapi(deleteEventRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    await deleteEvent(deps, c.get("actor"), eventId, requestMeta(c));
    return c.body(null, 204);
  });

  router.openapi(updateInvitationRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const detail = await updateInvitation(
      deps,
      c.get("actor"),
      eventId,
      c.req.valid("json"),
      requestMeta(c),
    );
    return c.json(detail, 200);
  });

  router.openapi(publishInvitationRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    return c.json(await publishInvitation(deps, c.get("actor"), eventId, requestMeta(c)), 200);
  });

  router.openapi(unpublishInvitationRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    return c.json(await unpublishInvitation(deps, c.get("actor"), eventId, requestMeta(c)), 200);
  });

  return router;
}
