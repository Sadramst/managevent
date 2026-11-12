# @managevent/auth

Self-hosted Better Auth configuration (ADR-0005), the RBAC roles, the [`PERMISSIONS.md`](PERMISSIONS.md) permission matrix, `checkPermission()` / `requirePermission()`, and resource scoping helpers (`canCoHostPerform`, `canVendorAccessOrgResource`, `isWithinCrewRosterWindow`). Used by `apps/api`. Rules: [`AGENTS.md`](AGENTS.md).

## Permission checks

```ts
import { requirePermission } from "@managevent/auth";

// Throws AuthorizationError (401 without an actor, 403 when denied).
requirePermission({ userId: "usr_123", roles: ["CUSTOMER_HOST"] }, "order:apply_recommendation", {
  eventOwnerUserId: "usr_123",
});
```

`checkPermission()` returns the decision (`allowed`, `scope`, `auditLogged`) instead of throwing. A caller outside the door check-in surface must treat `scope: "roster"` as denied (see `PERMISSIONS.md`).

## Better Auth configuration

`createManageventAuth(options)` builds the server instance used by `apps/api`:

- Email and password sign-in, sessions of 30 days, `twoFactor` (TOTP, issuer `Managevent`) and `bearer`.
- `magicLink` only when a real `sendMagicLink` sender is passed, and password reset only when `sendResetPassword` is passed.
- Every new account is created with `roles = ["CUSTOMER_HOST"]` by a server-side hook. Staff roles are granted by `pnpm --filter @managevent/api staff:create`, never by a sign-up request.
- Accounts with two-factor enabled, or with a role in `MFA_REQUIRED_ROLES` (`PLANNER_STAFF`, `SUPER_ADMIN`), are never sent a magic link and cannot verify one.

```ts
import { createManageventAuth, prismaAdapter } from "@managevent/auth";

const auth = createManageventAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: ["https://invitation.managevent.com.au"],
  generateId: ({ model }) => (model === "user" ? newUserId() : newUuid()),
});
```

Environment: `BETTER_AUTH_URL` (default `http://localhost:4000`), `BETTER_AUTH_SECRET`, `AUTH_COOKIE_DOMAIN`.

- Cookies are host-only when `AUTH_COOKIE_DOMAIN` is unset, `localhost` or an IP address, and shared across subdomains when it is a real domain (for example `.managevent.com.au`). `Secure` is set when the base URL is `https`.
- Better Auth takes the client IP (rate limits, `Session.ipAddress`) only from `TRUSTED_CLIENT_IP_HEADER` (`x-managevent-client-ip`). The API overwrites that header on every request from an address the caller cannot forge.
