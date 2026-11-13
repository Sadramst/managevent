import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSimulatedCheckoutClient,
  createStripeCheckoutClient,
  INVITATION_PLANS,
  isCheckoutAvailable,
  isSimulatedCheckoutEnabled,
  isStripeCheckoutConfigured,
  isStripeWebhookConfigured,
  PaymentsNotConfiguredError,
  StripeWebhookSignatureError,
} from "./index.js";

const SECRET_KEY = "sk_test_unitTestKey0123456789";
const WEBHOOK_SECRET = "whsec_unitTestSecret0123456789";

interface CapturedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string;
}

/**
 * The real Stripe SDK talks to this local transport, so the tests assert the exact HTTP request
 * Stripe would receive without any network access.
 */
function createStripeTransport(respond: (request: CapturedRequest) => unknown) {
  const requests: CapturedRequest[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const request: CapturedRequest = {
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? init.body : "",
    };
    requests.push(request);
    return new Response(JSON.stringify(respond(request)), {
      status: 200,
      headers: { "content-type": "application/json", "request-id": "req_unit_test" },
    });
  };
  return { requests, fetchImpl };
}

describe("@managevent/payments checkout (real Stripe SDK)", () => {
  const saved = {
    key: process.env.STRIPE_SECRET_KEY,
    webhook: process.env.STRIPE_WEBHOOK_SECRET,
  };

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (saved.key === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = saved.key;
    if (saved.webhook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = saved.webhook;
  });

  it("is never reachable without real credentials or with the legacy mock defaults", () => {
    expect(isStripeCheckoutConfigured()).toBe(false);
    expect(isStripeWebhookConfigured()).toBe(false);
    expect(() => createStripeCheckoutClient()).toThrow(PaymentsNotConfiguredError);

    for (const key of ["sk_test_mock_local_only", "", "   ", "pk_test_publishable0123", "nope"]) {
      expect(isStripeCheckoutConfigured(key)).toBe(false);
      expect(() => createStripeCheckoutClient({ secretKey: key })).toThrow(
        PaymentsNotConfiguredError,
      );
    }
    for (const secret of ["whsec_mock_local_only", "", "secret"]) {
      expect(isStripeWebhookConfigured(secret)).toBe(false);
    }

    expect(isStripeCheckoutConfigured(SECRET_KEY)).toBe(true);
    expect(isStripeWebhookConfigured(WEBHOOK_SECRET)).toBe(true);
  });

  it("creates a payment-mode AUD Checkout Session from the plan price and forwards the idempotency key", async () => {
    const transport = createStripeTransport(() => ({
      id: "cs_test_a1b2c3",
      object: "checkout.session",
      url: "https://checkout.stripe.com/c/pay/cs_test_a1b2c3",
      payment_status: "unpaid",
    }));
    const client = createStripeCheckoutClient({
      secretKey: SECRET_KEY,
      fetchImpl: transport.fetchImpl,
    });

    const session = await client.createInvitationUpgradeSession({
      invitationId: "inv_1",
      eventId: "evt_1",
      userId: "usr_1",
      successUrl:
        "http://localhost:3001/studio/evt_1/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://localhost:3001/studio/evt_1/settings?checkout=cancelled",
      idempotencyKey: "idem-checkout-1",
    });

    expect(session).toEqual({
      sessionId: "cs_test_a1b2c3",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_a1b2c3",
    });
    expect(transport.requests).toHaveLength(1);
    const request = transport.requests[0];
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(request?.headers.get("authorization")).toBe(`Bearer ${SECRET_KEY}`);
    expect(request?.headers.get("idempotency-key")).toBe("idem-checkout-1");

    const form = new URLSearchParams(request?.body ?? "");
    expect(form.get("mode")).toBe("payment");
    expect(form.get("client_reference_id")).toBe("inv_1");
    expect(form.get("metadata[invitationId]")).toBe("inv_1");
    expect(form.get("metadata[eventId]")).toBe("evt_1");
    expect(form.get("metadata[userId]")).toBe("usr_1");
    expect(form.get("line_items[0][quantity]")).toBe("1");
    expect(form.get("line_items[0][price_data][currency]")).toBe("aud");
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe(
      String(INVITATION_PLANS.PREMIUM.priceIncGstCents),
    );
    expect(form.get("line_items[0][price_data][tax_behavior]")).toBe("inclusive");
    expect(form.get("success_url")).toContain("session_id={CHECKOUT_SESSION_ID}");
    expect(form.get("cancel_url")).toContain("checkout=cancelled");
  });

  it("retrieves a session and exposes only what the upgrade needs", async () => {
    const transport = createStripeTransport(() => ({
      id: "cs_test_paid",
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 6900,
      currency: "aud",
      payment_intent: "pi_3Abc",
      client_reference_id: "inv_9",
      metadata: { invitationId: "inv_9", eventId: "evt_9", userId: "usr_9" },
    }));
    const client = createStripeCheckoutClient({
      secretKey: SECRET_KEY,
      fetchImpl: transport.fetchImpl,
    });

    const snapshot = await client.retrieveCheckoutSession("cs_test_paid");
    expect(transport.requests[0]?.method).toBe("GET");
    expect(transport.requests[0]?.url).toBe(
      "https://api.stripe.com/v1/checkout/sessions/cs_test_paid",
    );
    expect(snapshot).toEqual({
      sessionId: "cs_test_paid",
      paymentStatus: "paid",
      amountTotalCents: 6900,
      currency: "aud",
      paymentIntentId: "pi_3Abc",
      clientReferenceId: "inv_9",
      metadata: { invitationId: "inv_9", eventId: "evt_9", userId: "usr_9" },
    });
  });

  it("expires an open session, and reports false when there is nothing to expire", async () => {
    const open = createStripeTransport(() => ({
      id: "cs_test_open",
      object: "checkout.session",
      status: "expired",
    }));
    const client = createStripeCheckoutClient({
      secretKey: SECRET_KEY,
      fetchImpl: open.fetchImpl,
    });
    await expect(client.expireCheckoutSession("cs_test_open")).resolves.toBe(true);
    expect(open.requests).toHaveLength(1);
    expect(open.requests[0]?.method).toBe("POST");
    expect(new URL(open.requests[0]?.url ?? "").pathname).toBe(
      "/v1/checkout/sessions/cs_test_open/expire",
    );

    // Already paid or already expired: Stripe refuses, and that is not an error for the caller.
    const refusing: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            type: "invalid_request_error",
            message: "Only Checkout Sessions with a status in [open] can be expired.",
          },
        }),
        { status: 400, headers: { "content-type": "application/json", "request-id": "req_unit" } },
      );
    const closed = createStripeCheckoutClient({ secretKey: SECRET_KEY, fetchImpl: refusing });
    await expect(closed.expireCheckoutSession("cs_test_paid")).resolves.toBe(false);

    // Anything else (here: a rejected key) is still a failure the caller must see.
    const unauthorised: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: { type: "invalid_request_error", message: "Invalid API Key" } }),
        { status: 401, headers: { "content-type": "application/json", "request-id": "req_unit" } },
      );
    const broken = createStripeCheckoutClient({ secretKey: SECRET_KEY, fetchImpl: unauthorised });
    await expect(broken.expireCheckoutSession("cs_test_any")).rejects.toBeInstanceOf(
      Stripe.errors.StripeAuthenticationError,
    );
  });

  it("verifies webhook signatures with the real secret and rejects forgeries", () => {
    const client = createStripeCheckoutClient({
      secretKey: SECRET_KEY,
      webhookSecret: WEBHOOK_SECRET,
    });
    const payload = JSON.stringify({
      id: "evt_1Unit",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_done",
          object: "checkout.session",
          payment_status: "paid",
          amount_total: 6900,
          currency: "aud",
          payment_intent: "pi_3Done",
          client_reference_id: "inv_2",
          metadata: { invitationId: "inv_2", eventId: "evt_2", userId: "usr_2" },
        },
      },
    });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });

    const event = client.constructWebhookEvent(payload, header);
    expect(event.id).toBe("evt_1Unit");
    expect(event.type).toBe("checkout.session.completed");
    expect(event.checkoutSession?.paymentStatus).toBe("paid");
    expect(event.checkoutSession?.metadata.invitationId).toBe("inv_2");
    expect(event.checkoutSession?.paymentIntentId).toBe("pi_3Done");

    // Signed with the legacy mock secret: must be rejected, not accepted.
    const forged = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_mock_local_only",
    });
    expect(() => client.constructWebhookEvent(payload, forged)).toThrow(
      StripeWebhookSignatureError,
    );
    // Tampered body with a once-valid header.
    expect(() => client.constructWebhookEvent(payload.replace("6900", "1"), header)).toThrow(
      StripeWebhookSignatureError,
    );
  });

  it("refuses webhook verification when no real signing secret is configured", () => {
    const client = createStripeCheckoutClient({ secretKey: SECRET_KEY });
    expect(() => client.constructWebhookEvent("{}", "t=1,v1=abc")).toThrow(
      PaymentsNotConfiguredError,
    );
    const mocked = createStripeCheckoutClient({
      secretKey: SECRET_KEY,
      webhookSecret: "whsec_mock_local_only",
    });
    expect(() => mocked.constructWebhookEvent("{}", "t=1,v1=abc")).toThrow(
      PaymentsNotConfiguredError,
    );
  });

  it("supports simulated checkout when live Stripe credentials are not configured", async () => {
    expect(isSimulatedCheckoutEnabled({})).toBe(true);
    expect(isSimulatedCheckoutEnabled({ MANAGEVENT_SIMULATED_CHECKOUT: "0" })).toBe(false);
    expect(isSimulatedCheckoutEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isSimulatedCheckoutEnabled({
        NODE_ENV: "production",
        MANAGEVENT_SIMULATED_CHECKOUT: "true",
      }),
    ).toBe(true);
    expect(isCheckoutAvailable({})).toBe(true);
    expect(isCheckoutAvailable({ NODE_ENV: "production" })).toBe(false);

    const sim = createSimulatedCheckoutClient();
    const created = await sim.createInvitationUpgradeSession({
      invitationId: "inv_sim_1",
      eventId: "evt_sim_1",
      userId: "usr_sim_1",
      successUrl:
        "http://localhost:3001/studio/evt_sim_1/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://localhost:3001/studio/evt_sim_1/settings?checkout=cancelled",
      idempotencyKey: "idem-sim-1",
    });

    expect(created.sessionId).toMatch(/^cs_sim_/);
    expect(created.checkoutUrl).toBe(
      `/studio/evt_sim_1/checkout?session_id=${encodeURIComponent(created.sessionId)}`,
    );

    const retrieved = await sim.retrieveCheckoutSession(created.sessionId);
    expect(retrieved).toMatchObject({
      sessionId: created.sessionId,
      paymentStatus: "paid",
      amountTotalCents: INVITATION_PLANS.PREMIUM.priceIncGstCents,
      currency: "aud",
      metadata: {
        invitationId: "inv_sim_1",
        eventId: "evt_sim_1",
        userId: "usr_sim_1",
      },
    });
    expect(retrieved.paymentIntentId).toMatch(/^pi_sim_/);
  });
});

