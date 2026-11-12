# AGENTS.md: packages/api-client

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Typed API client** for `apps/api`: one resource object per API module, inputs and outputs validated with the `packages/validators` schemas, cookie or bearer auth, and one error type (`ManageventApiClientError`, checked with `isApiError`). `src/generated.ts` is generated from the API's OpenAPI document.

- **Used by:** `apps/marketing` and `apps/invitation`, server-side only (server components, server actions and route handlers). The browser never calls the API directly; it reaches only each web app's same-origin `/api/auth` proxy.

## Rules

- `src/generated.ts` is committed. Regenerate it with `pnpm --filter @managevent/api-client generate` whenever an API route changes; CI runs `generate:check` and fails when it is stale.
- Never redefine a request or response shape here: import it from `packages/validators`.
- Forward the visitor's IP only through `forwardedFor`. The client sends it with the shared `API_PROXY_SECRET` (`x-managevent-proxy-secret`), and the API believes the address only when the secret matches. Never create a client with the secret in the browser.
- The `*.db.test.ts` suites run against the real API and PostgreSQL and may import `packages/db` as a dev dependency for setup. Runtime code must not.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
