# AGENTS.md: packages/payments

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Money, GST, plans and Stripe**. Cents helpers, GST maths (`docs/compliance/PAYMENTS_AND_GST.md`), the tax invoice model and number sequence, invitation plans and entitlements, Stripe and Stripe Connect wrappers, and webhook verification helpers.

- **Built by:** FND-08 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- **The only place GST is calculated.** Integer cents only.
- Exhaustive tests for rounding (per line, then summed).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
