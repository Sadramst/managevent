# AGENTS.md: packages/logistics

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**RSVP → logistics recommendation engine**. Headcount basis, catering portions per dietary category, cake serves, table and chair counts, linen and tableware, and staffing ratios (RSA when alcohol is served), returning `RecommendationItem[]`.

- **Built by:** FND-10 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Pure, deterministic, versioned rules (`rulesVersion`). 100% branch coverage target.
- Never merge allergen counts into 'other'.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
