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
