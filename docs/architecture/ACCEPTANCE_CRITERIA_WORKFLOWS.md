# End-to-End Workflow Acceptance Criteria Matrix

This document defines the comprehensive Acceptance Criteria (AC) across the 5 core user journeys in the Managevent platform. All workflows adhere to Australian market requirements (en-AU, AUD cents currency, Sydney timezone/data residency, Australian Privacy Principles (APPs), and WCAG 2.2 AA accessibility).

---

## Workflow 1: Host Onboarding & Quote Builder

**User Journey:** Marketing Homepage (`/`) → Cost Estimator (`#estimator`) → Lead Intake → Admin CRM

### Acceptance Criteria

- [x] **AC-1.1 (Ceremony & Scale Input):** Host can select from supported ceremonies (Wedding, Milestone Birthday, Corporate Gala, Memorial/Celebration of Life) and configure guest counts (adults: 1–2000, children: 0–1000).
- [x] **AC-1.2 (AUD Cents & GST Calculation):** All financial estimates calculate in integer AUD cents, displaying low/high estimate ranges with a transparent 10% Australian GST line item breakdown (`incGstCents`, `exGstCents`, `gstCents`).
- [x] **AC-1.3 (Logistics Engine Integration):** Estimator dynamically computes operational metrics (estimated table count at 8–10 seats/table, catering portion buffer, bar service staff hours, celebration cake tiers).
- [x] **AC-1.4 (Memorial Mode Restraint):** When Memorial Service or Celebration of Life is selected, celebratory options (DJ/dance lighting, photo booths) are excluded or replaced with solemn alternatives (memorial tribute table, quiet acoustic reflection).
- [x] **AC-1.5 (Enquiry Form Hand-off & Spam Protection):** Host can transfer estimate configuration into the contact form (`#enquiry`) with prefilled details. The form includes honeypot anti-spam verification (`websiteUrl` must be empty) and optional marketing consent.
- [x] **AC-1.6 (Admin Pipeline Ingestion):** Submitted leads are ingested into `@managevent/admin` CRM with unassigned/new stage, allowing stage transitions (`NEW` → `CONTACTED` → `PROPOSAL_SENT` → `WON` / `LOST`).

---

## Workflow 2: Invitation Studio 0-to-100 Creation

**User Journey:** Studio Dashboard (`/studio`) → New Event Wizard (`/studio/new`) → Server Event API → Host Studio Management (`/studio/[eventId]`)

### Acceptance Criteria

- [x] **AC-2.1 (3-Step Wizard Flow):**
  - **Step 1 (Ceremony & Honourees):** Host selects ceremony slug, enters celebration headline/title and honouree/couple names.
  - **Step 2 (Date & Venue):** Host selects ceremony date/time (`startsAt`) and specifies venue name and Australian address.
  - **Step 3 (Theme & Gate):** Host chooses theme palette and envelope entrance style.
- [x] **AC-2.2 (Server-Synchronized Persistence):** Submitting the creation form calls `POST /api/events`. The server persists the event into `invitationStore` with an unguessable event salt, deterministic slug, and primary guest party.
- [x] **AC-2.3 (Memorial Mode Theme Guard):** If ceremony slug is memorial (`memorial-service`, `celebration-of-life`), `experienceMode` is locked to `"MEMORIAL"`, `gateStyle` is locked to `"plain-fade"`, and themes are restricted to memorial palettes (`memorial-alabaster`, `memorial-slate`).
- [x] **AC-2.4 (Studio Dashboard Management):** Upon creation, host is redirected to `/studio/[eventId]`. The server component SSR resolves the created event with 200 OK.
- [x] **AC-2.5 (Guest Link & Micro-site Preview):** Studio displays the primary guest link (`/i/[eventSlug]/[guestToken]`). Host can copy the link with visual confirmation or open the live micro-site in a new tab.
- [x] **AC-2.6 (Party Addition & CSV Bulk Import):** Host can add single guest parties or bulk import CSV guest lists via `POST /api/events/[eventId]/parties`. Unique party tokens and guest IDs are generated server-side.

---

## Workflow 3: Guest RSVP to Logistics Bridge

**User Journey:** Guest Invitation Micro-site (`/i/[slug]/[token]`) → Gate Reveal → RSVP Form Submission → Catering & Dietary Aggregation

### Acceptance Criteria

