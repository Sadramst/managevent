# AGENTS.md: packages/logistics

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**RSVP to logistics recommendation engine** (the core bridge, `ARCHITECTURE.md` §6). From a headcount snapshot it computes the headcount basis, catering portions per dietary category, cake serves, tables and chairs, linen and tableware, and staffing (RSA staff when alcohol is served), and returns recommendation items against the event's current order lines.

- **Used by:** `apps/worker` (`headcount.changed`, which writes a `RecommendationSet`). **Planned:** applying a recommendation from the customer portal (PRT-04) and showing it in the staff command centre (ADM-03).

## Rules

- Pure and deterministic: no I/O, no clock reads (pass `now`). Every output carries `rulesVersion` (`LOGISTICS_RULES_VERSION`); bump it whenever a rule changes.
- Target 100% branch coverage.
- Never merge allergen counts into "other".

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
