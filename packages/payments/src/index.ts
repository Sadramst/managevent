/**
 * @managevent/payments
 *
 * Money (AUD integer cents), Australian GST (10%) per-line rounding and summation,
 * ATO Tax Invoice builder, invitation plans and entitlements, and Stripe test-mode wrappers.
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
  type BooleanEntitlementKey,
  canAddGuestsUnderPlan,
  hasInvitationEntitlement,
  INVITATION_PLANS,
  type InvitationPlanEntitlements,
} from "./plans.js";

export {
  assertStripeTestModeKey,
  type CreateStripeConnectTransferParams,
  type CreateStripePaymentIntentParams,
  createStripeTestConnectTransfer,
  createStripeTestPaymentIntent,
  signStripeWebhookPayload,
  type StripeConnectTransferResult,
  type StripePaymentIntentResult,
  verifyStripeWebhookSignature,
} from "./stripe.js";
