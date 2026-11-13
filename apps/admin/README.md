# `@managevent/admin`

Domain helpers for the Managevent staff console.

## What is here

- `ADMIN_STAFF_ROLES`, `isAdminStaffRole(role)`, `hasAdminStaffRole(roles)`, `assertAdminStaffRole(role)`: who counts as staff (`PLANNER_STAFF`, `SUPER_ADMIN`).

That is all. Lead stages, the audit trail, permissions and money live in the API (`apps/api`, `packages/auth`, `packages/payments`), not here.

## Where the console is

The staff console is served at `/admin` by `apps/marketing` (see [its README](../marketing/README.md#staff-console-admin)): sign-in with two-factor, the enquiries inbox, the enquiry detail page, and site settings, all from the real API. Its page helpers are in `apps/marketing/lib/admin`, because `apps/marketing` does not depend on this package yet.

The remaining staff modules are ADM-02 to ADM-10 in [`ROADMAP.md`](../../ROADMAP.md); rules for them are in [`AGENTS.md`](AGENTS.md). Do not add modules here that have no real data behind them.
