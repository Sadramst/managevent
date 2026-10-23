# Payments and GST

> Confirm with a registered tax agent. Not tax advice.

## GST maths (implemented only in `packages/payments`)

- Rate: 10%.
- Prices are entered **GST-inclusive** for consumer products. The GST portion is `round(incGst / 11)` (to the nearest cent, half up). The ex-GST amount is `incGst - gst`.
- For B2B quotes entered ex-GST: `gst = round(exGst × 0.1)`.
- **Rounding:** calculate GST for each line, then sum the lines. The invoice total GST is the sum of the line GST amounts. Document this and keep it consistent.
- GST-free or input-taxed items (rare for us): `taxCode` per line (`GST` | `FRE` | `INP`), defaulting to `GST`.

## Tax invoices (ATO requirements, verify current rules)

Each invoice must have:

- The words "Tax invoice", prominently.
- Supplier identity and **ABN**.
- Issue date.
- A description of each item, with quantity and price.
- GST amount (shown separately or as "Total price includes GST").
- Extent to which each sale is taxable.
- **For sales of $1,000 or more:** the buyer's identity or ABN.

Numbering is sequential and gapless. Store the PDF and sync to Xero.

## Stripe

- Platform: Stripe Australia. Customer payments are taken by the Managevent platform account.
- **Methods:**
  - Cards, Apple Pay and Google Pay at launch.
  - Afterpay (Clearpay) for eligible order values.
  - PayTo or PayID: verify Stripe support at implementation time (D-08). The fallback is bank transfer with manual reconciliation.
- **Marketplace:** Stripe Connect (Express accounts for vendors) with **separate charges and transfers**. Commission is retained, and transfers are delayed until the milestone release (D-07).
- **Get legal advice before launch** on whether holding customer funds pending delivery triggers any financial services or trust account obligations.
- **Webhooks:** verify signatures, enforce idempotency by event id, and store the raw event for audit.
- **Refunds:** follow the refund policy clauses, with `Refund.policyClause` recorded.

## Accounting

- Deposits are a liability (unearned revenue) until the event is delivered.
- Vendor pass-through amounts versus our margin are recorded per order line.
- Xero sync covers invoices, payments, refunds and Connect fees. BAS is quarterly to start with.
