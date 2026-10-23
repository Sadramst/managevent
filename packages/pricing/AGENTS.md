# AGENTS.md: packages/pricing

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Ceremony Builder estimator**. Price list versions, service tier rules, quantity drivers, travel zones, range bands, and the estimate breakdown, used by `www` (preview), `app` and `admin`.

- **Built by:** FND-09 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Pure functions. Fixtures for every ceremony family. The output must state its price list version.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
