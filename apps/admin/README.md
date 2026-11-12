# `@managevent/admin`

Domain helpers for the Managevent staff console.

## What is here

- `ADMIN_STAFF_ROLES`, `isAdminStaffRole(role)`, `hasAdminStaffRole(roles)`, `assertAdminStaffRole(role)`: who counts as staff (`PLANNER_STAFF`, `SUPER_ADMIN`).

That is all. The earlier helpers that built in-memory lead records, pipeline totals and a dietary "reveal" only served a mock screen and were removed with it. Lead stages, the audit trail, permissions and money all live in the API (`apps/api`, `packages/auth`, `packages/payments`).

## Where the console is

The staff console is served at `/admin` by `apps/marketing` (see [its README](../marketing/README.md#staff-console-admin)): sign-in with two-factor, the enquiries inbox and the enquiry detail page, all from the real API. Its page helpers are in `apps/marketing/lib/admin`, because `apps/marketing` does not depend on this package yet.

This package becomes the `admin.managevent.com.au` app in Phase 4 (see `AGENTS.md`). Until then, do not add modules here that have no real data behind them.
