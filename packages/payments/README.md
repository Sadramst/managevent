# @managevent/payments

The single source of truth for money (`AUD` integer cents) and Australian GST (`10%`) calculations (`docs/compliance/PAYMENTS_AND_GST.md`), ATO Tax Invoice generation, invitation plans/entitlements (`WEBSITE.md` §B14), and Stripe test-mode wrappers.

## Usage

`getInvitationPlan(plan, experienceMode)` is the entitlement resolver. Memorial
invitations receive Premium access for zero cents, while agency-only logistics
fulfilment stays agency-only. Celebration Premium costs 6900 AUD cents incl. GST.

```ts
import { priceLineFromUnitIncGst, sumPricedLines, formatAudCents } from "@managevent/payments";

const line = priceLineFromUnitIncGst({ qty: 80, unitPriceIncGstCents: 12500 });
const totals = sumPricedLines([line]);
console.log(formatAudCents(totals.totalIncGstCents, { suffixIncGst: true }));
```

## Stripe Checkout (Premium Event Pass)

`createStripeCheckoutClient()` wraps the real `stripe` SDK: create a Checkout Session, retrieve it,
and verify a webhook. It needs a real `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET` for webhooks).
There is no mock fallback: without credentials it throws `PaymentsNotConfiguredError`, which the API
reports as `503 PAYMENTS_NOT_CONFIGURED`. The older helpers in `stripe.ts` are test-mode descriptors
only and must not be used for real payments.

```ts
import { createStripeCheckoutClient, isStripeCheckoutConfigured } from "@managevent/payments";

if (isStripeCheckoutConfigured()) {
  const stripe = createStripeCheckoutClient();
  const { checkoutUrl } = await stripe.createInvitationUpgradeSession({
    invitationId,
    eventId,
    userId,
    successUrl,
    cancelUrl,
    idempotencyKey,
  });
}
```
