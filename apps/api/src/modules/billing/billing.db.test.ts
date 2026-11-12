/**
 * Plan view and the Premium Event Pass checkout against the real database.
 *
 * Without Stripe credentials the API says so (503). The paid path runs the real `stripe` SDK over
 * a local transport (`test/stripe.ts`), so request building, parsing and the upgrade transaction
 * are all exercised without contacting Stripe.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthActor } from "@managevent/auth";
import { db, generateId } from "@managevent/db";
import {
  ApiErrorSchema,
  CheckoutSessionSchema,
  type HostEventDetail,
  HostEventDetailSchema,
  MeResponseSchema,
  type PlanView,
  PlanViewSchema,
} from "@managevent/validators";
import { createDefaultDeps } from "../../lib/deps.js";
import { InMemoryJobQueue } from "../../lib/queue.js";
import { dbAvailable, uniqueTestSuffix } from "../../test/db.js";
import {
  createHostTestApp,
  createTestUser,
  jsonRequest,
  TEST_ACTOR_HEADER,
  type TestUser,
} from "../../test/hosts.js";
import {
  createBillingTestApp,
  createStripeTestTransport,
  TEST_STRIPE_SECRET_KEY,
} from "../../test/stripe.js";

const STRIPE_ENV = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;

describe.skipIf(!dbAvailable)("billing (database)", () => {
  const savedEnv = Object.fromEntries(STRIPE_ENV.map((name) => [name, process.env[name]]));
  const { app, actAs } = createHostTestApp();
  const deps = createDefaultDeps({ queue: new InMemoryJobQueue() });
  const stripe = createStripeTestTransport();
  const actors = new Map<string, AuthActor>();
  const stripeApp = createBillingTestApp(deps, stripe.createStripeClient, actors);

  let host: TestUser;
  let stranger: TestUser;
  let asHost: Record<string, string>;
  let asStranger: Record<string, string>;
  let wedding: HostEventDetail;
  let memorial: HostEventDetail;
  let birthday: HostEventDetail;

  async function errorOf(res: Response) {
    return ApiErrorSchema.parse(await res.json()).error;
  }

  async function createEvent(body: Record<string, unknown>): Promise<HostEventDetail> {
    const res = await app.request(
      "/v1/events",
      jsonRequest(
        "POST",
        { startsAtLocal: "2031-06-01T16:00", hosts: "The hosts", ...body },
        asHost,
      ),
    );
    expect(res.status).toBe(201);
    return HostEventDetailSchema.parse(await res.json());
  }

  async function planOf(eventId: string, headers = asHost): Promise<PlanView> {
    const res = await app.request(`/v1/events/${eventId}/plan`, { headers });
    expect(res.status).toBe(200);
    return PlanViewSchema.parse(await res.json());
  }

  function checkout(
    target: { request: typeof app.request },
    eventId: string,
    headers: Record<string, string>,
    key: string | null = `key-${uniqueTestSuffix()}`,
  ) {
    return target.request(
      `/v1/events/${eventId}/plan/checkout`,
      jsonRequest("POST", {}, { ...headers, ...(key ? { "idempotency-key": key } : {}) }),
    );
  }

  function confirm(
    target: { request: typeof app.request },
    eventId: string,
    sessionId: string,
    headers = asHost,
  ) {
    return target.request(
      `/v1/events/${eventId}/plan/checkout/confirm`,
      jsonRequest("POST", { sessionId }, headers),
    );
  }

  beforeAll(async () => {
    // No Stripe credentials, whatever the developer's .env holds.
    for (const name of STRIPE_ENV) delete process.env[name];

    host = await createTestUser();
    stranger = await createTestUser();
    asHost = actAs(host);
    asStranger = actAs(stranger);
    actors.set(host.id, host.actor);
    actors.set(stranger.id, stranger.actor);

    wedding = await createEvent({
      title: "Billing wedding",
      ceremonySlug: "wedding",
      templateSlug: "royal-classic",
    });
    memorial = await createEvent({
      title: "Billing memorial",
      ceremonySlug: "memorial-service",
      templateSlug: "memorial-calm",
    });
    birthday = await createEvent({
      title: "Billing birthday",
      ceremonySlug: "birthday",
      templateSlug: "modern-minimal",
    });
  });

  afterAll(async () => {
    for (const name of STRIPE_ENV) {
      const value = savedEnv[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await host?.cleanup();
    await stranger?.cleanup();
  });

  describe("plan view", () => {
    it("shows the FREE plan, its limits and the pass price for a celebration", async () => {
      const view = await planOf(wedding.id);
      expect(view).toMatchObject({
        plan: "FREE",
        effectivePlan: "FREE",
        experienceMode: "CELEBRATION",
        memorialComplimentary: false,
        usage: { guests: 0, guestLimit: 30, emailsSent: 0, emailLimit: 50 },
        upgrade: {
          // No Stripe credentials on this deployment: the UI must not offer a checkout.
          available: false,
          unavailableReason: "PAYMENTS_NOT_CONFIGURED",
          priceIncGstCents: 6900,
          // GST is one eleventh of the inclusive price, from @managevent/payments.
          gstCents: 627,
          currency: "AUD",
        },
      });
      expect(view.entitlements).toMatchObject({
        plan: "FREE",
        priceIncGstCents: 0,
        maxGuests: 30,
        maxEmailInvitations: 50,
        allThemesAndAnimations: false,
        rsvpAndDietary: true,
        rsvpReminders: false,
        customEventSlug: false,
        allGateStyles: false,
        qrPassesAndCheckin: false,
        removeBranding: false,
      });
      // The retired bilingual flag is never surfaced.
      expect(view.entitlements).not.toHaveProperty("bilingualEnFa");
    });

    it("gives a memorial invitation complimentary Premium and never offers an upgrade", async () => {
      const view = await planOf(memorial.id);
      expect(view).toMatchObject({
        plan: "FREE",
        effectivePlan: "PREMIUM",
        experienceMode: "MEMORIAL",
        memorialComplimentary: true,
        usage: { guests: 0, guestLimit: null, emailsSent: 0, emailLimit: null },
        upgrade: { available: false, unavailableReason: "MEMORIAL_COMPLIMENTARY" },
      });
      expect(view.entitlements).toMatchObject({
        plan: "PREMIUM",
        priceIncGstCents: 0,
        maxGuests: "unlimited",
        maxEmailInvitations: "unlimited",
        allThemesAndAnimations: true,
        rsvpReminders: true,
        qrPassesAndCheckin: true,
        removeBranding: true,
      });
    });

    it("counts live guests and sent emails as usage", async () => {
      const partyId = generateId("pty_");
      const otherPartyId = generateId("pty_");
      await db.party.createMany({
        data: [
          {
            id: partyId,
            invitationId: wedding.invitation.id,
            stableId: `s_${uniqueTestSuffix()}`,
            displayName: { en: "The Usage family" },
            token: `usage-${uniqueTestSuffix().slice(0, 6)}-abcdefgh`,
            maxSeats: 3,
            tags: [],
          },
          {
            id: otherPartyId,
            invitationId: wedding.invitation.id,
            stableId: `s_${uniqueTestSuffix()}`,
            displayName: { en: "Removed party" },
            token: `removed-${uniqueTestSuffix().slice(0, 6)}-abcdefgh`,
            tags: [],
            deletedAt: new Date(),
          },
        ],
      });
      await db.guest.createMany({
        data: [
          { id: generateId("gst_"), partyId, stableId: "g1", name: { en: "One" } },
          { id: generateId("gst_"), partyId, stableId: "g2", name: { en: "Two" } },
          // Neither a removed guest nor a guest of a removed party counts.
          {
            id: generateId("gst_"),
            partyId,
            stableId: "g3",
            name: { en: "Gone" },
            deletedAt: new Date(),
          },
          {
            id: generateId("gst_"),
            partyId: otherPartyId,
            stableId: "g4",
            name: { en: "Gone too" },
          },
        ],
      });
      await db.message.createMany({
        data: [
          {
            id: generateId("msg_"),
            channel: "EMAIL",
            to: "hash-one",
            templateKey: "invitation.send",
            locale: "en",
            eventId: wedding.id,
            status: "SENT",
            providerId: `test-${uniqueTestSuffix()}`,
          },
          {
            id: generateId("msg_"),
            channel: "EMAIL",
            to: "hash-two",
            templateKey: "invitation.send",
            locale: "en",
            eventId: wedding.id,
            status: "FAILED",
            providerId: `test-${uniqueTestSuffix()}`,
          },
        ],
      });

      const view = await planOf(wedding.id);
      expect(view.usage).toEqual({ guests: 2, guestLimit: 30, emailsSent: 1, emailLimit: 50 });
    });

    it("offers the upgrade only when Stripe is really configured", async () => {
      // The well-known placeholder key is treated exactly like no key.
      process.env.STRIPE_SECRET_KEY = "sk_test_mock_local_only";
      try {
        expect((await planOf(wedding.id)).upgrade).toMatchObject({
          available: false,
          unavailableReason: "PAYMENTS_NOT_CONFIGURED",
        });
        process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY;
        expect((await planOf(wedding.id)).upgrade).toMatchObject({
          available: true,
          unavailableReason: null,
        });
        const me = MeResponseSchema.parse(await (await app.request("/v1/me")).json());
        expect(me.capabilities.stripeCheckout).toBe(true);
      } finally {
        delete process.env.STRIPE_SECRET_KEY;
      }
      const me = MeResponseSchema.parse(await (await app.request("/v1/me")).json());
      expect(me.capabilities.stripeCheckout).toBe(false);
    });

    it("is hidden from other hosts and needs a session", async () => {
      const other = await app.request(`/v1/events/${wedding.id}/plan`, { headers: asStranger });
      expect(other.status).toBe(404);
      const anonymous = await app.request(`/v1/events/${wedding.id}/plan`);
      expect(anonymous.status).toBe(401);
    });
  });

  describe("checkout without Stripe credentials", () => {
    it("answers 503 PAYMENTS_NOT_CONFIGURED and creates nothing", async () => {
      const res = await checkout(app, wedding.id, asHost);
      expect(res.status).toBe(503);
      expect((await errorOf(res)).code).toBe("PAYMENTS_NOT_CONFIGURED");

      // The placeholder key from the legacy test wrappers must never reach Stripe either.
      process.env.STRIPE_SECRET_KEY = "sk_test_mock_local_only";
      try {
        const placeholder = await checkout(app, wedding.id, asHost);
        expect(placeholder.status).toBe(503);
        expect((await errorOf(placeholder)).code).toBe("PAYMENTS_NOT_CONFIGURED");
      } finally {
        delete process.env.STRIPE_SECRET_KEY;
      }

      const confirmed = await confirm(app, wedding.id, "cs_test_does_not_matter");
      expect(confirmed.status).toBe(503);
      expect((await errorOf(confirmed)).code).toBe("PAYMENTS_NOT_CONFIGURED");

      expect(await db.payment.count({ where: { invitationId: wedding.invitation.id } })).toBe(0);
      expect(
        await db.auditLog.count({
          where: { entityId: wedding.invitation.id, action: { startsWith: "plan." } },
        }),
      ).toBe(0);
      expect((await planOf(wedding.id)).plan).toBe("FREE");
    });

    it("still reports why an invitation cannot be upgraded at all", async () => {
      const complimentary = await checkout(app, memorial.id, asHost);
      expect(complimentary.status).toBe(409);
      expect((await errorOf(complimentary)).code).toBe("MEMORIAL_COMPLIMENTARY");
    });

    it("requires an Idempotency-Key, a session and the owner", async () => {
      const noKey = await checkout(app, wedding.id, asHost, null);
      expect(noKey.status).toBe(400);
      expect((await errorOf(noKey)).code).toBe("VALIDATION_ERROR");

      expect((await checkout(app, wedding.id, {})).status).toBe(401);
      expect((await checkout(app, wedding.id, asStranger)).status).toBe(404);

      // An editor can change the invitation but cannot pay for it.
      const coHostId = generateId("coh_");
      await db.coHost.create({
        data: { id: coHostId, eventId: wedding.id, userId: stranger.id, role: "EDITOR" },
      });
      try {
        const editor = await checkout(app, wedding.id, asStranger);
        expect(editor.status).toBe(403);
        expect((await errorOf(editor)).code).toBe("FORBIDDEN");
      } finally {
        await db.coHost.delete({ where: { id: coHostId } });
      }
    });
  });

  describe("checkout and confirm with Stripe", () => {
    const actorHeaders = () => ({ [TEST_ACTOR_HEADER]: host.id });
    let sessionId = "";

    it("creates a Checkout Session for the pass price and records only that it started", async () => {
      const key = `key-${uniqueTestSuffix()}`;
      const res = await checkout(stripeApp, wedding.id, actorHeaders(), key);
      expect(res.status).toBe(201);
      const session = CheckoutSessionSchema.parse(await res.json());
      expect(session.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);

      const sent = stripe.requests.at(-1);
      expect(sent).toMatchObject({ method: "POST", path: "/v1/checkout/sessions" });
      // The caller's key reaches Stripe, scoped to this invitation.
      expect(sent?.idempotencyKey).toBe(`checkout:${wedding.invitation.id}:${key}`);
      const form = sent?.form ?? new URLSearchParams();
      expect(form.get("mode")).toBe("payment");
      expect(form.get("client_reference_id")).toBe(wedding.invitation.id);
      expect(form.get("metadata[invitationId]")).toBe(wedding.invitation.id);
      expect(form.get("metadata[eventId]")).toBe(wedding.id);
      expect(form.get("metadata[userId]")).toBe(host.id);
      expect(form.get("line_items[0][quantity]")).toBe("1");
      expect(form.get("line_items[0][price_data][currency]")).toBe("aud");
      expect(form.get("line_items[0][price_data][unit_amount]")).toBe("6900");
      expect(form.get("success_url")).toMatch(
        new RegExp(
          `/studio/${wedding.id}/settings\\?checkout=success&session_id=\\{CHECKOUT_SESSION_ID\\}$`,
        ),
      );
      expect(form.get("cancel_url")).toMatch(
        new RegExp(`/studio/${wedding.id}/settings\\?checkout=cancelled$`),
      );

      sessionId = [...stripe.sessions.keys()].at(-1) ?? "";
      expect(sessionId).toMatch(/^cs_test_/);

      // Starting a checkout moves no money and changes no plan.
      expect(await db.payment.count({ where: { invitationId: wedding.invitation.id } })).toBe(0);
      expect((await planOf(wedding.id)).plan).toBe("FREE");
      const audit = await db.auditLog.findMany({
        where: { entityId: wedding.invitation.id, action: "plan.checkout_started" },
      });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actorUserId: host.id, entity: "Invitation" });
      expect(audit[0]?.diffJson).toEqual({
        eventId: wedding.id,
        plan: "PREMIUM",
        amountIncGstCents: 6900,
        // Kept so this session can be closed if another one is started or paid first.
        checkoutSessionId: sessionId,
      });
    });

    it("does not upgrade until Stripe reports the session paid", async () => {
      const unpaid = await confirm(stripeApp, wedding.id, sessionId, actorHeaders());
      expect(unpaid.status).toBe(409);
      expect((await errorOf(unpaid)).code).toBe("PAYMENT_NOT_COMPLETED");

      const unknown = await confirm(
        stripeApp,
        wedding.id,
        "cs_test_unknown_session",
        actorHeaders(),
      );
      expect(unknown.status).toBe(404);

      // A paid session that belongs to a different invitation is treated as unknown.
      const foreign = stripe.addSession({
        metadata: { invitationId: birthday.invitation.id, eventId: birthday.id, userId: host.id },
      });
      stripe.markPaid(foreign.id);
      const wrongEvent = await confirm(stripeApp, wedding.id, foreign.id, actorHeaders());
      expect(wrongEvent.status).toBe(404);
      expect((await errorOf(wrongEvent)).code).toBe("NOT_FOUND");

      // A paid session for the wrong amount is not a pass purchase.
      const cheap = stripe.addSession({
        amount_total: 100,
        metadata: { invitationId: wedding.invitation.id, eventId: wedding.id, userId: host.id },
      });
      stripe.markPaid(cheap.id);
      const wrongAmount = await confirm(stripeApp, wedding.id, cheap.id, actorHeaders());
      expect(wrongAmount.status).toBe(409);
      expect((await errorOf(wrongAmount)).code).toBe("PAYMENT_NOT_COMPLETED");

      expect(await db.payment.count({ where: { invitationId: wedding.invitation.id } })).toBe(0);
      expect((await planOf(wedding.id)).plan).toBe("FREE");
    });

    it("applies the upgrade once: payment, plan and audit entry in one transaction", async () => {
      const paymentIntentId = stripe.markPaid(sessionId);

      const res = await confirm(stripeApp, wedding.id, sessionId, actorHeaders());
      expect(res.status).toBe(200);
      const view = PlanViewSchema.parse(await res.json());
      expect(view).toMatchObject({
        plan: "PREMIUM",
        effectivePlan: "PREMIUM",
        usage: { guestLimit: null, emailLimit: null },
        upgrade: { available: false, unavailableReason: "ALREADY_PREMIUM" },
      });
      expect(view.entitlements.customEventSlug).toBe(true);

      const payments = await db.payment.findMany({
        where: { invitationId: wedding.invitation.id },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0]).toMatchObject({
        kind: "INVITATION_PASS",
        status: "SUCCEEDED",
        method: "CARD",
        currency: "AUD",
        amountIncGstCents: 6900,
        gstCents: 627,
        amountExGstCents: 6273,
        stripePaymentIntentId: paymentIntentId,
        idempotencyKey: `checkout:${sessionId}`,
        orderId: null,
      });
      expect(payments[0]?.paidAt).toBeInstanceOf(Date);

      const audit = await db.auditLog.findMany({
        where: { entityId: wedding.invitation.id, action: "plan.upgrade" },
      });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actorUserId: host.id, actorRole: "CUSTOMER_HOST" });
      expect(audit[0]?.diffJson).toMatchObject({
        from: "FREE",
        to: "PREMIUM",
        paymentId: payments[0]?.id,
        amountIncGstCents: 6900,
        gstCents: 627,
        source: "confirm",
      });

      // The host reloading the success page confirms again: still one payment, one audit entry.
      const again = await confirm(stripeApp, wedding.id, sessionId, actorHeaders());
      expect(again.status).toBe(200);
      expect(PlanViewSchema.parse(await again.json()).plan).toBe("PREMIUM");
      expect(await db.payment.count({ where: { invitationId: wedding.invitation.id } })).toBe(1);
      expect(
        await db.auditLog.count({
          where: { entityId: wedding.invitation.id, action: "plan.upgrade" },
        }),
      ).toBe(1);
    });

    it("refuses a second purchase for an invitation that already has the pass", async () => {
      const before = stripe.requests.length;
      const res = await checkout(stripeApp, wedding.id, actorHeaders());
      expect(res.status).toBe(409);
      expect((await errorOf(res)).code).toBe("ALREADY_PREMIUM");
      // Stripe was never asked.
      expect(stripe.requests.length).toBe(before);
    });

    it("keeps one open checkout per invitation: starting another closes the earlier one", async () => {
      const sessionOf = (id: string) => stripe.sessions.get(id);
      const start = async () => {
        const res = await checkout(stripeApp, birthday.id, actorHeaders());
        expect(res.status).toBe(201);
        CheckoutSessionSchema.parse(await res.json());
        return [...stripe.sessions.keys()].at(-1) ?? "";
      };

      // Two tabs (or the owner and a co-host) each start a checkout before either pays.
      const firstTab = await start();
      expect(sessionOf(firstTab)?.status).toBe("open");
      const secondTab = await start();
      expect(secondTab).not.toBe(firstTab);

      // The earlier session can no longer be paid; the new one can.
      expect(sessionOf(firstTab)?.status).toBe("expired");
      expect(sessionOf(secondTab)?.status).toBe("open");
      // Sessions of other invitations are left alone.
      expect([...stripe.sessions.values()].filter((s) => s.status === "expired")).toHaveLength(1);
    });

    it("flags a second payment for an invitation that already has the pass, for refund", async () => {
      const metadata = {
        invitationId: birthday.invitation.id,
        eventId: birthday.id,
        userId: host.id,
      };
      // The case the closing above cannot rule out: two sessions that were both paid.
      const one = stripe.addSession({ status: "open", metadata });
      const two = stripe.addSession({ status: "open", metadata });
      stripe.markPaid(one.id);
      stripe.markPaid(two.id);
      // A third, recorded and still open: it is closed as soon as a payment is applied.
      const stillOpen = await checkout(stripeApp, birthday.id, actorHeaders());
      expect(stillOpen.status).toBe(201);
      const stillOpenId = [...stripe.sessions.keys()].at(-1) ?? "";

      const first = await confirm(stripeApp, birthday.id, one.id, actorHeaders());
      expect(first.status).toBe(200);
      expect(PlanViewSchema.parse(await first.json()).plan).toBe("PREMIUM");
      expect(stripe.sessions.get(stillOpenId)?.status).toBe("expired");

      const second = await confirm(stripeApp, birthday.id, two.id, actorHeaders());
      expect(second.status).toBe(200);
      expect(PlanViewSchema.parse(await second.json()).plan).toBe("PREMIUM");

      // Both payments are in the ledger: the money was taken twice.
      const payments = await db.payment.findMany({
        where: { invitationId: birthday.invitation.id },
        orderBy: { createdAt: "asc" },
      });
      expect(payments).toHaveLength(2);

      // But only one of them is an upgrade. The other is marked as owed back.
      const audit = await db.auditLog.findMany({
        where: {
          entityId: birthday.invitation.id,
          action: { in: ["plan.upgrade", "plan.duplicate_payment"] },
        },
        orderBy: { at: "asc" },
      });
      expect(audit.map((row) => row.action)).toEqual(["plan.upgrade", "plan.duplicate_payment"]);
      expect(audit[0]?.diffJson).toMatchObject({
        from: "FREE",
        to: "PREMIUM",
        paymentId: payments[0]?.id,
        checkoutSessionId: one.id,
      });
      expect(audit[0]?.diffJson).not.toHaveProperty("refundDue");
      expect(audit[1]?.diffJson).toMatchObject({
        from: "PREMIUM",
        to: "PREMIUM",
        paymentId: payments[1]?.id,
        checkoutSessionId: two.id,
        refundDue: true,
        amountIncGstCents: 6900,
      });

      // Confirming either again changes nothing more.
      expect((await confirm(stripeApp, birthday.id, two.id, actorHeaders())).status).toBe(200);
      expect(await db.payment.count({ where: { invitationId: birthday.invitation.id } })).toBe(2);
      expect(
        await db.auditLog.count({
          where: { entityId: birthday.invitation.id, action: "plan.duplicate_payment" },
        }),
      ).toBe(1);
    });
  });
});
