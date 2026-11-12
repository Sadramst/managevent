/**
 * Plan view and the Premium Event Pass checkout.
 *
 * Prices come from `INVITATION_PLANS` and GST from `splitIncGstCents`; nothing here does money
 * arithmetic of its own.
 */
import type { AuthActor } from "@managevent/auth";
import {
  INVITATION_PLANS,
  type InvitationPlanEntitlements,
  isStripeCheckoutConfigured,
  splitIncGstCents,
} from "@managevent/payments";
import type {
  CheckoutConfirm,
  CheckoutSession,
  PlanEntitlements,
  PlanView,
} from "@managevent/validators";
import { type EventAccess, requireEventAccess } from "../../lib/access.js";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps } from "../../lib/deps.js";
import { getPublicAppUrl } from "../../lib/env.js";
import { ApiProblem, notFound } from "../../lib/errors.js";
import { assertNotDemo, type RequestMeta } from "../events/service.js";
import { countPlanUsage } from "./repo.js";
import {
  callStripe,
  getStripeClient,
  isStripeResourceMissing,
  type StripeClientFactory,
} from "./stripe-client.js";
import {
  applyCheckoutUpgrade,
  closeOtherCheckoutSessions,
  invitationIdOfSession,
} from "./upgrade.js";

type UpgradeBlock = "ALREADY_PREMIUM" | "MEMORIAL_COMPLIMENTARY";

/**
 * Why this invitation cannot buy the pass, apart from payments being unavailable.
 * A memorial invitation is never charged: it has the Premium features for free.
 */
function upgradeBlock(access: EventAccess): UpgradeBlock | null {
  if (access.invitation.plan !== "FREE") return "ALREADY_PREMIUM";
  if (access.event.experienceMode === "MEMORIAL") return "MEMORIAL_COMPLIMENTARY";
  return null;
}

const limitOf = (value: number | "unlimited"): number | null =>
  value === "unlimited" ? null : value;

/** The public entitlements: everything except the retired bilingual flag. */
function toPlanEntitlements(plan: InvitationPlanEntitlements): PlanEntitlements {
  return {
    plan: plan.plan,
    label: plan.label,
    priceIncGstCents: plan.priceIncGstCents,
    maxGuests: plan.maxGuests,
    maxEmailInvitations: plan.maxEmailInvitations,
    allThemesAndAnimations: plan.allThemesAndAnimations,
    rsvpAndDietary: plan.rsvpAndDietary,
    rsvpReminders: plan.rsvpReminders,
    customEventSlug: plan.customEventSlug,
    fullMusicLibraryAndUpload: plan.fullMusicLibraryAndUpload,
    allGateStyles: plan.allGateStyles,
    qrPassesAndCheckin: plan.qrPassesAndCheckin,
    livePhotoWallAndDisplay: plan.livePhotoWallAndDisplay,
    wellAndTributeExport: plan.wellAndTributeExport,
    bulkSmsAndWhatsapp: plan.bulkSmsAndWhatsapp,
    pinProtection: plan.pinProtection,
    removeBranding: plan.removeBranding,
    automaticLogisticsBridge: plan.automaticLogisticsBridge,
  };
}

async function buildPlanView(
  deps: ApiDeps,
  access: EventAccess,
  stripeConfigured: boolean,
): Promise<PlanView> {
  const { invitation, event, effectivePlan } = access;
  const usage = await countPlanUsage(deps.db, invitation.id, event.id);
  const block = upgradeBlock(access);
  const unavailableReason = block ?? (stripeConfigured ? null : "PAYMENTS_NOT_CONFIGURED");
  const price = splitIncGstCents(INVITATION_PLANS.PREMIUM.priceIncGstCents, "GST");

  return {
    plan: invitation.plan,
    effectivePlan: effectivePlan.plan,
    experienceMode: event.experienceMode,
    memorialComplimentary: block === "MEMORIAL_COMPLIMENTARY",
    entitlements: toPlanEntitlements(effectivePlan),
    usage: {
      guests: usage.guests,
      guestLimit: limitOf(effectivePlan.maxGuests),
      emailsSent: usage.emailsSent,
      emailLimit: limitOf(effectivePlan.maxEmailInvitations),
    },
    upgrade: {
      available: unavailableReason === null,
      unavailableReason,
      priceIncGstCents: price.amountIncGstCents,
      gstCents: price.gstCents,
      currency: "AUD",
    },
  };
}

