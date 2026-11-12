/**
 * Guest micro-site (`/v1/i/{eventSlug}/{guestToken}...`, `/v1/public/demos`, `/v1/public/legacy/resolve`).
 *
 * Public routes authenticated by the guest link itself. Token paths start `/v1/i/` so the request
 * logger redacts the token. A malformed path parameter is a neutral 404, exactly like an unknown
 * link, so the API never says why a link did not resolve.
 *
 * EVERY route that resolves a link carries `RL.enumGuard`: they all answer the same 404 (unknown)
 * or 410 (revoked), so each of them is a way to test a guessed token and each miss must count
 * against the caller's budget.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  DemoListSchema,
  GuestCalendarSchema,
  GuestInvitationViewSchema,
  GuestLinkStatusSchema,
  GuestPassesViewSchema,
  GuestRsvpResultSchema,
  GuestRsvpSubmitSchema,
  GuestWishResultSchema,
  GuestWishSubmitSchema,
  LegacyResolveResultSchema,
  LegacyResolveSchema,
} from "@managevent/validators";
import type { ApiDeps } from "../../lib/deps.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { errorResponses, jsonContent } from "../../lib/router.js";
import type { ApiEnv } from "../../middleware/context.js";
import { GuestSiteService } from "./service.js";

const TAGS = ["Guest site"];

/**
 * Deliberately loose: the service normalises (`trim().toLowerCase()`) and then applies the strict
 * slug and token formats, answering 404 for anything that does not fit.
 */
const GuestLinkParamsSchema = z.object({
  eventSlug: z.string().min(1).max(100),
  guestToken: z.string().min(1).max(120),
});

const IDEMPOTENCY_KEY = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[\x21-\x7e]+$/, "Idempotency-Key must be printable ASCII without spaces");

const RequiredIdempotencyHeaderSchema = z.object({ "idempotency-key": IDEMPOTENCY_KEY });
const OptionalIdempotencyHeaderSchema = z.object({ "idempotency-key": IDEMPOTENCY_KEY.optional() });

export const getGuestLinkStatusRoute = createRoute({
  method: "get",
  path: "/v1/i/{eventSlug}/{guestToken}/status",
  tags: TAGS,
  summary: "Check that a guest link is live (404 unknown, 410 revoked)",
  middleware: [RL.guestRead, RL.enumGuard] as const,
  request: { params: GuestLinkParamsSchema },
  responses: {
    200: { description: "The link is active", content: jsonContent(GuestLinkStatusSchema) },
    ...errorResponses(404, 410, 429),
  },
});

export const getGuestInvitationRoute = createRoute({
  method: "get",
  path: "/v1/i/{eventSlug}/{guestToken}",
  tags: TAGS,
  summary: "The invitation as this party sees it",
  middleware: [RL.guestRead, RL.enumGuard] as const,
  request: { params: GuestLinkParamsSchema },
  responses: {
    200: { description: "Guest invitation view", content: jsonContent(GuestInvitationViewSchema) },
    ...errorResponses(404, 410, 429),
  },
});

export const postGuestRsvpRoute = createRoute({
  method: "post",
  path: "/v1/i/{eventSlug}/{guestToken}/rsvp",
  tags: TAGS,
  summary: "Submit the party's RSVP (idempotent on Idempotency-Key)",
  middleware: [RL.guestWrite, RL.enumGuard] as const,
  request: {
    params: GuestLinkParamsSchema,
    headers: RequiredIdempotencyHeaderSchema,
    body: { required: true, content: jsonContent(GuestRsvpSubmitSchema) },
  },
  responses: {
    200: {
      description: "RSVP stored, or the stored result of an earlier identical submission",
      content: jsonContent(GuestRsvpResultSchema),
    },
    ...errorResponses(400, 403, 404, 409, 410, 429),
  },
});

export const getGuestPassesRoute = createRoute({
  method: "get",
  path: "/v1/i/{eventSlug}/{guestToken}/passes",
  tags: TAGS,
  summary: "Entry passes of the party's attending guests",
  middleware: [RL.guestRead, RL.enumGuard] as const,
  request: { params: GuestLinkParamsSchema },
  responses: {
    200: { description: "Passes", content: jsonContent(GuestPassesViewSchema) },
    ...errorResponses(404, 410, 429),
  },
});

export const getGuestCalendarRoute = createRoute({
  method: "get",
  path: "/v1/i/{eventSlug}/{guestToken}/calendar",
  tags: TAGS,
  summary: "The event as an iCalendar file",
  middleware: [RL.guestRead, RL.enumGuard] as const,
  request: { params: GuestLinkParamsSchema },
  responses: {
    200: { description: "Calendar file", content: jsonContent(GuestCalendarSchema) },
    ...errorResponses(404, 410, 429),
  },
});

