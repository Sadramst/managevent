# AGENTS.md: apps/admin

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Admin and planner command centre: admin.managevent.com.au**

- **Domain:** admin.managevent.com.au
- **Local port:** 3004
- **Phase:** Phase 1 (Admin Lite, MKT-16) → Phase 4. **Backlog:** MKT-16, ADM-01 … ADM-08 (see `ROADMAP.md`)

Internal staff tool: CRM pipeline, proposals, event command centre (run-sheets, tasks, vendor assignment, crew rosters), vendor verification queue, inventory, finance (margin, GST and BAS, Xero sync, payout release), content admin, audit and user management.

## Specification

ROADMAP Phases 1 and 4, ARCHITECTURE §7.

## Stack

Next.js (App Router), Tailwind v4, `packages/ui` (data tables, forms).

## Depends on (contracts; do not modify from this app)

`ui`, `i18n`, `validators`, `types`, `payments`, `pricing`, `logistics`, `auth` (role display), `api-client`, `config`

## Proposed layout

```text
app/
  leads/  proposals/  events/[eventId]/(run-sheet|tasks|vendors|crew|orders|guests)
  vendors/verification/  inventory/  finance/(margin|gst|payouts|xero)  content/  users/  audit/
```

## Rules specific to this app

- Staff only (`PLANNER_STAFF`, `SUPER_ADMIN`). MFA is required. Sessions are short (8h).
- Every write to money, roles, verification or personal data creates an `AuditLog` entry on the server.
- Show health data (dietary and allergy) only where it is needed for catering operations. Masked by default, with click-to-reveal that is logged.
- Admin Lite (MKT-16) is a lead list and detail page only. Don't build other modules early.

## Environment variables

NEXT_PUBLIC_ADMIN_URL, NEXT_PUBLIC_API_URL. The names are listed in the root `.env.example`.

## Tests required

Playwright: lead lifecycle, proposal → deposit link, vendor approval with audit entry, payout release guarded by role.

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