export async function getPlanView(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
): Promise<PlanView> {
  const access = await requireEventAccess(deps, actor, eventId, "event:read");
  return buildPlanView(deps, access, isStripeCheckoutConfigured());
}

export async function startCheckout(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
  idempotencyKey: string,
  meta: RequestMeta,
  createStripe: StripeClientFactory,
): Promise<CheckoutSession> {
  const access = await requireEventAccess(deps, actor, eventId, "payment:create");
  assertNotDemo(access);
  const userId = actor?.userId;
  if (!userId) throw new ApiProblem(403, "FORBIDDEN", "A signed-in account is required to pay");

  const block = upgradeBlock(access);
  if (block === "ALREADY_PREMIUM") {
    throw new ApiProblem(409, "ALREADY_PREMIUM", "This invitation already has the Premium pass");
  }
  if (block === "MEMORIAL_COMPLIMENTARY") {
    throw new ApiProblem(
      409,
      "MEMORIAL_COMPLIMENTARY",
      "Memorial invitations include every Premium feature at no charge",
    );
  }

  const stripe = getStripeClient(createStripe);
  const studioSettingsUrl = `${getPublicAppUrl("INVITATION")}/studio/${encodeURIComponent(eventId)}/settings`;
  const session = await callStripe(() =>
    stripe.createInvitationUpgradeSession({
      invitationId: access.invitation.id,
      eventId,
      userId,
      // Stripe replaces {CHECKOUT_SESSION_ID} itself; it must reach Stripe unencoded.
      successUrl: `${studioSettingsUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${studioSettingsUrl}?checkout=cancelled`,
      // Scoped to the invitation, so one client key can never replay another event's session.
      idempotencyKey: `checkout:${access.invitation.id}:${idempotencyKey}`,
    }),
  );

  // One open checkout per invitation: a session started earlier (another tab, a co-host) is
  // closed, so the pass cannot be paid for twice. A repeat with the same Idempotency-Key gets
  // the same session back from Stripe, and that one is kept.
  await closeOtherCheckoutSessions(deps, stripe, access.invitation.id, session.sessionId);

  await writeAudit(deps.db, {
    actor,
    action: "plan.checkout_started",
    entity: "Invitation",
    entityId: access.invitation.id,
    diff: {
      eventId,
      plan: "PREMIUM",
      amountIncGstCents: INVITATION_PLANS.PREMIUM.priceIncGstCents,
      // Kept so the session can be closed if another one is started or paid first.
      checkoutSessionId: session.sessionId,
    },
    ...(meta.ip ? { ip: meta.ip } : {}),
  });

  return { checkoutUrl: session.checkoutUrl };
}

export async function confirmCheckout(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
  input: CheckoutConfirm,
  meta: RequestMeta,
  createStripe: StripeClientFactory,
): Promise<PlanView> {
  const access = await requireEventAccess(deps, actor, eventId, "payment:create");
  assertNotDemo(access);

  const stripe = getStripeClient(createStripe);
  const session = await callStripe(() => stripe.retrieveCheckoutSession(input.sessionId)).catch(
    (err: unknown) => {
      if (isStripeResourceMissing(err)) throw notFound("Checkout session not found");
      throw err;
    },
  );
  // A session for another invitation is answered exactly like one that does not exist.
  if (invitationIdOfSession(session) !== access.invitation.id) {
    throw notFound("Checkout session not found");
  }

  await applyCheckoutUpgrade(deps, {
    session,
    actor,
    source: "confirm",
    stripe,
    ...(meta.ip ? { ip: meta.ip } : {}),
  });

  const refreshed = await requireEventAccess(deps, actor, eventId, "event:read");
  return buildPlanView(deps, refreshed, true);
}
