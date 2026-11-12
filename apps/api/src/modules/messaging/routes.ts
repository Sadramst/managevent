/**
 * Host messaging (`/v1/events/{eventId}/messaging...`) and the public unsubscribe.
 *
 * Route = validated input → service (which authorises through `requireEventAccess`) →
 * repository. No Prisma here.
 */
import { createRoute, z } from "@hono/zod-openapi";
import {
  EmailCampaignCreateSchema,
  EmailCampaignResultSchema,
  MessagingStatusSchema,
  UnsubscribeResultSchema,
  UnsubscribeSchema,
} from "@managevent/validators";
import type { Context } from "hono";
import type { ApiDeps } from "../../lib/deps.js";
import { ApiProblem } from "../../lib/errors.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import type { ApiEnv } from "../../middleware/context.js";
import { enforceLimit } from "../guest-list/limits.js";
import { createMessagingService, type RequestContext } from "./service.js";

const TAGS = ["Messaging"];

/** Loose on purpose: an unknown id gets the service's neutral 404. */
const EventParamsSchema = z.object({ eventId: z.string().min(1).max(80) });

/** Required: a retried request must never create a second campaign. */
const IdempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().min(8).max(128),
});

function requestContext(c: Context<ApiEnv>): RequestContext {
  const ip = clientIp(c);
  return { actor: c.get("actor"), ...(ip === "unknown" ? {} : { ip }) };
}

const campaignAccepted = {
  description: "Campaign recorded; the worker sends the emails",
  content: jsonContent(EmailCampaignResultSchema),
} as const;

export const getMessagingRoute = createRoute({
  method: "get",
  path: "/v1/events/{eventId}/messaging",
  tags: TAGS,
  summary: "Whether email can be sent, the plan quota and recent campaigns",
  middleware: [RL.hostRead] as const,
  request: { params: EventParamsSchema },
  responses: {
    200: { description: "Messaging status", content: jsonContent(MessagingStatusSchema) },
    ...errorResponses(401, 403, 404, 429),
  },
});

export const sendEmailInvitationsRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/messaging/email-invitations",
  tags: TAGS,
  summary: "Email the invitation link to parties that have not had it yet",
  middleware: [RL.hostWrite] as const,
  request: {
    params: EventParamsSchema,
    headers: IdempotencyHeaderSchema,
    body: { required: true, content: jsonContent(EmailCampaignCreateSchema) },
  },
  responses: { 202: campaignAccepted, ...errorResponses(400, 401, 403, 404, 409, 429, 503) },
});

export const sendRsvpRemindersRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/messaging/rsvp-reminders",
  tags: TAGS,
  summary: "Email an RSVP reminder to parties that have not answered",
  middleware: [RL.hostWrite] as const,
  request: {
    params: EventParamsSchema,
    headers: IdempotencyHeaderSchema,
    body: { required: true, content: jsonContent(EmailCampaignCreateSchema) },
  },
  responses: { 202: campaignAccepted, ...errorResponses(400, 401, 403, 404, 409, 429, 503) },
});

export const unsubscribeRoute = createRoute({
  method: "post",
  path: "/v1/public/unsubscribe",
  tags: TAGS,
  summary: "Stop invitation and reminder emails to the address a signed link was sent to",
  middleware: [RL.publicMisc] as const,
  request: { body: { required: true, content: jsonContent(UnsubscribeSchema) } },
  responses: {
    200: { description: "Unsubscribed", content: jsonContent(UnsubscribeResultSchema) },
    ...errorResponses(400, 429),
  },
});

export function createMessagingRoutes(deps: ApiDeps) {
  const router = createApiRouter();
  const service = createMessagingService(deps);

  router.openapi(getMessagingRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    return c.json(await service.getStatus(c.get("actor"), eventId), 200);
  });

  router.openapi(sendEmailInvitationsRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const result = await service.sendEmailInvitations(
      requestContext(c),
      eventId,
      c.req.valid("json"),
      c.req.valid("header")["idempotency-key"],
      // 10 an hour per event, counted only once the caller is authorised.
      () => enforceLimit(c, RL.bulk),
    );
    return c.json(result, 202);
  });

  router.openapi(sendRsvpRemindersRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const result = await service.sendRsvpReminders(
      requestContext(c),
      eventId,
      c.req.valid("json"),
      c.req.valid("header")["idempotency-key"],
      // 10 an hour per event, counted only once the caller is authorised.
      () => enforceLimit(c, RL.bulk),
    );
    return c.json(result, 202);
  });

  router.openapi(unsubscribeRoute, async (c) => {
    const { token } = c.req.valid("json");
    if (!(await service.unsubscribe(token))) {
      throw new ApiProblem(400, "VALIDATION_ERROR", "This unsubscribe link is not valid");
    }
    return c.json({ ok: true as const }, 200);
  });

  return router;
}
