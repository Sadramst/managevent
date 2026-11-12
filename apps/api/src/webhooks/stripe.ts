/**
 * Stripe webhook (`POST /v1/webhooks/stripe`).
 *
 * Public, authenticated by the `Stripe-Signature` header over the raw request body. The body is
 * read as text and never parsed before verification. It is not logged.
 */
import { createRoute, z } from "@hono/zod-openapi";
import type { ApiDeps } from "../lib/deps.js";
import { createApiRouter, errorResponses, jsonContent } from "../lib/router.js";
import {
  defaultStripeClientFactory,
  type StripeClientFactory,
} from "../modules/billing/stripe-client.js";
import { handleStripeWebhook } from "../modules/billing/webhook.js";

export const StripeWebhookResponseSchema = z.object({ received: z.literal(true) });

export const stripeWebhookRoute = createRoute({
  method: "post",
  path: "/v1/webhooks/stripe",
  tags: ["Webhooks"],
  summary: "Stripe events (signature verified, idempotent per Stripe event id)",
  // No body schema on purpose: a JSON validator would parse the body, and the signature covers
  // the exact bytes Stripe sent. The handler reads the raw text itself.
  description:
    "The request body is the raw Stripe event exactly as sent. It is verified against the " +
    "`Stripe-Signature` header before anything is read from it.",
  request: {
    headers: z.object({ "stripe-signature": z.string().optional() }),
  },
  responses: {
    200: {
      description: "Event accepted (also for a redelivery or an event type that is not handled)",
      content: jsonContent(StripeWebhookResponseSchema),
    },
    ...errorResponses(400, 503),
  },
});

export interface StripeWebhookRouteOptions {
  /** Stripe client override. Production always uses the real client built from the environment. */
  createStripeClient?: StripeClientFactory;
}

export function createStripeWebhookRoute(deps: ApiDeps, options: StripeWebhookRouteOptions = {}) {
  const router = createApiRouter();
  const createStripeClient = options.createStripeClient ?? defaultStripeClientFactory;

  router.openapi(stripeWebhookRoute, async (c) => {
    const rawBody = await c.req.text();
    const result = await handleStripeWebhook(
      deps,
      { rawBody, signature: c.req.header("stripe-signature") },
      createStripeClient,
    );
    return c.json(result, 200);
  });

  return router;
}
