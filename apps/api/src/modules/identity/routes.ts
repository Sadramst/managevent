/**
 * Identity (`GET /v1/me`).
 */
import { createRoute } from "@hono/zod-openapi";
import { MeResponseSchema } from "@managevent/validators";
import type { ApiDeps } from "../../lib/deps.js";
import { RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import { getMe } from "./service.js";

export const getMeRoute = createRoute({
  method: "get",
  path: "/v1/me",
  tags: ["Identity"],
  summary: "The signed-in user (or null) and the capabilities of this deployment",
  // Public: the session is optional and a signed-out caller gets `user: null`, never a 401.
  middleware: [RL.hostRead] as const,
  responses: {
    200: {
      description: "Current user, or null when signed out, plus deployment capabilities",
      content: jsonContent(MeResponseSchema),
    },
    ...errorResponses(429),
  },
});

export function createIdentityRoutes(deps: ApiDeps) {
  const router = createApiRouter();

  router.openapi(getMeRoute, async (c) => {
    return c.json(await getMe(deps, c.get("actor")), 200);
  });

  return router;
}