export const postGuestWishRoute = createRoute({
  method: "post",
  path: "/v1/i/{eventSlug}/{guestToken}/wishes",
  tags: TAGS,
  summary: "Leave a wishing-well or tribute-book message",
  middleware: [RL.guestWrite, RL.enumGuard] as const,
  request: {
    params: GuestLinkParamsSchema,
    headers: OptionalIdempotencyHeaderSchema,
    body: { required: true, content: jsonContent(GuestWishSubmitSchema) },
  },
  responses: {
    201: {
      description: "Message stored for moderation",
      content: jsonContent(GuestWishResultSchema),
    },
    200: {
      description: "Replay of an earlier submission with the same Idempotency-Key",
      content: jsonContent(GuestWishResultSchema),
    },
    ...errorResponses(400, 403, 404, 409, 410, 429),
  },
});

export const getDemosRoute = createRoute({
  method: "get",
  path: "/v1/public/demos",
  tags: TAGS,
  summary: "Published sample invitations, one per template",
  middleware: [RL.publicMisc] as const,
  responses: {
    200: { description: "Sample invitations", content: jsonContent(DemoListSchema) },
    ...errorResponses(429),
  },
});

export const postLegacyResolveRoute = createRoute({
  method: "post",
  path: "/v1/public/legacy/resolve",
  tags: TAGS,
  summary: "Resolve an imported legacy invitation path to its live link",
  middleware: [RL.publicMisc, RL.enumGuard] as const,
  request: { body: { required: true, content: jsonContent(LegacyResolveSchema) } },
  responses: {
    200: { description: "The live link", content: jsonContent(LegacyResolveResultSchema) },
    ...errorResponses(400, 404, 429),
  },
});

export function createGuestSiteRoutes(deps: ApiDeps) {
  const service = new GuestSiteService(deps);

  const router = new OpenAPIHono<ApiEnv>({
    defaultHook: (result, c) => {
      if (result.success) return undefined;
      const requestId = c.get("requestId") ?? "req_unknown";
      if (result.target === "param") {
        // Indistinguishable from an unknown link.
        return c.json({ error: { code: "NOT_FOUND", message: "Not found", requestId } }, 404);
      }
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
    },
  });

  // Guest pages are personal: never cached by a shared cache, never indexed.
  router.use("/v1/i/*", async (c, next) => {
    await next();
    c.header("cache-control", "private, no-store");
    c.header("x-robots-tag", "noindex, nofollow, noarchive");
  });

  router.openapi(getGuestLinkStatusRoute, async (c) => {
    const { eventSlug, guestToken } = c.req.valid("param");
    return c.json(await service.getStatus(c.get("actor"), eventSlug, guestToken), 200);
  });

  router.openapi(getGuestInvitationRoute, async (c) => {
    const { eventSlug, guestToken } = c.req.valid("param");
    return c.json(await service.getView(c.get("actor"), eventSlug, guestToken), 200);
  });

  router.openapi(postGuestRsvpRoute, async (c) => {
    const { eventSlug, guestToken } = c.req.valid("param");
    const ip = clientIp(c);
    const result = await service.submitRsvp({
      actor: c.get("actor"),
      eventSlug,
      guestToken,
      body: c.req.valid("json"),
      idempotencyKey: c.req.valid("header")["idempotency-key"],
      ip: ip === "unknown" ? null : ip,
    });
    return c.json(result, 200);
  });

  router.openapi(getGuestPassesRoute, async (c) => {
    const { eventSlug, guestToken } = c.req.valid("param");
    return c.json(await service.getPasses(c.get("actor"), eventSlug, guestToken), 200);
  });

  router.openapi(getGuestCalendarRoute, async (c) => {
    const { eventSlug, guestToken } = c.req.valid("param");
    return c.json(await service.getCalendar(c.get("actor"), eventSlug, guestToken), 200);
  });

  router.openapi(postGuestWishRoute, async (c) => {
    const { eventSlug, guestToken } = c.req.valid("param");
    const { created, result } = await service.submitWish({
      actor: c.get("actor"),
      eventSlug,
      guestToken,
      body: c.req.valid("json"),
      idempotencyKey: c.req.valid("header")["idempotency-key"] ?? null,
    });
    return c.json(result, created ? 201 : 200);
  });

  router.openapi(getDemosRoute, async (c) => {
    return c.json(await service.listDemos(), 200);
  });

  router.openapi(postLegacyResolveRoute, async (c) => {
    const { path } = c.req.valid("json");
    return c.json(await service.resolveLegacy(path), 200);
  });

  return router;
}
