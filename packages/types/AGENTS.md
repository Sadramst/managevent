# AGENTS.md: packages/types

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Shared domain types.** TypeScript types inferred from `packages/validators` (`z.infer`), branded entity ID types (`EventId`, `UserId`, …) and `AudCents`, the domain enums as types, and a few tiny type guards (`isBrandedId`, `asBrandedId`, `isAudCents`).

- **Used by:** `apps/api`, `apps/marketing`, `apps/invitation` and most packages.

## Rules

- Prefer inference from Zod over hand-written interfaces. No runtime code except tiny type guards.
- Branded ID prefixes must match `ID_PREFIXES` in `packages/db/src/ids.ts`.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
