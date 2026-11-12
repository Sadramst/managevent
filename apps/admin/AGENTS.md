# AGENTS.md: apps/admin

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Staff-console domain helpers (`@managevent/admin`)**

Today this is a small TypeScript package, not a web app: it exports who counts as staff (see [`README.md`](README.md)). The staff console itself is served at `/admin` by `apps/marketing` (sign-in with password and TOTP, enquiry inbox and enquiry detail).

- **Open backlog:** ADM-02 to ADM-08 (see [`ROADMAP.md`](../../ROADMAP.md))
- **Planned:** proposals (ADM-02), the event command centre with run-sheets, tasks, crew and vendor assignments (ADM-03), the vendor verification queue (ADM-04), hire inventory (ADM-05), finance with margin, GST, BAS, Xero sync and payout release (ADM-06), content editing (ADM-07), and the audit log viewer with staff management (ADM-08).

Whether the console later moves to its own host (`admin.managevent.com.au`, `NEXT_PUBLIC_ADMIN_URL`) is not decided; production currently sets `NEXT_PUBLIC_ADMIN_URL` to `https://www.managevent.com.au/admin`. Build new console screens in `apps/marketing/app/admin` unless an issue says otherwise.

## Specification

The ADM rows in `ROADMAP.md`; `ARCHITECTURE.md` §7 (domain modules inside `apps/api`).

## Depends on (contracts; do not modify from this package)

`types` (roles). The package also lists `i18n`, `logistics`, `payments` and `validators` but does not use them yet.

## Rules for staff features (wherever they are built)

- Staff only (`PLANNER_STAFF`, `SUPER_ADMIN`), and two-factor is mandatory: the API treats staff without it as signed out. Staff sessions should last 8 hours; today they last 30 days like everyone else's (OPS-10).
- Every write to money, roles, verification or personal data creates an `AuditLog` entry on the server.
- Health data (dietary and allergy) is shown only where catering operations need it: masked by default, with a click-to-reveal that is audited.
- No module without real data behind it. Lead stages, the audit trail, permissions and money live in the API (`apps/api`, `packages/auth`, `packages/payments`), not here.

## Tests required

Vitest for this package. For console features, Playwright in `apps/marketing` against the real API (`test:e2e:real`): lead lifecycle today; proposal to deposit link, vendor approval with an audit entry and payout release guarded by role as those items land.

## Status

Built: the staff-role helpers in `src/index.ts`, unit tested. Everything under "Planned" is not built.
