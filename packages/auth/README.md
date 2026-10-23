# @managevent/auth

Self-hosted Better Auth configuration (`ADR-0005`), RBAC roles, the `PERMISSIONS.md` permission matrix, `requirePermission()`, and resource scoping helpers (`canCoHostPerform`, `canVendorAccessOrgResource`, `isWithinCrewRosterWindow`).

## Usage

```ts
import { requirePermission } from "@managevent/auth";

requirePermission({ userId: "usr_123", roles: ["CUSTOMER_HOST"] }, "order:apply_recommendation", {
  eventOwnerUserId: "usr_123",
});
```
