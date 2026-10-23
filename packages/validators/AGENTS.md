# AGENTS.md: packages/validators

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Zod schemas: the API contract**. Input and output schemas for every API endpoint, content schemas (mirroring `content/schemas`), shared primitives (money cents, AU phone, ABN format, IANA time zone, locale, slug and token formats).

- **Built by:** FND-03 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- These schemas are the contract. Changes are additive by default. Breaking changes need `contract-change`, a migration note and a `CHANGELOG_CONTRACTS.md` entry.
- Every schema has at least one valid and one invalid fixture test.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
