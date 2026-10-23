# AGENTS.md: apps/portal

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Customer portal: app.managevent.com.au**

- **Domain:** app.managevent.com.au
- **Local port:** 3002
- **Phase:** Phase 3. **Backlog:** PRT-01 … PRT-11 (see `ROADMAP.md`)

Where the host runs their event: the dashboard, live RSVP and headcount, **one-click recommendations** (the logistics bridge), order customisation, payments and invoices, the interactive seating chart, budget, planner chat, co-hosts and documents.

## Specification

ROADMAP Phase 3, ARCHITECTURE §6 (bridge), WEBSITE.md Part C.

## Stack

Next.js (App Router), Tailwind v4, `packages/ui`, realtime client (D-03).

## Depends on (contracts; do not modify from this app)

`ui`, `i18n`, `validators`, `types`, `payments` (display), `pricing` (preview), `logistics` (display of rules), `api-client`, `config`

## Proposed layout

```text
app/
  onboarding/            # from ?estimate=
  events/[eventId]/      # overview, guests, rsvp, orders, seating, budget, payments, chat, documents, team
  account/               # profile, privacy export, sessions
```

## Rules specific to this app

- Every mutation goes through `apps/api`. Applying a recommendation calls `POST /v1/orders/:id/apply-recommendation` and is re-priced on the server.
- Payment UI uses Stripe Elements or Checkout. Never handle raw card data. Prices are shown including GST, with tax invoices downloadable.
- The seating chart consumes `logistics` table rules and saves `FloorPlan` versions. Keyboard-accessible alternatives are required for drag and drop.
- Co-host permissions are enforced on the server. The UI hides actions the user isn't allowed to take, but that is never the security boundary.

## Environment variables

NEXT_PUBLIC_PORTAL_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, realtime keys. The names are listed in the root `.env.example`.

## Tests required

Vitest, plus Playwright: onboarding from an estimate, RSVP change → recommendation → apply → new total, deposit payment (Stripe test), seating assignment.

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
