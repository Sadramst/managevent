# AGENTS.md: apps/vendors

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Vendor portal: vendors.managevent.com.au**

- **Domain:** vendors.managevent.com.au
- **Local port:** 3003
- **Phase:** Phase 4. **Backlog:** VEN-01 … VEN-06 (see `ROADMAP.md`)

Vendor signup with **ABN Lookup**, compliance documents (public liability, food safety, RSA, liquor licence, WWCC), Stripe Connect Express onboarding, service catalogue, availability calendar, quotes and bookings, run-sheets, payouts and reviews.

## Specification

ROADMAP Phase 4, `docs/compliance/VENDOR_VERIFICATION.md`, `docs/compliance/PAYMENTS_AND_GST.md`.

## Stack

Next.js (App Router), Tailwind v4, `packages/ui`.

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

NEXT_PUBLIC_VENDORS_URL, NEXT_PUBLIC_API_URL, STRIPE publishable key. The names are listed in the root `.env.example`.

## Tests required

Playwright: signup → ABN check (mocked) → document upload → Stripe onboarding (test) → service creation → accept booking.

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
