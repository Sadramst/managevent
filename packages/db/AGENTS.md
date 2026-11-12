# AGENTS.md: packages/db

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Database schema and client (Prisma, PostgreSQL 16).** `prisma/schema.prisma`, the migrations, the seed (Perth catalogue placeholders from `content/`), the Prisma client with the field-encryption extension for 🔒 fields, and the prefixed UUIDv7 ID generator. [`DATA_MODEL.md`](DATA_MODEL.md) explains the schema.

- **Used by:** `apps/api` and `apps/worker`.

## Rules

- **Only `apps/api` and `apps/worker` may import this package at runtime.** Web, mobile and desktop must not. (`packages/api-client` uses it as a dev dependency for its database tests only.)
- `schema.prisma` is the source of truth. Update `DATA_MODEL.md` in the same PR.
- Migrations are append-only. Never edit a merged migration. Create one with `prisma migrate dev` against the local database, and check `pnpm db:drift-check` (CI runs it).
- 🔒 health fields are written only as ciphertext (`encryptRsvpWriteData`) and are never logged. `PII_ENCRYPTION_KEY` is required in production; the local fallback key is for development and tests only.
- The seed must never contain real personal data.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
