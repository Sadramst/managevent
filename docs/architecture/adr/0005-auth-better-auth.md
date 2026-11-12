# ADR-0005: Better Auth, self-hosted

- **Status:** Accepted. Amended by the implementation (see `CHANGELOG_CONTRACTS.md`, 2026-11-12): sign-in is email and password, with sessions of 30 days; the plugins are `twoFactor` and `bearer`, plus `magicLink` only when an email sender is configured. The `organization` plugin was removed, and Google and Apple OAuth are not configured (no ROADMAP item yet). Staff roles (`PLANNER_STAFF`, `SUPER_ADMIN`) must use TOTP and are created with the API's `staff:create` command. Browsers reach Better Auth only through each web app's same-origin `/api/auth` proxy. An 8-hour staff session is planned (OPS-10).
- **Context:** We need SSO across subdomains, mobile and desktop token auth, MFA for staff, organisations (vendors), and data residency in Australia. Hosted identity providers such as Clerk or Auth0 store user PII offshore by default.
- **Decision:**
  - Better Auth runs inside `apps/api`, and its tables live in our Postgres.
  - It uses the organisation, two-factor, magic-link and bearer plugins.
  - Sign-in methods are Google and Apple OAuth plus an email magic link.
  - The cookie domain is `.managevent.com.au`.
- **Consequences:** RBAC is our own code, in `packages/auth` (roles plus resource scoping).
