/**
 * Stripe Checkout for the Premium Event Pass, using the real `stripe` SDK.
 *
 * Nothing here ever falls back to a mock key or a mock webhook secret. When Stripe is not
 * configured, every entry point throws `PaymentsNotConfiguredError` and the API reports
 * `503 PAYMENTS_NOT_CONFIGURED`. The legacy test wrappers in `./stripe.ts` are not used.
 */
import { createHash } from "node:crypto";
import Stripe from "stripe";
import { INVITATION_PLANS } from "./plans.js";

/** Placeholder values from `./stripe.ts` that must never authenticate a real request. */
const FORBIDDEN_SECRET_KEYS: ReadonlySet<string> = new Set(["sk_test_mock_local_only"]);
const FORBIDDEN_WEBHOOK_SECRETS: ReadonlySet<string> = new Set(["whsec_mock_local_only"]);

const SECRET_KEY_PATTERN = /^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{8,}$/;
const WEBHOOK_SECRET_PATTERN = /^whsec_[A-Za-z0-9+/=_-]{8,}$/;

export type PaymentsConfigGap = "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET";

/** Thrown when a Stripe credential is missing, malformed, or one of the known placeholder values. */
export class PaymentsNotConfiguredError extends Error {
  public readonly code = "PAYMENTS_NOT_CONFIGURED" as const;
  public readonly missing: PaymentsConfigGap;

  constructor(missing: PaymentsConfigGap) {
    super(`${missing} is not configured`);
    this.name = "PaymentsNotConfiguredError";
    this.missing = missing;
  }
}

/** Thrown when a webhook body does not carry a valid `Stripe-Signature` for our secret. */
export class StripeWebhookSignatureError extends Error {
  public readonly code = "INVALID_SIGNATURE" as const;

  constructor() {
    super("Stripe webhook signature verification failed");
    this.name = "StripeWebhookSignatureError";
  }
}

function usableSecretKey(value: string | undefined): string | null {
  const key = value?.trim();
  if (!key || FORBIDDEN_SECRET_KEYS.has(key) || !SECRET_KEY_PATTERN.test(key)) return null;
  return key;
}

function usableWebhookSecret(value: string | undefined): string | null {
  const secret = value?.trim();
  if (!secret || FORBIDDEN_WEBHOOK_SECRETS.has(secret) || !WEBHOOK_SECRET_PATTERN.test(secret)) {
    return null;
  }
  return secret;
}

/** True when a real Stripe secret key is available, so Checkout Sessions can be created. */
export function isStripeCheckoutConfigured(
  secretKey: string | undefined = process.env.STRIPE_SECRET_KEY,
): boolean {
  return usableSecretKey(secretKey) !== null;
}

/** True when a real Stripe webhook signing secret is available. */
export function isStripeWebhookConfigured(
  webhookSecret: string | undefined = process.env.STRIPE_WEBHOOK_SECRET,
): boolean {
  return usableWebhookSecret(webhookSecret) !== null;
}

/**
 * True when simulated checkout is enabled for local development / E2E verification before a live
 * Stripe key is configured. Whenever a real `STRIPE_SECRET_KEY` is present, real Stripe is used.
 */
export function isSimulatedCheckoutEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (isStripeCheckoutConfigured(env.STRIPE_SECRET_KEY)) return false;
  const explicit = (env.STRIPE_SIMULATED_CHECKOUT ?? env.MANAGEVENT_SIMULATED_CHECKOUT)
    ?.trim()
    .toLowerCase();
  if (explicit === "true" || explicit === "1") return true;
  if (explicit === "false" || explicit === "0") return false;
  return env.NODE_ENV !== "production" && env.NODE_ENV !== "test";
}

/** True when either real Stripe Checkout or simulated checkout is available. */
export function isCheckoutAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return isStripeCheckoutConfigured(env.STRIPE_SECRET_KEY) || isSimulatedCheckoutEnabled(env);
}

export interface StripeCheckoutClientOptions {
  /** Defaults to `process.env.STRIPE_SECRET_KEY`. */
  secretKey?: string;
  /** Defaults to `process.env.STRIPE_WEBHOOK_SECRET`. */
  webhookSecret?: string;
  /** Transport override (tests point the real SDK at a local `fetch`). */
  fetchImpl?: typeof fetch;
}

