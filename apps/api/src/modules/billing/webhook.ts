/**
 * Stripe webhook processing: verify the signature, store the raw event once, apply it once.
 *
 * `WebhookEvent` is unique on (`stripe`, event id). A redelivery of a processed event is
 * acknowledged without doing anything; a redelivery of an event whose processing failed is
 * processed again, and the payment's own unique keys make that safe.
 */
import type { AuthActor } from "@managevent/auth";
import {
  PaymentsNotConfiguredError,
  type StripeCheckoutClient,
  StripeWebhookSignatureError,
  type VerifiedStripeWebhookEvent,
} from "@managevent/payments";
import type { ApiDeps } from "../../lib/deps.js";
import { ApiProblem } from "../../lib/errors.js";
import { claimWebhookEvent, findUserRoles, markWebhookEventProcessed } from "./repo.js";
import {
  callStripe,
  getStripeClient,
  isStripeResourceMissing,
  paymentsNotConfigured,
  type StripeClientFactory,
} from "./stripe-client.js";
import { applyCheckoutUpgrade, invitationIdOfSession } from "./upgrade.js";

/** Events that can mean "this Checkout Session has been paid". */
const PAID_SESSION_EVENTS: ReadonlySet<string> = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

function invalidSignature(): ApiProblem {
  return new ApiProblem(400, "INVALID_SIGNATURE", "Webhook signature verification failed");
}

/** Identifiers only: never the payload, which carries the payer's contact details. */
function logSkipped(reason: string, event: VerifiedStripeWebhookEvent): void {
  if (process.env.NODE_ENV === "test") return;
  console.warn(
    JSON.stringify({
      level: "warn",
      msg: "stripe webhook event not applied",
      reason,
      stripeEventId: event.id,
      type: event.type,
    }),
  );
}

async function applyPaidSession(
  deps: ApiDeps,
  stripe: StripeCheckoutClient,
  event: VerifiedStripeWebhookEvent,
): Promise<void> {
  const sessionId = event.checkoutSession?.sessionId;
  if (!sessionId) return;

  // The event says a session completed; what was paid is read back from Stripe itself.
  let session;
  try {
    session = await callStripe(() => stripe.retrieveCheckoutSession(sessionId));
  } catch (err) {
    if (isStripeResourceMissing(err)) {
      logSkipped("session_not_found", event);
      return;
    }
    throw err;
  }
  // Not paid yet (a delayed payment method): Stripe sends another event when it settles.
  if (session.paymentStatus !== "paid") return;
  // A session without our metadata was not created by this API.
  if (!invitationIdOfSession(session)) return;

  let actor: AuthActor | null = null;
  if (session.metadata.userId) {
    const user = await findUserRoles(deps.db, session.metadata.userId);
    if (user) actor = { userId: user.id, roles: user.roles };
  }

  try {
    await applyCheckoutUpgrade(deps, { session, actor, source: "webhook", stripe });
  } catch (err) {
    // An invitation that no longer exists, or a session that is not a pass purchase, will not
    // become valid on a retry. Acknowledge it so Stripe stops redelivering, and leave a trace.
    if (err instanceof ApiProblem && (err.status === 404 || err.status === 409)) {
      logSkipped(err.code, event);
      return;
    }
    throw err;
  }
}

export async function handleStripeWebhook(
  deps: ApiDeps,
  input: { rawBody: string; signature: string | undefined },
  createStripe: StripeClientFactory,
): Promise<{ received: true }> {
  const stripe = getStripeClient(createStripe);

  let event: VerifiedStripeWebhookEvent;
  try {
    // Checks that a real signing secret exists before it looks at the signature, so an
    // unconfigured deployment answers 503 and never pretends to have verified anything.
    event = stripe.constructWebhookEvent(input.rawBody, input.signature ?? "");
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) throw paymentsNotConfigured();
    if (err instanceof StripeWebhookSignatureError) throw invalidSignature();
    throw err;
  }

  const stored = await claimWebhookEvent(
    deps.db,
    { provider: "stripe", providerEventId: event.id, type: event.type, payload: event.raw },
    deps.now(),
  );
  if (stored.alreadyProcessed) return { received: true };

  if (PAID_SESSION_EVENTS.has(event.type)) {
    await applyPaidSession(deps, stripe, event);
  }
  await markWebhookEventProcessed(deps.db, stored.id, deps.now());
  return { received: true };
}
