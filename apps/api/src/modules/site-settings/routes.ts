/**
 * `/v1/site-settings` (public read) and `/v1/admin/site-settings` (staff read and save).
 *
 * Route = validated input → `site_settings:manage` check in the service → repository.
 */
import { createRoute } from "@hono/zod-openapi";
import {
  AdminSiteSettingsSchema,
  PublicSiteSettingsSchema,
  SiteSettingsUpdateSchema,
} from "@managevent/validators";
import type { ApiDeps } from "../../lib/deps.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import { SiteSettingsService } from "./service.js";

const TAGS = ["Site settings"];

export const getPublicSiteSettingsRoute = createRoute({
  method: "get",
  path: "/v1/site-settings",
  tags: TAGS,
  summary: "The public contact email and phone shown on www (no sign-in; safe to cache briefly)",
  middleware: [RL.publicMisc] as const,
  responses: {
    200: {
      description: "The public contact details",
      content: jsonContent(PublicSiteSettingsSchema),
    },
    ...errorResponses(429),
  },
});

export const getAdminSiteSettingsRoute = createRoute({
  method: "get",
  path: "/v1/admin/site-settings",
  tags: TAGS,
  summary: "The contact details and enquiry-alert address in force (staff only)",
  middleware: [RL.hostRead] as const,
  responses: {
    200: { description: "The settings", content: jsonContent(AdminSiteSettingsSchema) },
    ...errorResponses(401, 403, 429),
  },
});

export const putAdminSiteSettingsRoute = createRoute({
  method: "put",
  path: "/v1/admin/site-settings",
  tags: TAGS,
  summary: "Replace the contact email, phone and enquiry-alert address (staff only)",
  middleware: [RL.hostWrite] as const,
  request: { body: { required: true, content: jsonContent(SiteSettingsUpdateSchema) } },
  responses: {
    200: { description: "The saved settings", content: jsonContent(AdminSiteSettingsSchema) },
    ...errorResponses(400, 401, 403, 429),
  },
});

export function createSiteSettingsRoutes(deps: ApiDeps) {
  const service = new SiteSettingsService(deps);
  const router = createApiRouter();

  router.openapi(getPublicSiteSettingsRoute, async (c) => {
    const settings = await service.getPublic();
    // A change reaches visitors within a minute; the web app also caches for a minute.
    c.header("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return c.json(settings, 200);
  });

  router.openapi(getAdminSiteSettingsRoute, async (c) => {
    const settings = await service.getAdmin(c.get("actor"));
    c.header("Cache-Control", "no-store");
    return c.json(settings, 200);
  });

  router.openapi(putAdminSiteSettingsRoute, async (c) => {
    const ip = clientIp(c);
    const settings = await service.update(
      c.get("actor"),
      c.req.valid("json"),
      ip === "unknown" ? undefined : ip,
    );
    c.header("Cache-Control", "no-store");
    return c.json(settings, 200);
  });

  return router;
}
