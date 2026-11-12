# AGENTS.md: apps/portal

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Customer portal: app.managevent.com.au**

- **Domain:** app.managevent.com.au
- **Local port:** 3002
- **Status:** Planned. Nothing is built; this folder holds only this spec, `CLAUDE.md` and a placeholder `package.json`.
- **Backlog:** PRT-01 to PRT-11 (see [`ROADMAP.md`](../../ROADMAP.md))

Where the host runs their event: the dashboard, live RSVP and headcount, **one-click recommendations** (the logistics bridge), order customisation, payments and invoices, the interactive seating chart, budget, planner chat, co-hosts and documents.

## Specification

The PRT rows in `ROADMAP.md`, `ARCHITECTURE.md` §6 (the RSVP → logistics bridge), `WEBSITE.md` Part C.

## Stack

Next.js (App Router), Tailwind v4, the brand shell in `packages/ui` (as `apps/marketing` and `apps/invitation` use it), and a realtime client once D-03 is decided (its old Supabase default no longer fits: production runs its own PostgreSQL on the Sydney VPS, ADR-0011).

## What already exists to build on

- Sign-in: Better Auth email and password with 30-day sessions, reached from the browser only through a same-origin `/api/auth` proxy, as in the two web apps. Everything else goes to the API server-side.
- The bridge: the API records headcount snapshots on every RSVP and enqueues `headcount.changed`; the worker writes a `RecommendationSet` per snapshot. No route reads recommendations yet (PRT-04).

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

- Every mutation goes through `apps/api`. Applying a recommendation is re-priced on the server; the API has no orders module or route for it yet (PRT-04, PRT-05).
- Payment UI uses Stripe Elements or Checkout. Never handle raw card data. Prices are shown including GST, with tax invoices downloadable.
- The seating chart consumes `logistics` table rules and saves `FloorPlan` versions. Keyboard-accessible alternatives are required for drag and drop.
- Co-host permissions are enforced on the server. The UI hides actions the user isn't allowed to take, but that is never the security boundary.

## Environment variables

`NEXT_PUBLIC_PORTAL_URL` (local `http://localhost:3002`), `API_URL` and `API_PROXY_SECRET` (server-side, as in the other web apps), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and realtime keys once D-03 is decided. The names are listed in the root `.env.example`.

## Tests required

Vitest, plus Playwright: onboarding from an estimate, RSVP change → recommendation → apply → new total, deposit payment (Stripe test), seating assignment.

## Status

Planned, not scaffolded. PRT-01 scaffolds it using the current stable framework version (pin exact versions) and adds it to `infra/vps` when it is ready to deploy.
