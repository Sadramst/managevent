# AGENTS.md: packages/integrations

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Planned: third-party integrations.** Today the folder holds only this file, `README.md`, `CLAUDE.md` and a placeholder `package.json`; there is no code.

Planned contents and the `ROADMAP.md` items that need them:

- ABN Lookup client (VEN-01).
- Xero client (ADM-06, BIZ-11).
- Maps helpers: static map URL and directions deep links.

The guest calendar file is not planned here: it is built today by `apps/api/src/modules/guest-site/ics.ts`.

## Rules

- Every client sits behind an interface with a test double. Never call a real third party in CI.
- Without credentials a client fails closed (a clear "not configured" error); it never returns invented data in a production path.
- A provider that stores personal information outside Australia needs an ADR first (root `AGENTS.md` §3).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
