# @managevent/marketing

Marketing site & Planner Command Centre: `www.managevent.com.au` (local port `3100`)

The public platform for Managevent in Perth, Western Australia. It covers all ceremony verticals from 0 to 100 (Weddings, Milestone Birthdays, Corporate Galas, Cultural Ceremonies, and Celebration of Life / Memorials), the 0-to-100 Services matrix, the **Instant Event & Ceremony Cost Estimator** (`#estimator`), curated Perth Venues, the Digital RSVP-to-Catering Bridge showcase, the Enquiry & Consultation booking form, and the **Planner & Admin Command Centre** (`/admin`).

## Language Architecture

- **Language**: English only (en-AU), served at `/`. Legacy `/fa` URLs redirect to English. No Persian content is shipped.
- **Multi-Language Expansion Ready**: Built on `@managevent/i18n` with full dictionary parity testing and logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `inset-inline-*`), allowing other locales to be added later through a `contract-change`.

## Key Surfaces

1. **Homepage (`/[locale]`)**:
   - Editorial Perth hero with trust stats and quick navigation.
   - All-events vertical cards (Weddings, Engagements, Milestone Birthdays, Corporate Galas, and Memorials & Wakes with automatic Memorial Mode palette).
   - **0-to-100 Full-Stack Services Showcase**: Concept & Run-Sheet, Venue Sourcing, Catering & Bar (Halal/Dietary/RSA), Styling & Florals, Audio/Visual & Crew, Digital Invitations & QR Check-in.
   - **Interactive Event & Ceremony Cost Estimator (`#estimator`)**: Calculates live AUD (incl. 10% GST) low/high investment bands, Ex-GST + GST splits, and logistics bridge outputs (banquet tables, catering portions with buffer, service crew, and cake serves), with one-click transfer into the Enquiry Form.
   - **Curated Perth Venues Showcase**: Validated from `/content/venues/perth.json` across Swan Valley, Perth CBD, Fremantle, South Perth, and Cottesloe.
   - **Ask about this venue**: each venue card links to `/?venue=<slug>#enquiry`. The enquiry form reads `venue` on the client, and a known slug shows a note and prefills the editable message. Unknown, empty or repeated values are ignored (`lib/venue-prefill.ts`, `resolveVenueName`). Copy keys: `launchVenueAsk`, `launchVenueNote`, `launchVenuePrefill` in `packages/i18n/src/launch.ts`. It makes no booking or availability claim.
   - **Enquiry & Consultation Form**: Server Action (`submitEnquiryAction`) posting to `POST /v1/leads` with Zod validation, honeypot protection, and unticked marketing consent.
2. **Planner & Admin Command Centre (`/[locale]/admin`)**:
   - **CRM Lead Pipeline**: Search, stage filter (`NEW`, `CONTACTED`, `PROPOSAL_SENT`, `WON`, `LOST`), ceremony filter, quick phone/walk-in lead intake, and native `<dialog>` Lead Inspector with live stage transitions and audit log recording.
   - **Active Perth Events & Run-Sheets**: Live RSVP headcount progress, logistics bridge recommendations, and **APP 3 Masked Dietary & Allergy Health Notes** (click-to-reveal with staff audit logging).
   - **Perth Partner & Venue Compliance**: ABN status, $20M Public Liability Insurance, WA Liquor & RSA, Council Health permits, and 12% Marketplace commission tracking.
   - **Finance, ATO GST & Audit Log**: Gross pipeline (incl. GST), 10% GST liability split (`splitIncGstCents`), net ex-GST agency & hire revenue, and chronological staff audit log.
3. **Legal & Compliance Pages (`/[locale]/[document]`)**:
   - `/privacy`, `/terms`, and `/accessibility` (WCAG 2.2 AA).

## Commands

Run from repository root:

```bash
pnpm --filter @managevent/marketing dev       # Port 3100
pnpm --filter @managevent/marketing build
pnpm --filter @managevent/marketing test
pnpm --filter @managevent/marketing test:e2e  # Playwright desktop/mobile + axe a11y suite
```

Deployment and secret-entry instructions: [../../infra/DEPLOY_RUNBOOK.md](../../infra/DEPLOY_RUNBOOK.md) and [../../docs/business/PERTH_STRATEGY.md](../../docs/business/PERTH_STRATEGY.md).
