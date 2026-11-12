# @managevent/payments

The single source of truth for money (AUD integer cents) and Australian GST (10%, `docs/compliance/PAYMENTS_AND_GST.md`), the ATO tax invoice and payment schedule builders, invitation plans and entitlements (`WEBSITE.md` §B14), and the Stripe Checkout client for the Premium Event Pass. Rules: [`AGENTS.md`](AGENTS.md).

## Money and GST

```ts
import { formatAudCents, priceLineFromUnitIncGst, sumPricedLines } from "@managevent/payments";

const line = priceLineFromUnitIncGst({ qty: 80, unitPriceIncGstCents: 12500 });
const totals = sumPricedLines([line]);
formatAudCents(totals.totalIncGstCents, { suffixIncGst: true });
```

GST is rounded per line, then summed. `buildTaxInvoice()` and `buildDefaultPaymentSchedule()` build the models; nothing issues a tax invoice yet (DEC-03, PRT-06).

## Invitation plans

`getInvitationPlan(plan, experienceMode)` resolves entitlements; `hasInvitationEntitlement()` and `canAddGuestsUnderPlan()` check one.

| Plan               | Price                       | Guests    | Email invitations |
| ------------------ | --------------------------- | --------- | ----------------- |
| Free               | $0                          | 30        | 50                |
| Premium Event Pass | $69 incl. GST (6900 cents)  | Unlimited | Unlimited         |
| Agency             | Included in agency packages | Unlimited | Unlimited         |

Memorial events get Premium entitlements for 0 cents. `automaticLogisticsBridge` is Agency only. Some entitlements describe features that are planned, not built (for example `livePhotoWallAndDisplay`, INV-11, and `bulkSmsAndWhatsapp`, INV-08).

## Stripe Checkout (Premium Event Pass)

`createStripeCheckoutClient()` wraps the real `stripe` SDK: create a Checkout Session, retrieve or expire it, and verify a webhook. It needs a real `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET` for webhooks). There is no mock fallback: without credentials it throws `PaymentsNotConfiguredError`, which the API reports as `503 PAYMENTS_NOT_CONFIGURED`. It has never run against live Stripe (OPS-03).

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

The same exports are available from `@managevent/payments/checkout`, and the plans from `@managevent/payments/plans`.