- [x] **AC-3.1 (Cryptographic Token Authentication):** Guest accesses invitation via unguessable token (`/i/[eventSlug]/[guestToken]`). Unknown or tampered tokens return a genuine 404 to protect host and guest privacy.
- [x] **AC-3.2 (Entrance Animation Gate):** Guest experiences ceremony gate entrance (wax seal crack, ribbon untie, architectural arch, or solemn fade) based on host configuration.
- [x] **AC-3.3 (Privacy Act / APP Sensitive Data Consent):** Collecting dietary requirements (Halal, Kosher, Vegan, Celiac) or anaphylaxis severity requires explicit guest consent prior to submission, honoring Privacy Act 1988 (Cth) Australian Privacy Principle 3.
- [x] **AC-3.4 (Multi-Member Party Attendance):** Primary guest can respond for themselves and individual party members (`YES` / `NO`), with dietary requirements tagged per person.
- [x] **AC-3.5 (Real-Time Host Summary):** Completed RSVPs update event statistics immediately (`confirmedAdults`, `confirmedChildren`, `declinedCount`, `pendingCount`, `dietaryBreakdown`).
- [x] **AC-3.6 (Catering Export Format):** Host can export dietary summaries via `GET /api/guests/export?eventId=[id]&format=csv` encoded with UTF-8 BOM for Microsoft Excel compatibility across Perth caterers.
- [x] **AC-3.7 (Awaiting Replies Chase Engine):** Host can view `/studio/[eventId]/awaiting` to review overdue and pending parties, with WhatsApp and SMS reminder copy generated per party.

---

## Workflow 4: Premium Event Pass Checkout

**User Journey:** Studio Entitlements → Stripe Connect AUD Payment → Plan Upgrade → Export & Messaging Unlock

### Acceptance Criteria

- [x] **AC-4.1 (Plan Pricing):** Digital invitation free tier supports up to 50 guests. Premium Event Pass is priced at $69.00 AUD ($6900 AUD cents incl. 10% GST).
- [x] **AC-4.2 (Free Memorial Policy):** Memorial and celebration of life events receive full Premium capabilities free of charge ($0 AUD), honoring respectful bereavement policy.
- [x] **AC-4.3 (Stripe Connect Webhook Idempotency):** Upgrades via Stripe `checkout.session.completed` verify webhook signature, store payment intent ID, and apply plan entitlement (`FREE` → `PREMIUM`) idempotently.
- [x] **AC-4.4 (Entitlement Enforcement):** Premium features (unlimited guest parties, CSV export, personalized WhatsApp blast generation, custom micro-site themes) unlock immediately upon confirmed upgrade.

---

## Workflow 5: On-the-Day Ceremony Execution

**User Journey:** Digital Ceremony Pass (`/pass`) → Offline Calendar Sync (`.ics`) → Check-in QR Scanning → Crew Logistics Mode

### Acceptance Criteria

- [x] **AC-5.1 (Digital Ceremony Pass):** Confirmed guests can access `/i/[eventSlug]/[guestToken]/pass`, rendering their names, table allocation, dietary badges, and check-in QR code.
- [x] **AC-5.2 (RFC 5545 Calendar File Sync):** Guests can download `.ics` calendar files (`/calendar.ics`) compliant with RFC 5545 §3.1 (75-octet line folding with CRLF + space continuation) for Apple, Google, and Outlook calendars.
- [x] **AC-5.3 (Fast Table & Seat Lookup):** Event check-in crew can scan guest QR codes or search guest name to verify attendance and seat allocation in real time.
- [x] **AC-5.4 (WCAG 2.2 AA Compliance):** All guest and host interfaces satisfy WCAG 2.2 AA accessibility (minimum 4.5:1 color contrast ratio across all 6 themes, semantic headings `h1`–`h3`, form label associations, responsive viewport without horizontal scrolling).

---

## Verification Test Matrix

| Workflow                                | Unit Test Coverage                             | E2E Browser Suite                                   | Accessibility (Axe) | Quality Gate Status |
| :-------------------------------------- | :--------------------------------------------- | :-------------------------------------------------- | :------------------ | :------------------ |
| **Workflow 1: Onboarding & Estimator**  | `packages/pricing/src/pricing.test.ts`         | `apps/marketing/tests/launch.spec.ts`               | 0 Axe Violations    | ✅ Passing          |
| **Workflow 2: Studio 0-to-100**         | `apps/invitation/tests/tokens.test.ts`         | `apps/invitation/tests/e2e/invitation-flow.spec.ts` | 0 Axe Violations    | ✅ Passing          |
| **Workflow 3: RSVP & Logistics Bridge** | `apps/invitation/tests/rsvp.test.ts`           | `apps/invitation/tests/e2e/invitation-flow.spec.ts` | 0 Axe Violations    | ✅ Passing          |
| **Workflow 4: Pass Checkout & Plans**   | `packages/payments/src/payments.test.ts`       | `apps/invitation/tests/e2e/invitation-flow.spec.ts` | 0 Axe Violations    | ✅ Passing          |
| **Workflow 5: On-the-Day Execution**    | `apps/invitation/tests/a1-correctness.test.ts` | `apps/invitation/tests/e2e/invitation-flow.spec.ts` | 0 Axe Violations    | ✅ Passing          |
