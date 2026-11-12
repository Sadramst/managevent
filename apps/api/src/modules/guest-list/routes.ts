/**
 * Host guest list (`/v1/events/{eventId}/parties...`, import, export).
 *
 * Route = validated input → service (which authorises through `requireEventAccess`) →
 * repository. No Prisma here. The CSV export is the one non-JSON response.
 */
import { createRoute, z } from "@hono/zod-openapi";
import {
  GuestImportResultSchema,
  GuestImportSchema,
  HostGuestInputSchema,
  HostGuestUpdateSchema,
  HostPartyCreateSchema,
  HostPartyListQuerySchema,
  HostPartyListSchema,
  HostPartySchema,
  HostPartyUpdateSchema,
  HostRsvpEntrySchema,
} from "@managevent/validators";
import type { Context } from "hono";
import type { ApiDeps } from "../../lib/deps.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import type { ApiEnv } from "../../middleware/context.js";
import { enforceLimit } from "./limits.js";
import { createGuestListService, type RequestContext } from "./service.js";

const TAGS = ["Guest list"];

/**
 * Deliberately loose: an id that is not a real id is answered by the service with the same
 * neutral 404 as a row the caller may not see.
 */
const looseId = () => z.string().min(1).max(80);
const EventParamsSchema = z.object({ eventId: looseId() });
const PartyParamsSchema = EventParamsSchema.extend({ partyId: looseId() });
const GuestParamsSchema = PartyParamsSchema.extend({ guestId: looseId() });

const OptionalIdempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().min(8).max(128).optional(),
});

const ExportQuerySchema = z.object({ includeHealth: z.enum(["true", "false"]).optional() });

export function requestContext(c: Context<ApiEnv>): RequestContext {
  const ip = clientIp(c);
  return { actor: c.get("actor"), ...(ip === "unknown" ? {} : { ip }) };
}

const partyResponse = { description: "The party", content: jsonContent(HostPartySchema) } as const;

export const listPartiesRoute = createRoute({
  method: "get",
  path: "/v1/events/{eventId}/parties",
  tags: TAGS,
  summary: "List the event's parties with their guests and RSVP status",
  middleware: [RL.hostRead] as const,
  request: { params: EventParamsSchema, query: HostPartyListQuerySchema },
  responses: {
    200: { description: "Parties in creation order", content: jsonContent(HostPartyListSchema) },
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

export const createPartyRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/parties",
  tags: TAGS,
  summary: "Add a party (one guest link) with its guests",
  middleware: [RL.hostWrite] as const,
  request: {
    params: EventParamsSchema,
    headers: OptionalIdempotencyHeaderSchema,
    body: { required: true, content: jsonContent(HostPartyCreateSchema) },
  },
  responses: {
    201: { description: "Party created", content: jsonContent(HostPartySchema) },
    200: {
      description: "Replay: the party this Idempotency-Key already created",
      content: jsonContent(HostPartySchema),
    },
    ...errorResponses(400, 401, 403, 404, 409, 429),
  },
});

export const updatePartyRoute = createRoute({
  method: "patch",
  path: "/v1/events/{eventId}/parties/{partyId}",
  tags: TAGS,
  summary: "Update a party (the guest link does not change on rename)",
  middleware: [RL.hostWrite] as const,
  request: {
    params: PartyParamsSchema,
    body: { required: true, content: jsonContent(HostPartyUpdateSchema) },
  },
  responses: { 200: partyResponse, ...errorResponses(400, 401, 403, 404, 429) },
});

export const deletePartyRoute = createRoute({
  method: "delete",
  path: "/v1/events/{eventId}/parties/{partyId}",
  tags: TAGS,
  summary: "Remove a party and its guests",
  middleware: [RL.hostWrite] as const,
  request: { params: PartyParamsSchema },
  responses: {
    204: { description: "Party removed" },
    ...errorResponses(401, 403, 404, 429),
  },
});

export const revokeLinkRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/parties/{partyId}/revoke-link",
  tags: TAGS,
  summary: "Stop the party's guest link from working",
  middleware: [RL.hostWrite] as const,
  request: { params: PartyParamsSchema },
  responses: { 200: partyResponse, ...errorResponses(401, 403, 404, 429) },
});

export const reissueLinkRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/parties/{partyId}/reissue-link",
  tags: TAGS,
  summary: "Replace the party's guest link with a new one",
  middleware: [RL.hostWrite] as const,
  request: { params: PartyParamsSchema },
  responses: { 200: partyResponse, ...errorResponses(401, 403, 404, 429) },
});

