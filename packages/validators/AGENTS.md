# AGENTS.md: packages/validators

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Zod schemas: the API contract.** Request and response schemas for every API operation (`api.ts`, `invitation-host.ts`, `guest-site.ts`, `guest-list.ts`), content schemas that mirror `content/schemas` (`content.ts`), and shared primitives (AUD cents, AU phone, ABN checksum, IANA time zone, locale, slug, guest token and prefixed ID formats).

- **Used by:** `apps/api` (input validation and the OpenAPI document), `apps/worker`, `apps/marketing` (content loading), `apps/invitation`, `packages/api-client` and most packages.

## Rules

- These schemas are the contract. Changes are additive by default. Breaking changes need `contract-change`, a migration note and a `docs/architecture/CHANGELOG_CONTRACTS.md` entry.
- A changed API schema also means regenerating `packages/api-client/src/generated.ts` (`pnpm --filter @managevent/api-client generate`).
- A changed content schema is changed in `content/schemas` in the same PR.
- Every schema has at least one valid and one invalid fixture test.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
