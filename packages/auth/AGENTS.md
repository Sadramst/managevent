# AGENTS.md: packages/auth

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Auth and RBAC.** The Better Auth configuration (`createManageventAuth`, ADR-0005), the role list, the permission matrix ([`PERMISSIONS.md`](PERMISSIONS.md)), `checkPermission()` and `requirePermission()`, and resource scoping helpers (co-host sub-role, vendor organisation, crew roster window).

- **Used by:** `apps/api` only. The web apps never import it: they reach Better Auth through their same-origin `/api/auth` proxy to the API.

## Rules

- The permission matrix in `src/permissions.ts` is the single source of truth, and `PERMISSIONS.md` must match it. Never check roles inline in apps.
- Every permission has a unit test with allowed and denied cases.
- New accounts always get `CUSTOMER_HOST`. Staff roles (`PLANNER_STAFF`, `SUPER_ADMIN`) are granted only by the API's `staff:create` CLI, and those roles must use TOTP (`MFA_REQUIRED_ROLES`). A magic link never replaces two-factor.
- Better Auth reads the client IP only from `TRUSTED_CLIENT_IP_HEADER`, which the host app must overwrite on every request. Never read `x-forwarded-for` here.
- Sessions last 30 days for everyone today. **Planned:** 8-hour staff sessions (OPS-10).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