export const addGuestRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/parties/{partyId}/guests",
  tags: TAGS,
  summary: "Add a guest to a party",
  middleware: [RL.hostWrite] as const,
  request: {
    params: PartyParamsSchema,
    body: { required: true, content: jsonContent(HostGuestInputSchema) },
  },
  responses: {
    201: { description: "Guest added", content: jsonContent(HostPartySchema) },
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

export const updateGuestRoute = createRoute({
  method: "patch",
  path: "/v1/events/{eventId}/parties/{partyId}/guests/{guestId}",
  tags: TAGS,
  summary: "Update a guest",
  middleware: [RL.hostWrite] as const,
  request: {
    params: GuestParamsSchema,
    body: { required: true, content: jsonContent(HostGuestUpdateSchema) },
  },
  responses: { 200: partyResponse, ...errorResponses(400, 401, 403, 404, 429) },
});

export const deleteGuestRoute = createRoute({
  method: "delete",
  path: "/v1/events/{eventId}/parties/{partyId}/guests/{guestId}",
  tags: TAGS,
  summary: "Remove a guest from a party",
  middleware: [RL.hostWrite] as const,
  request: { params: GuestParamsSchema },
  responses: {
    204: { description: "Guest removed" },
    ...errorResponses(401, 403, 404, 429),
  },
});

export const setRsvpRoute = createRoute({
  method: "put",
  path: "/v1/events/{eventId}/parties/{partyId}/rsvp",
  tags: TAGS,
  summary: "Record a party's answers on its behalf (no health data)",
  middleware: [RL.hostWrite] as const,
  request: {
    params: PartyParamsSchema,
    body: { required: true, content: jsonContent(HostRsvpEntrySchema) },
  },
  responses: { 200: partyResponse, ...errorResponses(400, 401, 403, 404, 429) },
});

export const importGuestsRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/guests/import",
  tags: TAGS,
  summary: "Preview (dry run) or commit a CSV guest import",
  middleware: [RL.hostWrite] as const,
  request: {
    params: EventParamsSchema,
    headers: OptionalIdempotencyHeaderSchema,
    body: { required: true, content: jsonContent(GuestImportSchema) },
  },
  responses: {
    200: {
      description: "What the file contains and, on a commit, what was created",
      content: jsonContent(GuestImportResultSchema),
    },
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

export function createGuestListRoutes(deps: ApiDeps) {
  const router = createApiRouter();
  const service = createGuestListService(deps);

  router.openapi(listPartiesRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const list = await service.listParties(requestContext(c), eventId, c.req.valid("query"));
    return c.json(list, 200);
  });

  router.openapi(createPartyRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const { party, created } = await service.createParty(
      requestContext(c),
      eventId,
      c.req.valid("json"),
      c.req.valid("header")["idempotency-key"],
    );
    return c.json(party, created ? 201 : 200);
  });

  router.openapi(updatePartyRoute, async (c) => {
    const { eventId, partyId } = c.req.valid("param");
    const party = await service.updateParty(
      requestContext(c),
      eventId,
      partyId,
      c.req.valid("json"),
    );
    return c.json(party, 200);
  });

  router.openapi(deletePartyRoute, async (c) => {
    const { eventId, partyId } = c.req.valid("param");
    await service.removeParty(requestContext(c), eventId, partyId);
    return c.body(null, 204);
  });

  router.openapi(revokeLinkRoute, async (c) => {
    const { eventId, partyId } = c.req.valid("param");
    return c.json(await service.revokeLink(requestContext(c), eventId, partyId), 200);
  });

  router.openapi(reissueLinkRoute, async (c) => {
    const { eventId, partyId } = c.req.valid("param");
    return c.json(await service.reissueLink(requestContext(c), eventId, partyId), 200);
  });

  router.openapi(addGuestRoute, async (c) => {
    const { eventId, partyId } = c.req.valid("param");
    const party = await service.addGuest(requestContext(c), eventId, partyId, c.req.valid("json"));
    return c.json(party, 201);
  });

  router.openapi(updateGuestRoute, async (c) => {
    const { eventId, partyId, guestId } = c.req.valid("param");
    const party = await service.updateGuest(
      requestContext(c),
      eventId,
      partyId,
      guestId,
      c.req.valid("json"),
    );
    return c.json(party, 200);
  });

  router.openapi(deleteGuestRoute, async (c) => {
    const { eventId, partyId, guestId } = c.req.valid("param");
    await service.removeGuest(requestContext(c), eventId, partyId, guestId);
    return c.body(null, 204);
  });

  router.openapi(setRsvpRoute, async (c) => {
    const { eventId, partyId } = c.req.valid("param");
    const party = await service.setRsvp(requestContext(c), eventId, partyId, c.req.valid("json"));
    return c.json(party, 200);
  });

  router.openapi(importGuestsRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const result = await service.importGuests(
      requestContext(c),
      eventId,
      c.req.valid("json"),
      c.req.valid("header")["idempotency-key"],
      // 10 commits an hour per event; a dry run changes nothing and is not counted.
      () => enforceLimit(c, RL.bulk),
    );
    return c.json(result, 200);
  });

  // CSV is the only non-JSON response, so it is a plain route (not part of the JSON contract).
  router.get("/v1/events/:eventId/guests/export.csv", RL.hostRead, async (c) => {
    const { eventId } = EventParamsSchema.parse({ eventId: c.req.param("eventId") });
    const query = ExportQuerySchema.parse({
      ...(c.req.query("includeHealth") !== undefined
        ? { includeHealth: c.req.query("includeHealth") }
        : {}),
    });
    const { filename, csv } = await service.exportCsv(
      requestContext(c),
      eventId,
      query.includeHealth === "true",
    );
    return c.body(csv, 200, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    });
  });

  return router;
}
