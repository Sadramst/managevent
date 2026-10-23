# AGENTS.md: packages/api-client

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Typed API client**. A client generated from `apps/api` OpenAPI (or Hono RPC types) for web, mobile and desktop, with auth handling (cookie or bearer) and the error model.

- **Built by:** FND-14 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Generated code is committed with a `generate` script. CI checks it is up to date.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
