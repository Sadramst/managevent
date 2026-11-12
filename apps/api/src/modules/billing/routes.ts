/**
 * Plan view and Stripe Checkout (`/v1/events/{eventId}/plan...`).
 */
import { createRoute, z } from "@hono/zod-openapi";
import {
  CheckoutConfirmSchema,
  CheckoutCreateSchema,
  CheckoutSessionSchema,
  PlanViewSchema,
} from "@managevent/validators";
import type { ApiDeps } from "../../lib/deps.js";
import { RL } from "../../lib/rate-limit.js";
import { createApiRouter, errorResponses, jsonContent } from "../../lib/router.js";
import { EventIdParamSchema, requestMeta } from "../events/routes.js";
import { confirmCheckout, getPlanView, startCheckout } from "./service.js";
import { defaultStripeClientFactory, type StripeClientFactory } from "./stripe-client.js";

const TAGS = ["Billing"];

export const getPlanRoute = createRoute({
  method: "get",
  path: "/v1/events/{eventId}/plan",
  tags: TAGS,
  summary: "The invitation's plan, entitlements, usage and upgrade price",
  middleware: [RL.hostRead] as const,
  request: { params: EventIdParamSchema },
  responses: {
    200: { description: "Plan view", content: jsonContent(PlanViewSchema) },
    ...errorResponses(401, 404, 429),
  },
});

export const createCheckoutRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/plan/checkout",
  tags: TAGS,
  summary: "Start a Stripe Checkout for the Premium Event Pass",
  middleware: [RL.checkout] as const,
  request: {
    params: EventIdParamSchema,
    headers: z.object({
      // Required: it reaches Stripe, so a retried request returns the same Checkout Session.
      "idempotency-key": z.string().min(8).max(128),
    }),
    body: { required: false, content: jsonContent(CheckoutCreateSchema) },
  },
  responses: {
    201: {
      description: "Checkout Session created; send the host to `checkoutUrl`",
      content: jsonContent(CheckoutSessionSchema),
    },
    ...errorResponses(400, 401, 403, 404, 409, 429, 503),
  },
});

export const confirmCheckoutRoute = createRoute({
  method: "post",
  path: "/v1/events/{eventId}/plan/checkout/confirm",
  tags: TAGS,
  summary: "Confirm a completed Checkout Session and apply the Premium Event Pass",
  middleware: [RL.checkout] as const,
  request: {
    params: EventIdParamSchema,
    body: { required: true, content: jsonContent(CheckoutConfirmSchema) },
  },
  responses: {
    200: { description: "Plan view after the upgrade", content: jsonContent(PlanViewSchema) },
    ...errorResponses(400, 401, 403, 404, 409, 429, 503),
  },
});

export interface BillingRouteOptions {
  /** Stripe client override. Production always uses the real client built from the environment. */
  createStripeClient?: StripeClientFactory;
}

export function createBillingRoutes(deps: ApiDeps, options: BillingRouteOptions = {}) {
  const router = createApiRouter();
  const createStripeClient = options.createStripeClient ?? defaultStripeClientFactory;

  router.openapi(getPlanRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    return c.json(await getPlanView(deps, c.get("actor"), eventId), 200);
  });

  router.openapi(createCheckoutRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const headers = c.req.valid("header");
    const session = await startCheckout(
      deps,
      c.get("actor"),
      eventId,
      headers["idempotency-key"],
      requestMeta(c),
      createStripeClient,
    );
    return c.json(session, 201);
  });

  router.openapi(confirmCheckoutRoute, async (c) => {
    const { eventId } = c.req.valid("param");
    const view = await confirmCheckout(
      deps,
      c.get("actor"),
      eventId,
      c.req.valid("json"),
      requestMeta(c),
      createStripeClient,
    );
    return c.json(view, 200);
  });

  return router;
}
