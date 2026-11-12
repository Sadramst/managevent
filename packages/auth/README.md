# @managevent/auth

Self-hosted Better Auth configuration (`ADR-0005`), RBAC roles, the `PERMISSIONS.md` permission matrix, `requirePermission()`, and resource scoping helpers (`canCoHostPerform`, `canVendorAccessOrgResource`, `isWithinCrewRosterWindow`).

## Usage

```ts
import { requirePermission } from "@managevent/auth";

requirePermission({ userId: "usr_123", roles: ["CUSTOMER_HOST"] }, "order:apply_recommendation", {
  eventOwnerUserId: "usr_123",
});
```

## Better Auth configuration

`createManageventAuth(options)` builds the server instance used by `apps/api`: email and password
sign-in, `twoFactor`, `bearer`, and `magicLink` only when a real `sendMagicLink` sender is passed.
Every new account is created with `roles = ["CUSTOMER_HOST"]` by a server-side hook; staff roles are
granted by the API's bootstrap CLI, never by a sign-up request.

```ts
import { createManageventAuth, prismaAdapter } from "@managevent/auth";

const auth = createManageventAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: ["https://invitation.managevent.com.au"],
  generateId: ({ model }) => (model === "user" ? newUserId() : newUuid()),
});
```

Cookies are host-only on `localhost` and shared across subdomains when `AUTH_COOKIE_DOMAIN` is a real
domain (for example `.managevent.com.au`). `Secure` is set when the base URL is `https`.
