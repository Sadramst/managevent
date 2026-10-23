# AGENTS.md: packages/integrations

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Third-party integrations**. ABN Lookup client, Xero client, Maps helpers (static map URL, directions deep links), `.ics` generator (deterministic, TZID-aware).

- **Built by:** FND-13 / VEN-01 / ADM-06 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Every client is wrapped behind an interface with a mock for tests. Never call real third parties in CI.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
