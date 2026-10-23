# AGENTS.md: packages/types

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Shared domain types**. TypeScript types inferred from `validators` (`z.infer`), ID branded types, and enums re-exported for clients.

- **Built by:** FND-04 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Prefer inference from Zod over hand-written interfaces. No runtime code except tiny type guards.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
