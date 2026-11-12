# Payments and GST

> Confirm with a registered tax agent. Not tax advice.

## GST maths (only in `packages/payments`, `src/gst.ts`)

- Rate: 10%.
- Consumer prices are entered **GST-inclusive**. The GST portion is `incGst / 11`, rounded half up to the cent; ex-GST is `incGst - gst`.
- B2B prices entered ex-GST: `gst = exGst × 10%`, rounded half up.
- **Rounding:** GST is calculated per line, then summed. The invoice's total GST is the sum of the line GST amounts (`sumPricedLines`).
- GST-free or input-taxed lines (rare for us) use the tax code `FRE` or `INP`; the default is `GST`.
- Never inline `* 1.1` or `/ 11` anywhere else.

## Tax invoices (ATO requirements, verify current rules)

Each invoice must show:

- the words "Tax invoice", prominently;
- the supplier's identity and **ABN**;
- the issue date;
- each item, with quantity and price;
- the GST amount (shown separately, or "Total price includes GST");
- the extent to which each sale is taxable;
- **for sales of $1,000 or more:** the buyer's identity or ABN.

Numbering is sequential and gapless (`formatTaxInvoiceNumber`, table `TaxInvoiceSequence`). Store the PDF and sync to Xero.

**State today:** `buildTaxInvoice` in `packages/payments/src/invoice.ts` builds a compliant invoice object, but no app issues invoices yet. Whether a $69 Premium Event Pass purchase issues one is DEC-03; package invoices come with PRT-06; both need a real ABN (BIZ-01).

## Stripe

- **Today:** the Premium Event Pass is sold through **Stripe Checkout** (a Stripe-hosted page, so card data never reaches us) when `STRIPE_SECRET_KEY` is set. The webhook `POST /v1/webhooks/stripe` verifies the signature (`400 INVALID_SIGNATURE` otherwise), stores each event once in `WebhookEvent` keyed by Stripe's event id, and applies the upgrade idempotently (`apps/api/src/webhooks/stripe.ts`, `apps/api/src/modules/billing`). Never exercised against live Stripe (OPS-03, BIZ-04).
- **Planned, agency packages (PRT-06):** deposits and milestones through the platform account; cards, Apple Pay and Google Pay at launch; Afterpay for eligible amounts; PayTo or PayID to verify with Stripe (D-08), with bank transfer and manual reconciliation as the fallback. Refunds follow the refund policy, recording the clause used (`Refund.policyClause`).
- **Planned, marketplace (VEN-03):** Stripe Connect Express for vendors with **separate charges and transfers**; commission retained; transfers delayed until milestone release (D-07). **Get legal advice before launch** on whether holding customer funds pending delivery creates financial-services or trust-account obligations.

## Accounting (BIZ-11, ADM-06)

- Deposits are a liability (unearned revenue) until the event is delivered.
- Vendor pass-through amounts and our margin are recorded per order line.
- Xero sync covers invoices, payments, refunds and Connect fees. BAS is quarterly to start with.
