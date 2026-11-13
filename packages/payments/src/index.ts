/**
 * @managevent/payments
 *
 * Money (AUD integer cents), Australian GST (10%) per-line rounding and summation,
 * ATO Tax Invoice builder, invitation plans and entitlements, real Stripe Checkout (`./checkout`).
 */

export {
  assertIntegerCents,
  assertNonNegativeCents,
  divRoundHalfUp,
  formatAudCents,
  type PricedInvoiceTotals,
  type PricedLineAmounts,
  priceLineFromUnitExGst,
  priceLineFromUnitIncGst,
  splitExGstCents,
  splitIncGstCents,
  splitSignedIncGstCents,
  sumPricedLines,
} from "./gst.js";

export {
  buildDefaultPaymentSchedule,
  buildTaxInvoice,
  type CreateTaxInvoiceInput,
  formatTaxInvoiceNumber,
  type PaymentScheduleMilestone,
} from "./invoice.js";

export {
  type CheckoutSessionSnapshot,
  type CreateInvitationUpgradeSessionParams,
  createSimulatedCheckoutClient,
  createStripeCheckoutClient,
  type InvitationUpgradeSession,
  isCheckoutAvailable,
  isSimulatedCheckoutEnabled,
  isStripeCheckoutConfigured,
  isStripeWebhookConfigured,
  type PaymentsConfigGap,
  PaymentsNotConfiguredError,
  type StripeCheckoutClient,
  type StripeCheckoutClientOptions,
  StripeWebhookSignatureError,
  type VerifiedStripeWebhookEvent,
} from "./checkout.js";

export {
  type BooleanEntitlementKey,
  canAddGuestsUnderPlan,
  FREE_PARTY_LINK_LIMIT,
  hasInvitationEntitlement,
  getInvitationPlan,
  INVITATION_PLANS,
  type InvitationPlanEntitlements,
  isPartyLinkUnlocked,
} from "./plans.js";