export interface CreateInvitationUpgradeSessionParams {
  invitationId: string;
  eventId: string;
  userId: string;
  /** Absolute URL; may contain Stripe's `{CHECKOUT_SESSION_ID}` placeholder. */
  successUrl: string;
  cancelUrl: string;
  /** Caller's `Idempotency-Key`, forwarded to Stripe so a retry returns the same session. */
  idempotencyKey: string;
}

export interface InvitationUpgradeSession {
  sessionId: string;
  checkoutUrl: string;
}

export interface CheckoutSessionSnapshot {
  sessionId: string;
  /** Stripe `payment_status`: `"paid"` is the only state that grants the upgrade. */
  paymentStatus: string;
  amountTotalCents: number | null;
  currency: string | null;
  paymentIntentId: string | null;
  clientReferenceId: string | null;
  metadata: { invitationId: string | null; eventId: string | null; userId: string | null };
}

export interface VerifiedStripeWebhookEvent {
  id: string;
  type: string;
  /** The parsed, signature-verified event exactly as Stripe sent it. */
  raw: Record<string, unknown>;
  /** Present for `checkout.session.*` events. */
  checkoutSession: CheckoutSessionSnapshot | null;
}

export interface StripeCheckoutClient {
  createInvitationUpgradeSession(
    params: CreateInvitationUpgradeSessionParams,
  ): Promise<InvitationUpgradeSession>;
  retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionSnapshot>;
  /**
   * Closes an open Checkout Session so it can no longer be paid. Resolves `true` when Stripe
   * expired it, `false` when there was nothing to expire (already paid, already expired, or
   * unknown to this account).
   */
  expireCheckoutSession(sessionId: string): Promise<boolean>;
  constructWebhookEvent(rawBody: string, signatureHeader: string): VerifiedStripeWebhookEvent;
}

function toSnapshot(session: Stripe.Checkout.Session): CheckoutSessionSnapshot {
  const paymentIntent = session.payment_intent;
  const metadata = session.metadata ?? {};
  return {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    amountTotalCents: session.amount_total ?? null,
    currency: session.currency ?? null,
    paymentIntentId:
      typeof paymentIntent === "string" ? paymentIntent : (paymentIntent?.id ?? null),
    clientReferenceId: session.client_reference_id ?? null,
    metadata: {
      invitationId: metadata.invitationId ?? null,
      eventId: metadata.eventId ?? null,
      userId: metadata.userId ?? null,
    },
  };
}

/**
 * Builds the Stripe Checkout client. Throws `PaymentsNotConfiguredError` when no real secret key
 * is available; webhook verification additionally requires a real signing secret.
 */
export function createStripeCheckoutClient(
  options: StripeCheckoutClientOptions = {},
): StripeCheckoutClient {
  const secretKey = usableSecretKey(options.secretKey ?? process.env.STRIPE_SECRET_KEY);
  if (!secretKey) throw new PaymentsNotConfiguredError("STRIPE_SECRET_KEY");

  const stripe = new Stripe(secretKey, {
    maxNetworkRetries: 2,
    timeout: 20_000,
    ...(options.fetchImpl
      ? { httpClient: Stripe.createFetchHttpClient(options.fetchImpl), maxNetworkRetries: 0 }
      : {}),
  });

  return {
    async createInvitationUpgradeSession(params) {
      const premium = INVITATION_PLANS.PREMIUM;
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          client_reference_id: params.invitationId,
          metadata: {
            invitationId: params.invitationId,
            eventId: params.eventId,
            userId: params.userId,
          },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "aud",
                // GST-inclusive consumer price in integer cents, straight from the plan table.
                unit_amount: premium.priceIncGstCents,
                tax_behavior: "inclusive",
                product_data: { name: premium.label },
              },
            },
          ],
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
        },
        { idempotencyKey: params.idempotencyKey },
      );
      if (!session.url) {
        throw new Error("Stripe did not return a Checkout URL for the session");
      }
      return { sessionId: session.id, checkoutUrl: session.url };
    },

    async retrieveCheckoutSession(sessionId) {
      return toSnapshot(await stripe.checkout.sessions.retrieve(sessionId));
    },

    async expireCheckoutSession(sessionId) {
      try {
        await stripe.checkout.sessions.expire(sessionId);
        return true;
      } catch (err) {
        // "Only open sessions can be expired" and "no such session" both mean: nothing to close.
        if (err instanceof Stripe.errors.StripeInvalidRequestError) return false;
        throw err;
      }
    },

    constructWebhookEvent(rawBody, signatureHeader) {
      const webhookSecret = usableWebhookSecret(
        options.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET,
      );
      if (!webhookSecret) throw new PaymentsNotConfiguredError("STRIPE_WEBHOOK_SECRET");

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
      } catch {
        throw new StripeWebhookSignatureError();
      }
      const isCheckoutSessionEvent = event.type.startsWith("checkout.session.");
      return {
        id: event.id,
        type: event.type,
        raw: JSON.parse(rawBody) as Record<string, unknown>,
        checkoutSession: isCheckoutSessionEvent
          ? toSnapshot(event.data.object as Stripe.Checkout.Session)
          : null,
      };
    },
  };
}

