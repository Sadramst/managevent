# AGENTS.md: packages/payments

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Money, GST, plans and Stripe Checkout.** Integer-cent helpers, GST maths (`docs/compliance/PAYMENTS_AND_GST.md`), the tax invoice and payment schedule builders, the invitation plans and entitlements, and the real Stripe Checkout client with webhook verification (`src/checkout.ts`).

- **Used by:** `apps/api` (plans, entitlements, Premium Event Pass checkout and webhook), `apps/invitation` (plan display), `packages/pricing`.
- **Planned:** Stripe Connect for vendor payouts (VEN-03), deposits and milestone payments (PRT-06), and issuing tax invoices (DEC-03, PRT-06). No Connect code exists today.

## Rules

- **The only place GST is calculated.** Integer AUD cents only; consumer prices are GST-inclusive.
- Exhaustive tests for rounding (per line, then summed).
- Stripe is used only with real credentials. Without `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET` for webhooks) the client throws `PaymentsNotConfiguredError`; never add a mock or test-mode fallback to a production path.
- Plan prices and limits live in `INVITATION_PLANS`. Change them only with a founder decision and update `docs/business/PRICING_MODEL.md` with them.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
