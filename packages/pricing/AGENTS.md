# AGENTS.md: packages/pricing

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Ceremony Builder estimator.** A versioned price list (`CURRENT_PRICE_LIST_VERSION`, `2026.10.1`), service tier rules, quantity drivers, travel zones, range bands and the estimate breakdown, with fixtures for each ceremony family.

- **Status:** built and unit-tested, but **no app uses it yet**. The www estimator (`apps/marketing/components/event-estimator.tsx`) has its own placeholder rates.
- **Blocked:** the rates here and in the www estimator are placeholders until the founder approves them (DEC-01). Do not present them as quotes.
- **Planned users:** the www estimator once DEC-01 is settled, estimate onboarding in the portal (PRT-01) and staff proposals (ADM-02).

## Rules

- Pure functions. Fixtures for every ceremony family. Every estimate states its price list version.
- GST comes from `packages/payments`; never calculate it here.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