interface SimulatedSessionMeta {
  invitationId: string;
  eventId: string;
  userId: string;
}

const simulatedSessions = new Map<string, SimulatedSessionMeta>();
const expiredSimulatedSessions = new Set<string>();
const SIMULATED_SESSION_PATTERN = /^cs_sim_(inv_[A-Za-z0-9_-]+)_([0-9a-f]{16})$/;

/**
 * Simulated `StripeCheckoutClient` for local development and E2E testing when no real
 * `STRIPE_SECRET_KEY` is configured. Routes through the exact same `startCheckout` and
 * `confirmCheckout` (`applyCheckoutUpgrade`) pipeline and writes real `Payment` and `AuditLog`
 * rows in PostgreSQL.
 */
export function createSimulatedCheckoutClient(): StripeCheckoutClient {
  return {
    async createInvitationUpgradeSession(params) {
      const keyDigest = createHash("sha256")
        .update(params.idempotencyKey)
        .digest("hex")
        .slice(0, 16);
      const sessionId = `cs_sim_${params.invitationId}_${keyDigest}`;
      simulatedSessions.set(sessionId, {
        invitationId: params.invitationId,
        eventId: params.eventId,
        userId: params.userId,
      });
      const checkoutUrl = `/studio/${encodeURIComponent(params.eventId)}/checkout?session_id=${encodeURIComponent(sessionId)}`;
      return { sessionId, checkoutUrl };
    },

    async retrieveCheckoutSession(sessionId) {
      const match = SIMULATED_SESSION_PATTERN.exec(sessionId);
      if (!match) {
        const missing = new Error(`No such checkout.session: '${sessionId}'`) as Error & {
          type: string;
          code: string;
        };
        missing.type = "StripeInvalidRequestError";
        missing.code = "resource_missing";
        throw missing;
      }
      const invitationId = match[1] as string;
      const keyDigest = match[2] as string;
      const stored = simulatedSessions.get(sessionId);
      const expired = expiredSimulatedSessions.has(sessionId);
      return {
        sessionId,
        paymentStatus: expired ? "unpaid" : "paid",
        amountTotalCents: INVITATION_PLANS.PREMIUM.priceIncGstCents,
        currency: "aud",
        paymentIntentId: expired ? null : `pi_sim_${invitationId}_${keyDigest}`,
        clientReferenceId: invitationId,
        metadata: {
          invitationId,
          eventId: stored?.eventId ?? null,
          userId: stored?.userId ?? null,
        },
      };
    },

    async expireCheckoutSession(sessionId) {
      if (!SIMULATED_SESSION_PATTERN.test(sessionId) || expiredSimulatedSessions.has(sessionId)) {
        return false;
      }
      expiredSimulatedSessions.add(sessionId);
      return true;
    },

    constructWebhookEvent() {
      throw new PaymentsNotConfiguredError("STRIPE_WEBHOOK_SECRET");
    },
  };
}

