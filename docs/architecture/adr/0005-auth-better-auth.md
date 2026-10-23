# ADR-0005: Better Auth, self-hosted

- **Status:** Accepted
- **Context:** We need SSO across subdomains, mobile and desktop token auth, MFA for staff, organisations (vendors), and data residency in Australia. Hosted identity providers such as Clerk or Auth0 store user PII offshore by default.
- **Decision:**
  - Better Auth runs inside `apps/api`, and its tables live in our Postgres.
  - It uses the organisation, two-factor, magic-link and bearer plugins.
  - Sign-in methods are Google and Apple OAuth plus an email magic link.
  - The cookie domain is `.managevent.com.au`.
- **Consequences:** RBAC is our own code, in `packages/auth` (roles plus resource scoping).
