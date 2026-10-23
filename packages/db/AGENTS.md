# AGENTS.md: packages/db

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Database schema and client (Prisma)**. The Prisma schema (from `DATA_MODEL.md`), migrations, seed data (Perth placeholders), the Prisma client export, the field-encryption extension for 🔒 fields, and the ID generator.

- **Built by:** FND-02 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- **Only `apps/api` and `apps/worker` may import this package.** Web, mobile and desktop must not.
- Migrations are append-only. Never edit a merged migration.
- Keep `DATA_MODEL.md` in sync in the same PR.
- The seed must never contain real personal data.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
