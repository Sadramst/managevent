# AGENTS.md: packages/auth

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Auth and RBAC**. Better Auth configuration (used by `apps/api`), the role enum, the permission matrix, `requirePermission()`, resource scoping helpers (event co-host, vendor organisation, crew roster window), and client session helpers.

- **Built by:** FND-07 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- The permission matrix is the single source of truth, so never check roles inline in apps.
- Every permission has a unit test with allowed and denied cases.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
