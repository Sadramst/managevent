/**
 * Stripe webhook against the real database: honest 503 without a signing secret, signature
 * verification over the raw body, one stored `WebhookEvent` per Stripe event id, and the plan
 * upgrade applied exactly once however many times Stripe delivers.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthActor } from "@managevent/auth";
import { db, generateId } from "@managevent/db";
import { ApiErrorSchema, PlanViewSchema } from "@managevent/validators";
import { createDefaultDeps } from "../lib/deps.js";
import { InMemoryJobQueue } from "../lib/queue.js";
import {
  createEventFixture,
  dbAvailable,
  type EventFixture,
  uniqueTestSuffix,
} from "../test/db.js";
import { createHostTestApp, jsonRequest, TEST_ACTOR_HEADER } from "../test/hosts.js";
import {
  createBillingTestApp,
  createStripeTestTransport,
  signStripePayload,
  TEST_STRIPE_SECRET_KEY,
  TEST_STRIPE_WEBHOOK_SECRET,
} from "../test/stripe.js";

const STRIPE_ENV = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;
const WEBHOOK_PATH = "/v1/webhooks/stripe";

describe.skipIf(!dbAvailable)("Stripe webhook (database)", () => {
  const savedEnv = Object.fromEntries(STRIPE_ENV.map((name) => [name, process.env[name]]));
  const { app } = createHostTestApp();
  const deps = createDefaultDeps({ queue: new InMemoryJobQueue() });
  const stripe = createStripeTestTransport();
  const actors = new Map<string, AuthActor>();
  const stripeApp = createBillingTestApp(deps, stripe.createStripeClient, actors);

  const stripeEventIds: string[] = [];
  let fixture: EventFixture;
  let unpaidFixture: EventFixture;

  function newStripeEvent(type: string, object: Record<string, unknown>) {
    const id = `evt_test_${uniqueTestSuffix()}`;
    stripeEventIds.push(id);
    return { id, payload: JSON.stringify({ id, object: "event", type, data: { object } }) };
  }

  function deliver(
    target: { request: typeof app.request },
    payload: string,
    signature: string | null = signStripePayload(payload),
  ) {
    return target.request(WEBHOOK_PATH, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature !== null ? { "stripe-signature": signature } : {}),
      },
      body: payload,
    });
  }

  async function errorOf(res: Response) {
    return ApiErrorSchema.parse(await res.json()).error;
  }

  const storedEvents = (id: string) =>
    db.webhookEvent.findMany({ where: { provider: "stripe", providerEventId: id } });

  beforeAll(async () => {
    for (const name of STRIPE_ENV) delete process.env[name];
    fixture = await createEventFixture();
    unpaidFixture = await createEventFixture();
    actors.set(fixture.userId, { userId: fixture.userId, roles: ["CUSTOMER_HOST"] });
  });

  afterAll(async () => {
    for (const name of STRIPE_ENV) {
      const value = savedEnv[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await db.webhookEvent.deleteMany({
      where: { provider: "stripe", providerEventId: { in: stripeEventIds } },
    });
    await fixture?.cleanup();
    await unpaidFixture?.cleanup();
  });

  it("answers 503 when Stripe is not configured, even for a well-signed request", async () => {
    const event = newStripeEvent("customer.created", { id: "cus_test" });

    const noKeys = await deliver(app, event.payload);
    expect(noKeys.status).toBe(503);
    expect((await errorOf(noKeys)).code).toBe("PAYMENTS_NOT_CONFIGURED");

    // A secret key alone is not enough: without a signing secret nothing can be verified.
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY;
    try {
      const noSecret = await deliver(app, event.payload);
      expect(noSecret.status).toBe(503);

      // The placeholder secret from the legacy test wrappers would accept forged events.
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock_local_only";
      const placeholder = await deliver(
        app,
        event.payload,
        signStripePayload(event.payload, "whsec_mock_local_only"),
      );
      expect(placeholder.status).toBe(503);
      expect((await errorOf(placeholder)).code).toBe("PAYMENTS_NOT_CONFIGURED");
    } finally {
      for (const name of STRIPE_ENV) delete process.env[name];
    }
    expect(await storedEvents(event.id)).toEqual([]);
  });

  it("rejects a missing, wrong, tampered or expired signature and stores nothing", async () => {
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_STRIPE_WEBHOOK_SECRET;
    try {
      const event = newStripeEvent("checkout.session.completed", {
        id: "cs_test_forged",
        object: "checkout.session",
        payment_status: "paid",
        metadata: { invitationId: fixture.invitationId },
      });
      const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;

      const attempts: Array<[string, string | null]> = [
        [event.payload, null],
        [event.payload, ""],
        [event.payload, "not-a-signature"],
        [event.payload, `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`],
        // Signed with a different secret.
        [event.payload, signStripePayload(event.payload, `whsec_${"wrong0secret".repeat(3)}`)],
        // A real signature, but for a different body.
        [
          event.payload.replace("cs_test_forged", "cs_test_other"),
          signStripePayload(event.payload),
        ],
        // A real signature that is too old to accept (replay).
        [
          event.payload,
          signStripePayload(event.payload, TEST_STRIPE_WEBHOOK_SECRET, tenMinutesAgo),
        ],
      ];
      for (const [payload, signature] of attempts) {
        const res = await deliver(app, payload, signature);
        expect(res.status).toBe(400);
        expect((await errorOf(res)).code).toBe("INVALID_SIGNATURE");
      }

      expect(await storedEvents(event.id)).toEqual([]);
      expect(await db.payment.count({ where: { invitationId: fixture.invitationId } })).toBe(0);
      const invitation = await db.invitation.findUniqueOrThrow({
        where: { id: fixture.invitationId },
      });
      expect(invitation.plan).toBe("FREE");
    } finally {
      for (const name of STRIPE_ENV) delete process.env[name];
    }
  });

  it("stores a verified event once and acknowledges a redelivery", async () => {
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_STRIPE_WEBHOOK_SECRET;
    try {
      const event = newStripeEvent("customer.created", { id: "cus_test", object: "customer" });

      const first = await deliver(app, event.payload);
      expect(first.status).toBe(200);
      expect(await first.json()).toEqual({ received: true });

      const second = await deliver(app, event.payload);
      expect(second.status).toBe(200);
      expect(await second.json()).toEqual({ received: true });

      const rows = await storedEvents(event.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toMatch(/^whk_/);
      expect(rows[0]).toMatchObject({ provider: "stripe", type: "customer.created" });
      expect(rows[0]?.processedAt).toBeInstanceOf(Date);
      // The raw event is kept exactly as Stripe sent it.
      expect(rows[0]?.payloadJson).toEqual(JSON.parse(event.payload));
    } finally {
      for (const name of STRIPE_ENV) delete process.env[name];
    }
  });

  it("upgrades the invitation from what Stripe reports, not from what the event claims", async () => {
    // The event body says "paid", but the session retrieved from Stripe is still unpaid.
    const session = stripe.addSession({
      metadata: {
        invitationId: unpaidFixture.invitationId,
        eventId: unpaidFixture.eventId,
        userId: unpaidFixture.userId,
      },
    });
    const event = newStripeEvent("checkout.session.completed", {
      id: session.id,
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 6900,
      currency: "aud",
      payment_intent: "pi_test_claimed",
      metadata: session.metadata,
    });

    const res = await deliver(stripeApp, event.payload);
    expect(res.status).toBe(200);
    expect(stripe.requests.at(-1)).toMatchObject({
      method: "GET",
      path: `/v1/checkout/sessions/${session.id}`,
    });

    expect(await db.payment.count({ where: { invitationId: unpaidFixture.invitationId } })).toBe(0);
    const invitation = await db.invitation.findUniqueOrThrow({
      where: { id: unpaidFixture.invitationId },
    });
    expect(invitation.plan).toBe("FREE");
    expect((await storedEvents(event.id))[0]?.processedAt).toBeInstanceOf(Date);
  });

  it("applies a paid checkout exactly once across redeliveries, new event ids and the confirm route", async () => {
    const session = stripe.addSession({
      metadata: {
        invitationId: fixture.invitationId,
        eventId: fixture.eventId,
        userId: fixture.userId,
      },
    });
    const paymentIntentId = stripe.markPaid(session.id);
    const sessionObject = { id: session.id, object: "checkout.session", payment_status: "paid" };
    const event = newStripeEvent("checkout.session.completed", sessionObject);

    const first = await deliver(stripeApp, event.payload);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });

    const payments = await db.payment.findMany({ where: { invitationId: fixture.invitationId } });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      kind: "INVITATION_PASS",
      status: "SUCCEEDED",
      method: "CARD",
      amountIncGstCents: 6900,
      gstCents: 627,
      amountExGstCents: 6273,
      stripePaymentIntentId: paymentIntentId,
      idempotencyKey: `checkout:${session.id}`,
    });
    const upgraded = await db.invitation.findUniqueOrThrow({ where: { id: fixture.invitationId } });
    expect(upgraded.plan).toBe("PREMIUM");

    const audit = await db.auditLog.findMany({
      where: { entityId: fixture.invitationId, action: "plan.upgrade" },
    });
    expect(audit).toHaveLength(1);
    // Attributed to the host who started the checkout, from the session metadata.
    expect(audit[0]).toMatchObject({ actorUserId: fixture.userId, actorRole: "CUSTOMER_HOST" });
    expect(audit[0]?.diffJson).toMatchObject({ from: "FREE", to: "PREMIUM", source: "webhook" });

    // The same event again: acknowledged without asking Stripe or touching the database.
    const requestsBefore = stripe.requests.length;
    const redelivered = await deliver(stripeApp, event.payload);
    expect(redelivered.status).toBe(200);
    expect(stripe.requests.length).toBe(requestsBefore);

    // A different event for the same session (Stripe can send more than one).
    const sibling = newStripeEvent("checkout.session.async_payment_succeeded", sessionObject);
    expect((await deliver(stripeApp, sibling.payload)).status).toBe(200);

    // The host landing on the success page after the webhook already did the work.
    const confirmed = await stripeApp.request(
      `/v1/events/${fixture.eventId}/plan/checkout/confirm`,
      jsonRequest("POST", { sessionId: session.id }, { [TEST_ACTOR_HEADER]: fixture.userId }),
    );
    expect(confirmed.status).toBe(200);
    expect(PlanViewSchema.parse(await confirmed.json()).plan).toBe("PREMIUM");

    expect(await db.payment.count({ where: { invitationId: fixture.invitationId } })).toBe(1);
    expect(
      await db.auditLog.count({
        where: { entityId: fixture.invitationId, action: "plan.upgrade" },
      }),
    ).toBe(1);
    expect(await storedEvents(event.id)).toHaveLength(1);
    expect((await storedEvents(sibling.id))[0]?.processedAt).toBeInstanceOf(Date);
  });

  it("acknowledges a paid session it cannot apply, so Stripe stops redelivering", async () => {
    // An invitation that does not exist (for example, removed after the checkout started).
    const orphan = stripe.addSession({
      metadata: { invitationId: generateId("inv_"), eventId: generateId("evt_"), userId: null },
    });
    stripe.markPaid(orphan.id);
    // A session Stripe does not know at all.
    for (const object of [
      { id: orphan.id, object: "checkout.session" },
      { id: "cs_test_never_existed", object: "checkout.session" },
    ]) {
      const event = newStripeEvent("checkout.session.completed", object);
      const res = await deliver(stripeApp, event.payload);
      expect(res.status).toBe(200);
      expect((await storedEvents(event.id))[0]?.processedAt).toBeInstanceOf(Date);
    }
    expect(await db.payment.count({ where: { idempotencyKey: `checkout:${orphan.id}` } })).toBe(0);
  });
});
