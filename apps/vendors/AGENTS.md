# AGENTS.md: apps/vendors

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Vendor portal: vendors.managevent.com.au**

- **Domain:** vendors.managevent.com.au
- **Local port:** 3003
- **Status:** Planned. Nothing is built; this folder holds only this spec, `CLAUDE.md` and a placeholder `package.json`.
- **Backlog:** VEN-01 to VEN-06, MKP-01, MKP-02 (see [`ROADMAP.md`](../../ROADMAP.md)); staff-side verification is ADM-04

Vendor signup with **ABN Lookup**, compliance documents (public liability, food safety, RSA, liquor licence, WWCC), Stripe Connect Express onboarding, service catalogue, availability calendar, quotes and bookings, run-sheets, payouts and reviews.

## Specification

The VEN and MKP rows in `ROADMAP.md`, `docs/compliance/VENDOR_VERIFICATION.md`, `docs/compliance/PAYMENTS_AND_GST.md`.

## Stack

Next.js (App Router), Tailwind v4, the brand shell in `packages/ui`. ABN Lookup goes through `packages/integrations` (a placeholder today) and uploads through `packages/storage` (R2 helpers that no app uses yet).

## Depends on (contracts; do not modify from this app)

`ui`, `i18n`, `validators`, `types`, `payments`, `api-client`, `config`

## Proposed layout

```text
app/
  signup/  onboarding/(abn|documents|stripe|services)
  dashboard/  bookings/[bookingId]/  calendar/  services/  payouts/  reviews/  settings/
```

## Rules specific to this app

- A vendor can see only their own organisation's data. The organisation scope is enforced by the API.
- Documents are uploaded to the **private** R2 bucket through signed URLs. Expiry dates are required where relevant.
- A vendor cannot take bookings until their status is `APPROVED` and the Stripe account has charges and payouts enabled.
- Prices are entered including or excluding GST depending on the vendor's GST status, using `payments` helpers.

## Environment variables

`NEXT_PUBLIC_VENDORS_URL` (local `http://localhost:3003`), `API_URL` and `API_PROXY_SECRET` (server-side, as in the other web apps), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. The names are listed in the root `.env.example`.

## Tests required

Playwright: signup → ABN check (mocked) → document upload → Stripe onboarding (test) → service creation → accept booking.

## Status

Planned, not scaffolded. VEN-01 scaffolds it using the current stable framework version (pin exact versions). Needs BIZ-04 and D-07 before Stripe Connect work (VEN-03).
