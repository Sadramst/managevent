/**
 * Test-only Stripe support. The code under test uses the real `stripe` SDK; these helpers give
 * it a local transport in place of api.stripe.com, and sign webhook payloads the way Stripe does.
 *
 * Nothing here is reachable from production code: the API builds its Stripe client from the
 * environment and answers `503 PAYMENTS_NOT_CONFIGURED` when there are no real credentials.
 */
import { createHmac, randomBytes } from "node:crypto";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthActor } from "@managevent/auth";
import { createStripeCheckoutClient } from "@managevent/payments";
import type { ApiDeps } from "../lib/deps.js";
import { createRateLimitScope } from "../lib/rate-limit.js";
import {
  actorMiddleware,
  type ApiEnv,
  handleApiError,
  requestIdMiddleware,
} from "../middleware/context.js";
import { createBillingRoutes } from "../modules/billing/routes.js";
import type { StripeClientFactory } from "../modules/billing/stripe-client.js";
import { createStripeWebhookRoute } from "../webhooks/stripe.js";
import { TEST_ACTOR_HEADER } from "./hosts.js";

/** Well-formed but meaningless credentials, built at run time so no key-shaped literal is committed. */
export const TEST_STRIPE_SECRET_KEY = `sk_test_${"managevent0test".repeat(2)}`;
export const TEST_STRIPE_WEBHOOK_SECRET = `whsec_${"managevent0test".repeat(2)}`;

export interface RecordedStripeRequest {
  method: string;
  path: string;
  idempotencyKey: string | null;
  form: URLSearchParams;
}

type StoredSession = Record<string, unknown> & { id: string };

/**
 * A stand-in for Stripe's Checkout Sessions endpoints: create stores a session, retrieve returns
 * it, and an unknown id gets Stripe's own `resource_missing` error body.
 */
export function createStripeTestTransport() {
  const sessions = new Map<string, StoredSession>();
  const requests: RecordedStripeRequest[] = [];

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", "request-id": "req_test_transport" },
    });

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    );
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const form = new URLSearchParams(typeof init?.body === "string" ? init.body : "");
    requests.push({
      method,
      path: url.pathname,
      idempotencyKey: headers.get("idempotency-key"),
      form,
    });

    if (method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const id = `cs_test_${randomBytes(12).toString("hex")}`;
      const session: StoredSession = {
        id,
        object: "checkout.session",
        mode: form.get("mode"),
        url: `https://checkout.stripe.com/c/pay/${id}`,
        status: "open",
        payment_status: "unpaid",
        payment_intent: null,
        amount_total: Number(form.get("line_items[0][price_data][unit_amount]")),
        currency: form.get("line_items[0][price_data][currency]"),
        client_reference_id: form.get("client_reference_id"),
        metadata: {
          invitationId: form.get("metadata[invitationId]"),
          eventId: form.get("metadata[eventId]"),
          userId: form.get("metadata[userId]"),
        },
        success_url: form.get("success_url"),
        cancel_url: form.get("cancel_url"),
      };
      sessions.set(id, session);
      return json(200, session);
    }

    const expire = /^\/v1\/checkout\/sessions\/([^/]+)\/expire$/.exec(url.pathname);
    if (method === "POST" && expire) {
      const session = sessions.get(decodeURIComponent(expire[1] ?? ""));
      // Stripe only expires a session that is still open.
      if (session && session.status !== "expired" && session.payment_status !== "paid") {
        session.status = "expired";
        return json(200, session);
      }
      return json(session ? 400 : 404, {
        error: {
          type: "invalid_request_error",
          ...(session ? {} : { code: "resource_missing" }),
          message: session
            ? "Only Checkout Sessions with a status in [open] can be expired"
            : "No such checkout.session",
        },
      });
    }

    const retrieve = /^\/v1\/checkout\/sessions\/([^/]+)$/.exec(url.pathname);
    if (method === "GET" && retrieve) {
      const session = sessions.get(decodeURIComponent(retrieve[1] ?? ""));
      if (session) return json(200, session);
      return json(404, {
        error: {
          type: "invalid_request_error",
          code: "resource_missing",
          message: "No such checkout.session",
        },
      });
    }

    return json(400, { error: { type: "invalid_request_error", message: "Unsupported in tests" } });
  };

  const createStripeClient: StripeClientFactory = () =>
    createStripeCheckoutClient({
      secretKey: TEST_STRIPE_SECRET_KEY,
      webhookSecret: TEST_STRIPE_WEBHOOK_SECRET,
      fetchImpl,
    });

  return {
    fetchImpl,
    createStripeClient,
    requests,
    sessions,
    /** Adds a session as if it had been created earlier, for example for another invitation. */
    addSession(session: Partial<StoredSession> & { metadata: Record<string, string | null> }) {
      const id = session.id ?? `cs_test_${randomBytes(12).toString("hex")}`;
      const stored: StoredSession = {
        object: "checkout.session",
        mode: "payment",
        payment_status: "unpaid",
        payment_intent: null,
        amount_total: 6900,
        currency: "aud",
        client_reference_id: session.metadata.invitationId ?? null,
        ...session,
        id,
      };
      sessions.set(id, stored);
      return stored;
    },
    /** Marks a session paid, as Stripe does once the card payment succeeds. */
    markPaid(sessionId: string): string {
      const session = sessions.get(sessionId);
      if (!session) throw new Error("Unknown test session");
      const paymentIntentId = `pi_test_${randomBytes(12).toString("hex")}`;
      session.status = "complete";
      session.payment_status = "paid";
      session.payment_intent = paymentIntentId;
      return paymentIntentId;
    },
  };
}

/** The `Stripe-Signature` header for a payload, as Stripe computes it (`t=...,v1=...`). */
export function signStripePayload(
  payload: string,
  secret: string = TEST_STRIPE_WEBHOOK_SECRET,
  timestampSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const signature = createHmac("sha256", secret)
    .update(`${timestampSeconds}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestampSeconds},v1=${signature}`;
}

/**
 * The billing and webhook routers on their own, with the given Stripe client and the same error
 * handling as the real app. The actor comes from the `x-test-actor` header.
 */
export function createBillingTestApp(
  deps: ApiDeps,
  createStripeClient: StripeClientFactory,
  actors: ReadonlyMap<string, AuthActor>,
) {
  const app = new OpenAPIHono<ApiEnv>();
  const rateLimit = { disabled: true, scope: createRateLimitScope() };
  app.use("*", requestIdMiddleware());
  app.use("*", async (c, next) => {
    c.set("rateLimit", rateLimit);
    await next();
  });
  app.use(
    "*",
    actorMiddleware(
      async (request) => actors.get(request.headers.get(TEST_ACTOR_HEADER) ?? "") ?? null,
    ),
  );
  app.route("/", createBillingRoutes(deps, { createStripeClient }));
  app.route("/", createStripeWebhookRoute(deps, { createStripeClient }));
  app.onError((err, c) => handleApiError(err, c));
  return app;
}
