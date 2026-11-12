/**
 * Applying a paid Premium Event Pass to an invitation. Shared by the confirm route (the host
 * returning from Stripe) and the Stripe webhook, whichever arrives first.
 *
 * One transaction writes the `Payment`, sets `Invitation.plan = PREMIUM` and writes the audit
 * entry. The payment is unique on its Stripe payment intent and on `checkout:{sessionId}`, so the
 * second arrival finds the work done and reports success.
 *
 * Two different sessions can be paid for one invitation (owner and co-host, or two tabs, each
 * starting checkout before either pays). The pass can only be granted once, so the second
 * payment bought nothing. It is still recorded, because the money was taken, but under its own
 * audit action (`plan.duplicate_payment`) and with an error-level log line, so it is found and
 * refunded instead of sitting in the ledger looking like a normal sale. To make it rare in the
 * first place, the invitation's other open sessions are closed when checkout starts and again
 * once a payment is applied (`closeOtherCheckoutSessions`).
 */
import type { AuthActor } from "@managevent/auth";
import {
  type CheckoutSessionSnapshot,
  INVITATION_PLANS,
  splitIncGstCents,
  type StripeCheckoutClient,
} from "@managevent/payments";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps } from "../../lib/deps.js";
import { ApiProblem, isUniqueViolation, notFound } from "../../lib/errors.js";
import {
  createInvitationPassPayment,
  findInvitationForPayment,
  listRecentCheckoutSessionIds,
  setInvitationPlan,
} from "./repo.js";

/**
 * - `APPLIED`: this payment bought the pass.
 * - `ALREADY_APPLIED`: this same payment had been recorded before (confirm and webhook).
 * - `DUPLICATE_PAYMENT`: a second, different payment for an invitation that already had the
 *   pass. Recorded and flagged for a refund.
 */
export type UpgradeOutcome = "APPLIED" | "ALREADY_APPLIED" | "DUPLICATE_PAYMENT";

/**
 * Closes every other Checkout Session that was started for the invitation and may still be open,
 * so it cannot be paid as well. Best effort: a failure here must not undo or hide a payment that
 * has been applied, and a duplicate that slips through is still caught when it arrives.
 */
export async function closeOtherCheckoutSessions(
  deps: ApiDeps,
  stripe: StripeCheckoutClient,
  invitationId: string,
  keepSessionId: string,
): Promise<number> {
  let closed = 0;
  try {
    const sessionIds = await listRecentCheckoutSessionIds(deps.db, invitationId, deps.now());
    for (const sessionId of sessionIds) {
      if (sessionId === keepSessionId) continue;
      if (await stripe.expireCheckoutSession(sessionId)) closed += 1;
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "could not close other checkout sessions",
          invitationId,
          error: err instanceof Error ? err.name : "UnknownError",
        }),
      );
    }
  }
  return closed;
}

export function checkoutIdempotencyKey(sessionId: string): string {
  return `checkout:${sessionId}`;
}

/** The invitation a Checkout Session was created for, from the metadata we set on it. */
export function invitationIdOfSession(session: CheckoutSessionSnapshot): string | null {
  return session.metadata.invitationId ?? session.clientReferenceId;
}

function paymentNotCompleted(): ApiProblem {
  return new ApiProblem(409, "PAYMENT_NOT_COMPLETED", "The payment has not been completed");
}

export async function applyCheckoutUpgrade(
  deps: ApiDeps,
  input: {
    /** A session retrieved from Stripe, never one taken from a request body. */
    session: CheckoutSessionSnapshot;
    actor: AuthActor | null;
    source: "confirm" | "webhook";
    ip?: string;
    /** When given, the invitation's other open sessions are closed once this one is applied. */
    stripe?: StripeCheckoutClient;
  },
): Promise<UpgradeOutcome> {
  const { session } = input;
  const invitationId = invitationIdOfSession(session);
  if (!invitationId) throw notFound("Checkout session not found");
  if (session.paymentStatus !== "paid" || !session.paymentIntentId) throw paymentNotCompleted();

  // The pass has one price. A session for any other amount or currency is not a pass purchase,
  // and recording the plan price for it would put a false figure in the ledger.
  const priceIncGstCents = INVITATION_PLANS.PREMIUM.priceIncGstCents;
  if (session.amountTotalCents !== priceIncGstCents || session.currency?.toLowerCase() !== "aud") {
    throw paymentNotCompleted();
  }
  const amounts = splitIncGstCents(priceIncGstCents, "GST");
  const stripePaymentIntentId = session.paymentIntentId;

  let outcome: { duplicate: boolean; paymentId: string };
  try {
    outcome = await deps.db.$transaction(async (tx) => {
      const invitation = await findInvitationForPayment(tx, invitationId);
      if (!invitation) throw notFound("Invitation not found");
      // The plan is read under the row lock, so two payments arriving together are judged one
      // after the other and exactly one of them is the upgrade.
      const duplicate = invitation.plan !== "FREE";

      const payment = await createInvitationPassPayment(tx, {
        invitationId,
        amountExGstCents: amounts.amountExGstCents,
        gstCents: amounts.gstCents,
        amountIncGstCents: amounts.amountIncGstCents,
        stripePaymentIntentId,
        idempotencyKey: checkoutIdempotencyKey(session.sessionId),
        paidAt: deps.now(),
      });
      // An agency-managed invitation already has everything; never move it down to PREMIUM.
      const nextPlan = invitation.plan === "FREE" ? "PREMIUM" : invitation.plan;
      await setInvitationPlan(tx, invitationId, nextPlan);

      await writeAudit(tx, {
        actor: input.actor,
        // A payment that changed nothing is not an upgrade: it is money to give back.
        action: duplicate ? "plan.duplicate_payment" : "plan.upgrade",
        entity: "Invitation",
        entityId: invitationId,
        diff: {
          eventId: invitation.eventId,
          from: invitation.plan,
          to: nextPlan,
          paymentId: payment.id,
          checkoutSessionId: session.sessionId,
          amountIncGstCents: amounts.amountIncGstCents,
          gstCents: amounts.gstCents,
          source: input.source,
          ...(duplicate ? { refundDue: true } : {}),
        },
        ...(input.ip ? { ip: input.ip } : {}),
      });
      return { duplicate, paymentId: payment.id };
    });
  } catch (err) {
    // The payment row already exists: the other path (webhook or confirm) got here first.
    if (isUniqueViolation(err)) return "ALREADY_APPLIED";
    throw err;
  }

  if (input.stripe) {
    await closeOtherCheckoutSessions(deps, input.stripe, invitationId, session.sessionId);
  }
  if (!outcome.duplicate) return "APPLIED";

  if (process.env.NODE_ENV !== "test") {
    // Identifiers only. Error level, so it reaches whoever watches the API's alerts.
    console.error(
      JSON.stringify({
        level: "error",
        msg: "duplicate invitation pass payment: refund required",
        invitationId,
        paymentId: outcome.paymentId,
        source: input.source,
      }),
    );
  }
  return "DUPLICATE_PAYMENT";
}
