# Managevent Progress Tracker

## Step 5: Complete Technical & Programmatic Local SEO Architecture (`www` & `invitation`)

- **Expanded Validated Content Catalogue (`/content`):**
  - Expanded `/content/ceremonies/*.json` to **20 complete English (`en-AU`) ceremonies** across all 4 families (`CELEBRATION`, `CULTURAL`, `CORPORATE`, `SOLEMN`), each with `includes`, `timelineTemplate`, local Perth `faq`, and `seo` metadata.
  - Expanded `/content/packages/*.json` to **6 complete packages** (`wedding-signature-0-to-100`, `engagement-cocktail-soiree`, `milestone-birthday-essential`, `corporate-gala-turnkey`, `community-hall-transformation`, `celebration-of-life-gathering`).
  - Enriched `content/locations/perth/city.json` (19 Perth metropolitan areas served + rich `localIntro`), `content/locations/perth/venues.json` (9 Perth venue profiles with `suitableFor` and local notes), and `content/routes.json` (9 commercial Perth search aliases with `renderWithCanonical`).
  - Added build-time **WEBSITE.md §A7 Local SEO Thin-Content Guard** to `scripts/validate-content.mjs` (enforcing ≥ 3 local content blocks and ≥ 300 words across all 20 ceremonies and 9 commercial aliases).
- **Full SEO Route Tree & Structured Data in `apps/marketing` (`www.managevent.com.au`):**
  - Built `/ceremonies`, `/ceremonies/[slug]`, `/packages`, `/packages/[slug]`, `/venues`, `/venues/[slug]`, `/services`, `/invitations`, `/memorials`, `/faq`, `/how-it-works`, `/pricing`, `/about`, `/contact`, `/perth`, and `/perth/[slug]` (supporting all 20 ceremony slugs + 9 commercial aliases `/perth/weddings`, `/perth/birthday-party-packages`, `/perth/kids-party-packages`, `/perth/engagement-parties`, `/perth/corporate-events`, `/perth/community-hall-events`, `/perth/wake-catering`, `/perth/memorial-services`, `/perth/cultural-weddings`).
  - Gated non-Perth cities per `WEBSITE.md` §A7 (`hidden` cities return HTTP 404; `waitlist` cities render with `noindex`).
  - Implemented JSON-LD structured data builders (`apps/marketing/lib/seo-schema.ts`) for `Organization`, `LocalBusiness` + `EventPlanner`, `WebSite`, `Service`, `EventVenue`, `FAQPage`, and `BreadcrumbList`.
  - Dynamic `app/sitemap.ts` (70+ validated indexable URLs) and `app/robots.ts` (disallowing `/admin` and `/plan/estimate/`).
- **Invitation App SEO & English-Only Alignment (`apps/invitation`):**
  - Added `apps/invitation/app/sitemap.ts` (indexing `/` and `/templates`), `Sitemap` directive in `public/robots.txt`, `WebApplication` JSON-LD, `en-AU` canonical/hreflang alternates, and removed leftover Persian text in `apps/invitation/app/page.tsx` while keeping `X-Robots-Tag: noindex, nofollow, noarchive` on all private guest/studio routes.

## Step 4: English-only en-AU, Awaiting replies and venue enquiry prefill

- **English-only (en-AU):** the Persian locale, ceremonies and themes were removed (`deb3a5b`). The site is English-only for Australia; `packages/i18n` keeps its parity architecture so languages can be added later by a new decision.
- **Host "Awaiting replies" (`apps/invitation`, `/studio/[eventId]/awaiting`):** server component, `noindex`, real 404 for an unknown event. Shows awaiting, replied and total party counts, a deadline line (event time zone, Perth boundary handled) and per-party seats, table label and a read-only reminder with a copy button. Logic in `lib/rsvp-chase.ts` with tests; copy in `lib/rsvp-chase-copy.ts`. Memorial Mode is read through `getExperienceMode()` ("Replies requested by DD/MM/YYYY", calm text). `DECISION-NEEDED`: migrate the copy to `packages/i18n`; the route is as open as other studio routes until the auth gate lands. No link from `studio/[eventId]/page.tsx` yet.
- **Venue enquiry prefill (`apps/marketing`):** venue cards link to `/?venue=<slug>#enquiry`; the form prefills an editable neutral message via `lib/venue-prefill.ts` (`resolveVenueName`, with tests). Adds `launchVenueAsk`, `launchVenueNote` and `launchVenuePrefill` to `packages/i18n/src/launch.ts` (contract-change, additive).
- **Invitation and API hardening:** guest `NoscriptFallback`, `.ics` helpers split into `ics-helpers.ts`, `apps/invitation/tests/a1-correctness.test.ts`, API `middleware/context.ts` test, and `packages/api-client` updates. The `infra/vps` Caddyfile, compose and README were updated for the Sydney VPS.
- **Not verified in this pass:** `pnpm lint`, `test` and `build` (Node 20 locally); server build and migration are pending.

## Step 3: Perth All-Events Business Strategy, UI/UX Upgrade & Admin Command Centre

- **Perth All-Events Business Strategy (`docs/business/PERTH_STRATEGY.md` & `docs/business/BUSINESS_PLAN.md`)**:
  - Defined the 5 Perth event verticals (Weddings & Engagements, Milestone Birthdays & Private Celebrations, Corporate Galas & Brand Launches, Cultural & Community Ceremonies, and Funerals, Memorials & Wakes in **Memorial Mode**).
  - Established the **English-first launch architecture** (`/` default English across WA, with future languages powered by `@managevent/i18n` dictionary parity).
  - Documented unit economics (Agency 18–25% fee, Equipment Hire 65%+ gross margin, Marketplace 12% vendor commission, $69 AUD incl. GST Premium Event Pass, Free Memorial Pass) and 90-day Perth Go-To-Market playbook.
- **Beautiful Perth Marketing UI/UX (`apps/marketing`)**:
  - Redesigned the homepage with editorial Perth badges, trust metrics, 0-to-100 Services showcase, **Interactive Event & Ceremony Cost Estimator** (`#estimator` computing live AUD incl. 10% GST ranges + logistics bridge tables/portions/crew/cake + Memorial Mode switch + one-click Enquiry Form pre-fill), Curated Perth Venues showcase (`loadPerthVenues()` validated from `content/venues/perth.json`), and Digital RSVP-to-Catering Bridge explainer.
- **Planner & Admin Command Centre (`apps/admin` & `apps/marketing/app/[locale]/admin`)**:
  - Scaffolded `@managevent/admin` domain engine (`createAdminLeadRecord`, `transitionLeadStage`, `computeAdminPipelineFinancials`, `maskDietaryHealthSummary`, `revealDietaryHealthSummary`) with full unit tests.
  - Built `/admin` interactive Command Centre with 4 operational views: CRM Lead Pipeline (search, stage filter, ceremony filter, quick phone/walk-in intake, native `<dialog closedby="any">` Lead Inspector), Active Perth Events & Run-Sheets (with APP 3 masked dietary health notes & click-to-reveal audit log), Perth Partner & Venue Compliance (ABN, $20M PLI, WA Liquor/RSA), and Finance, ATO GST & Audit Log.

## Step 2 Work Log

- C implemented locally: English home, draft privacy/terms, accessibility, 404, metadata, hreflang, sitemap/robots, OG image and server-action enquiry via api-client. Self-hosted font subsets; configurable contact details. Twenty-two desktop/mobile Playwright tests passed against an isolated mock API, including axe. Local mobile Lighthouse: 90/100/100 (Performance/Accessibility/SEO).
- D prepared, not deployed: Fly API release migrations, internal worker, Docker environment exclusions, post-CI deploy job and deployment runbook. Real email adapter remains gated by verified domain; notifications use the confirmed inbox via configuration. Forged role headers no longer authorize access to private lead data.

- A4 done: ADR-0004 pins Prisma 6.x and records Supabase Sydney session-mode pooling for both database URLs.
- B done: `enc:v1` accepted; Premium is 6900 AUD cents incl. GST; memorials receive Premium free; Builder stays internal with placeholder rates. Eleven payment tests pass, including memorial limits, zero pricing and agency-bridge separation. Matching source decision comments removed; Phase 0 report below is historical.

- A1 done: database postinstall generates Prisma; Turbo build/typecheck/test explicitly depend on `@managevent/db#db:generate`. Verified a separate temporary clone with `pnpm install --frozen-lockfile` and `pnpm turbo run typecheck`: 27 tasks passed, no `.env` required.
- A2 done: append-only encrypted-health migration applied locally; raw RSVP rows have no plaintext dietary/severity properties. Database: 8 tests; validators: 15; worker: 2; focused typechecks pass. EventHeadcount accepts numeric counts only.
- A3 blocked: available upgrade tool does not expose the required dependency scan/install/upgrade operations. Existing Better Auth, Gemini SDK and config Tailwind versions have not been upgraded. The new marketing scaffold uses Next 16.4.2 and Tailwind/PostCSS 4.3.3.
- Production pending: no Fly/Vercel/Supabase/Resend tooling or authenticated provider sessions available. No cloud deployment performed. DNS values must come from the actual provider account, not generic examples.
- Contact defaults updated: `appilico.au@gmail.com`, phone removed from default / made optional; lead notification address updated to `appilico.au@gmail.com`. All configurable dynamically in Admin Panel.

Status key: ⬜ not started · 🟨 in progress · ✅ done

## Phase 0: Foundations

| ID     | Task                                                                                                                                                              | Status |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| FND-01 | Scaffold `packages/config` (tsconfig presets, ESLint flat config, Prettier, Tailwind v4 preset with brand tokens, Vitest preset, physical-direction ESLint rule)  | ✅     |
| FND-02 | `packages/db`: Prisma schema from `DATA_MODEL.md`, UUIDv7 ID generator, AES-256-GCM field encryption extension, initial migration, Perth placeholder seed         | ✅     |
| FND-03 | `packages/validators`: Zod schemas for every MVP API input/output, content schemas, primitives, fixture tests                                                     | ✅     |
| FND-04 | `packages/types`: domain types inferred from validators, branded ID types and helpers                                                                             | ✅     |
| FND-05 | `packages/i18n`: English dictionaries, `t()`, `getDir()`, Gregorian formatters, `getExperienceMode()`, parity test                                                | ✅     |
| FND-06 | `packages/ui`: celebration & memorial tokens, 6 invitation themes, CSS variables, Tailwind theme export, `ExperienceModeProvider`, base components, contrast test | ✅     |
| FND-07 | `packages/auth`: Better Auth config, roles, `PERMISSIONS.md` matrix, `requirePermission()`, resource scoping helpers, allowed/denied tests per permission         | ✅     |
| FND-08 | `packages/payments`: cents helpers, GST maths (`PAYMENTS_AND_GST.md`), tax invoice model, invitation plans/entitlements, Stripe test wrappers, rounding tests     | ✅     |
| FND-09 | `packages/pricing`: Builder estimator engine (`WEBSITE.md` §A6.4) with fixtures for every ceremony family                                                         | ✅     |
| FND-10 | `packages/logistics`: headcount → recommendations engine (`ARCHITECTURE.md` §6), pure functions, 100% branch coverage target                                      | ✅     |
| FND-11 | `apps/api`: Hono on Node 22, `/health`, Better Auth mount, `POST /v1/leads`, error model, request id, redaction, rate limit, idempotency, OpenAPI, Dockerfile     | ✅     |
| FND-12 | `apps/worker`: pg-boss setup, job registry (Zod, idempotent, dedupe key, retries), `lead.created` → email job                                                     | ✅     |
| FND-13 | `packages/notifications` (Resend, Twilio, consent, suppression, quiet hours, English templates) and `packages/storage` (R2 signed URLs)                           | ✅     |
| FND-14 | `packages/api-client`: typed client generated from `apps/api` OpenAPI spec, generate script, up-to-date verification test                                         | ✅     |
| FND-15 | CI: extend `.github/workflows/ci.yml` (Postgres service, migrate & drift check, i18n parity, content validation, tests) and write `infra/LOCAL_DEV.md`            | ✅     |
| FND-16 | `packages/ai`: `@google/genai` client, versioned prompt registry, Zod output schemas, quotas, PII scrubber, memorial tone guard, eval fixtures                    | ✅     |

## Phase 1: Marketing site `www`

| ID     | Task                                                                                                    | Status |
| ------ | ------------------------------------------------------------------------------------------------------- | ------ |
| MKT-01 | Scaffold `apps/marketing` (Next.js, i18n routing, metadata, fonts, layout, header, footer)              | ✅     |
| MKT-02 | Content loader for `content/` with validation against `content/schemas` at build                        | ✅     |
| MKT-03 | Home page with Perth editorial hero, 0-to-100 services matrix, and all-events showcase                  | ✅     |
| MKT-04 | Ceremonies hub (`/ceremonies`) and detail template (`/ceremonies/[slug]`), plus 20 ceremonies           | ✅     |
| MKT-05 | Packages catalogue (`/packages`) and detail (`/packages/[slug]`) with 6 packages                        | ✅     |
| MKT-06 | Instant Cost Estimator `#estimator` (event type, guest slider, tier, AUD incl. GST, logistics, prefill) | ✅     |
| MKT-07 | Venues showcase (`/venues` & `/venues/[slug]`) with 9 curated Perth locations                           | ✅     |
| MKT-08 | `/invitations` product showcase & Digital RSVP-to-Catering Bridge explainer                             | ✅     |
| MKT-09 | Memorial Mode applied automatically to solemn selections (`/memorials`, solemn ceremony & Perth pages)  | ✅     |
| MKT-10 | Programmatic local SEO: `/perth`, `/perth/[ceremony]`, aliases, thin-content guard in CI, gated cities  | ✅     |
| MKT-11 | Contact and Book forms → `/v1/leads`, auto-reply, planner notification, estimator pre-fill              | ✅     |
| MKT-12 | How it works, Pricing, FAQ, About, Contact, legal pages (`/privacy`, `/terms`), Accessibility statement | ✅     |
| MKT-13 | Technical SEO: dynamic sitemaps, robots, `en-AU` hreflang/canonicals, JSON-LD schemas, OG images        | ✅     |
| MKT-14 | Analytics with the consent banner and conversion events                                                 | ⬜     |
| MKT-15 | Playwright suite (home, Estimator, Admin Console, enquiry → lead, axe scans)                            | ✅     |
| MKT-16 | Admin Lite & Planner Command Centre (`apps/admin` + `/admin` in `apps/marketing`)                       | ✅     |

## Phase 2: Invitation app `invitation`

| ID     | Task                                                                                                    | Status |
| ------ | ------------------------------------------------------------------------------------------------------- | ------ |
| INV-01 | Scaffold `apps/invitation`, port themes and components per `MIGRATION.md`                               | ✅     |
| INV-02 | Data and API: events, sub-events, parties, guests, tokens, invitation design and content endpoints      | ✅     |
| INV-03 | Studio create flow                                                                                      | ✅     |
| INV-04 | AI wording assistant (English, tones including memorial) via `packages/ai`                              | ✅     |
| INV-05 | Guest micro-site: server-rendered core, gate reveal, Story, Timeline and Gallery views, music, calendar | ✅     |
| INV-06 | RSVP flow and `headcount.changed`                                                                       | ✅     |
| INV-07 | Host responses dashboard, CSV and XLSX export (UTF-8 BOM)                                               | ✅     |
| INV-08 | Share Studio: links, QR codes, `wa.me`, email invitations; bulk SMS and WhatsApp (Premium)              | ✅     |
| INV-09 | Plans and entitlements, Premium Event Pass checkout (Stripe), entitlement guards                        | ✅     |
| INV-10 | QR passes (signed tokens)                                                                               | ✅     |
| INV-11 | Photo wall (upload, moderation, realtime, `/display`)                                                   | ✅     |
| INV-12 | Wishing well (D-05 option a) and tribute book with moderation                                           | ✅     |
| INV-13 | Memorial Mode end to end, plus the memorial demo event                                                  | ✅     |
| INV-14 | Legacy slug import (`LegacySlug`), migration of the anniversary event                                   | ✅     |
| INV-15 | Hardening: in-app browser Playwright projects, no-JavaScript render test, rate limits, privacy headers  | ✅     |

## Phase 3: Customer portal `app`

| ID     | Task                                                                                        | Status |
| ------ | ------------------------------------------------------------------------------------------- | ------ |
| PRT-01 | Scaffold `apps/portal`, SSO, onboarding from a Builder estimate (`?estimate=`)              | ⬜     |
| PRT-02 | Event dashboard: timeline, checklist, key dates, planner contact                            | ⬜     |
| PRT-03 | Live RSVP and headcount panel (realtime), dietary breakdown                                 | ⬜     |
| PRT-04 | Recommendations: one-click apply (catering, cake, seating, hire) with re-pricing            | ⬜     |
| PRT-05 | Order customisation (add-ons, tiers), change requests to the planner                        | ⬜     |
| PRT-06 | Payment schedule: deposits and milestones, tax invoices (PDF)                               | ⬜     |
| PRT-07 | Interactive seating chart (drag and drop, tables from `logistics`, guest assignment, print) | ⬜     |
| PRT-08 | Budget tracker                                                                              | ⬜     |
| PRT-09 | Planner chat (realtime, attachments)                                                        | ⬜     |
| PRT-10 | Co-hosts and family collaborators (roles)                                                   | ⬜     |
| PRT-11 | Documents (contracts, run-sheet PDF), e-signature acceptance of terms                       | ⬜     |

## Phase 4: Vendor portal `vendors` and Admin `admin`

| ID     | Task                                                                         | Status |
| ------ | ---------------------------------------------------------------------------- | ------ |
| VEN-01 | Scaffold `apps/vendors`, vendor signup, organisation, ABN Lookup validation  | ⬜     |
| VEN-02 | Compliance uploads with expiry tracking                                      | ⬜     |
| VEN-03 | Stripe Connect Express onboarding (AU) and payout dashboard                  | ⬜     |
| VEN-04 | Service catalogue and availability calendar                                  | ⬜     |
| VEN-05 | Quotes and bookings inbox, run-sheets per booking                            | ⬜     |
| VEN-06 | Reviews (verified, post-event only)                                          | ⬜     |
| ADM-01 | Expand Admin Lite into the full CRM pipeline (leads → proposals → booked)    | ✅     |
| ADM-02 | Proposal builder (from estimates and packages), send, accept, deposit link   | ⬜     |
| ADM-03 | Event command centre: run-sheets, tasks, vendor assignment, crew rosters     | ✅     |
| ADM-04 | Vendor verification queue (approve or reject with reasons, expiry alerts)    | 🟨     |
| ADM-05 | Inventory (hire stock, barcodes, reservations, dispatch and return, damage)  | ⬜     |
| ADM-06 | Finance: margin per event, GST report, BAS export, Xero sync, payout release | 🟨     |
| ADM-07 | Content admin (until a CMS exists): packages, venues, prices                 | ⬜     |
| ADM-08 | Audit log viewer, user and role management, MFA enforcement                  | 🟨     |

## Phase 5: Mobile, iOS and Android

| ID     | Task                                                                                                  | Status |
| ------ | ----------------------------------------------------------------------------------------------------- | ------ |
| MOB-01 | Scaffold Expo (Router, NativeWind, i18n RTL, secure token storage), role-based navigation             | ⬜     |
| MOB-02 | Customer mode: event home, RSVP live counts with push, guest list, planner chat, quick photo sharing  | ⬜     |
| MOB-03 | Crew mode: roster, offline event pack, camera QR scanner, duplicate detection, guest and table lookup | ⬜     |
| MOB-04 | Crew setup and delivery checklists with photo evidence                                                | ⬜     |
| MOB-05 | Offline sync engine, conflict rules, background sync                                                  | ⬜     |
| MOB-06 | Push notifications (Expo), deep links into `invitation.` and `app.`                                   | ⬜     |
| MOB-07 | EAS build, store listings (English), privacy nutrition labels, TestFlight and internal testing        | ⬜     |

## Phase 6: Windows, Tauri

| ID     | Task                                                                                               | Status |
| ------ | -------------------------------------------------------------------------------------------------- | ------ |
| WIN-01 | Scaffold Tauri v2 (React UI on shared packages), auth, auto-updater, MSI or MSIX signing           | ⬜     |
| WIN-02 | Inventory and warehouse: barcode HID scanning, stock moves, dispatch and returns                   | ⬜     |
| WIN-03 | 2D floorplan and seating editor, sync with `app.`                                                  | ⬜     |
| WIN-04 | Batch printing: QR place cards, table numbers, welcome boards                                      | ⬜     |
| WIN-05 | Offline check-in kiosk (event pack, scanner or camera, kiosk lockdown mode)                        | ⬜     |
| WIN-06 | Live Display Controller: second screen or projector, slideshow, tribute reel, moderated photo wall | ⬜     |

## Business Track

| ID     | Task                                                                                    | Status |
| ------ | --------------------------------------------------------------------------------------- | ------ |
| BIZ-01 | Confirm the entity structure, ABN and ACN, GST registration                             | ⬜     |
| BIZ-02 | $20M public liability plus professional indemnity insurance                             | ⬜     |
| BIZ-03 | Draft terms, refund and cancellation policy, privacy policy, vendor terms; legal review | 🟨     |
| BIZ-04 | Stripe AU account, Connect platform profile, Afterpay enablement, confirm D-07 and D-08 | ⬜     |
| BIZ-05 | Twilio AU: register alphanumeric sender id, approve WhatsApp Business templates         | ⬜     |
| BIZ-06 | Perth supplier network                                                                  | ⬜     |
| BIZ-07 | Venue relationships                                                                     | ⬜     |
| BIZ-08 | Content: real photography, cultural content reviewer, licensed music library            | ⬜     |
| BIZ-09 | Google Business Profile (Perth), Instagram and community channels, launch offer         | 🟨     |
| BIZ-10 | Crew hiring and training: RSA, food handling, WWCC, uniforms, run-sheet training        | ⬜     |
| BIZ-11 | Accounting: Xero setup, chart of accounts for events, BAS cadence                       | ⬜     |

---

## PHASE 0 REPORT

### 1. What was built, per task

- **FND-01 (`packages/config`):**
  - TypeScript presets (`base.json`, `node.json`, `nextjs.json`, `react-library.json`, `expo.json`), Prettier preset, Vitest preset builder (`createVitestConfig`), and Tailwind v4 theme preset + `tailwind.css` using the Celebration and Memorial tokens.
  - Custom ESLint flat config (`createEslintConfig`) and `managevent/no-physical-direction-classes` rule blocking `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`.
  - Privacy-preserving log redaction utilities (`redactForLog`, `redactUrl`, `isSensitiveKey`, `REDACTED_FIELD_NAMES`).
- **FND-02 (`packages/db`):**
  - Complete Prisma schema (`prisma/schema.prisma`) implementing all enums, entities, relations, unique constraints, and indexes from `DATA_MODEL.md`, plus `TaxInvoiceSequence` for gapless invoice numbering.
  - RFC 9562 monotonic UUIDv7 generator and prefixed ID helpers (`generateId`, `isValidPrefixedId`, `extractIdTimestamp`) covering all domain prefixes.
  - AES-256-GCM field-level encryption extension (`createFieldEncryptionExtension`, `enc:v1:<iv>:<tag>:<ciphertext>`) for 🔒 fields (`Rsvp.allergyNotes`, `Rsvp.accessibilityNotes`, `Rsvp.dietaryEncrypted`, `Rsvp.allergySeverityEncrypted`, and private `WellEntry.message`).
  - Initial migration (`20261023000000_init`) and idempotent Perth placeholder seed (`src/seed.ts`) loaded from `/content`.
- **FND-03 (`packages/validators`):**
  - Primitives: `CentsSchema`, `SignedCentsSchema`, `CurrencySchema` (`AUD`), `AuPhoneSchema`, `AbnSchema` (11-digit ATO modulus-89 checksum), `IanaTimeZoneSchema`, `LocaleSchema`, `SlugSchema`, `SafeEventSlugSchema`, `GuestTokenSchema`, and `prefixedIdSchema`.
  - Content schemas mirroring `content/schemas/*.schema.json` and validated against all files in `/content`.
  - MVP API input and output schemas for leads, builder & estimates, events, invitations (with theme/mode compatibility and Memorial Mode rules), parties, guests, RSVP, passes & check-in scans, orders, recommendations, payments, and ATO tax invoices.
- **FND-04 (`packages/types`):**
  - Domain types inferred from `@managevent/validators` (`z.infer`), compile-time branded entity ID types (`EventId`, `UserId`, `LeadId`, etc.), `AudCents`, and runtime type guards (`isBrandedId`, `asBrandedId`, `isAudCents`).
- **FND-05 (`packages/i18n`):**
  - Typed `en` dictionaries across all 11 namespaces in `I18N_RTL.md` (`common`, `marketing`, `invitation`, `portal`, `vendors`, `admin`, `mobile`, `desktop`, `ceremonies`, `legal`, `emails`).
  - `t()` and `getDir()`.
  - Deterministic Gregorian date formatters (`formatGregorianDate`, `formatCeremonyDate`) with zero `Intl` calls in SSR paths.
  - Canonical `getExperienceMode()` helper and dictionary parity test.
- **FND-06 (`packages/ui`):**
  - Celebration and Memorial palette tokens, typography, corner radius hierarchy, and motion tokens per `DESIGN_SYSTEM.md`.
  - All 6 invitation themes (`royal-ivory`, `midnight-celestial`, `emerald-botanic`, `alabaster-platinum`, `memorial-alabaster`, `memorial-slate`) with `isThemeCompatibleWithMode()`.
  - `ExperienceModeProvider`, RTL-safe base components (`Button`, `Panel`, `Input`, `Badge`), `ArchFrame` motif, and WCAG 2.2 contrast ratio tests for every documented text pairing.
- **FND-07 (`packages/auth`):**
  - Self-hosted Better Auth configuration (`buildBetterAuthConfig`, `createManageventAuth`) with `organization`, `twoFactor`, `magicLink`, and `bearer` plugins and cross-subdomain cookies (`AUTH_COOKIE_DOMAIN`).
  - Authoritative 22-permission RBAC matrix (`PERMISSION_MATRIX`), `requirePermission()`, and scoping helpers (`canCoHostPerform`, `canVendorAccessOrgResource`, `isWithinCrewRosterWindow` ±24h), with allowed and denied tests for every permission.
- **FND-08 (`packages/payments`):**
  - AUD integer cents guards and Australian GST (10%) per-line half-up rounding (`splitIncGstCents`, `splitExGstCents`, `priceLineFromUnitIncGst`, `priceLineFromUnitExGst`, `sumPricedLines`, `formatAudCents`).
  - ATO-compliant `buildTaxInvoice`, `formatTaxInvoiceNumber`, and `buildDefaultPaymentSchedule`.
  - Invitation plans and entitlements (`FREE`, `PREMIUM`, `AGENCY` per `WEBSITE.md` §B14) and Stripe test-mode PaymentIntent, Connect transfer, and webhook signature verification wrappers.
- **FND-09 (`packages/pricing`):**
  - Pure Ceremony Builder cost estimator (`calculateBuilderEstimate`, price list `2026.10.1`) supporting `GUEST`, `TABLE`, `HOUR`, and `FIXED` quantity drivers, travel zones (`METRO`, `OUTER_METRO`, `REGIONAL`), category `±%` bands, Memorial Mode extra filtering, and fixtures for all 4 ceremony families.
- **FND-10 (`packages/logistics`):**
  - Pure, versioned (`1.0.0`) headcount → recommendations engine (`calculateHeadcountBasis`, `generateLogisticsRecommendations`) computing catering portions, separate counts for every dietary tag and individual allergen (never merged into "other"), cake serves, adult and kids' tables, chairs, linen, tableware with breakage buffer, waiter ratios, WA RSA bar staffing, and vendor `finalNumbersDueAt` cut-off advisories.
- **FND-11 (`apps/api`):**
  - Hono server on Node 22 with `GET /health`, Better Auth mount (`/api/auth/*`), `POST /v1/leads` and `GET /v1/leads` (`Zod` → `requirePermission` / rate limit → `LeadService` → `LeadRepository`), `Idempotency-Key` deduplication, `X-Request-Id`, PII-redacted structured logging, OpenAPI 3.1 spec generation (`GET /openapi.json`), `Dockerfile`, and `fly.toml` (`syd`).
- **FND-12 (`apps/worker`):**
  - `pg-boss` worker and `WorkerJobRegistry` (Zod payload validation, idempotency `dedupeKey`, exponential backoff retries, dead-letter queues), `lead.created` localised email job, and `headcount.changed` → `RecommendationSet` job.
- **FND-13 (`packages/notifications` & `packages/storage`):**
  - Resend and Twilio clients enforcing Spam Act 2003 consent, global channel suppression, 8am–8pm quiet hours in recipient local time, and `en` templates.
  - Cloudflare R2 storage helper with public/private bucket selection, short-lived AWS SigV4 signed upload/download URLs, EXIF-strip guards, and AVIF/WebP/H.264 variant descriptors.
- **FND-14 (`packages/api-client`):**
  - Typed API client generated from `apps/api`'s OpenAPI 3.1 spec (`src/generated.ts`), with `generate` and `generate:check` scripts and verification tests.
- **FND-15 (`.github/workflows/ci.yml` & `infra/`):**
  - Extended CI workflow with PostgreSQL 16 service container, `prisma migrate deploy`, schema drift check (`db:drift-check`), database seeding, `/content` validation (`scripts/validate-content.mjs`), i18n parity check, OpenAPI client freshness check, formatting, lint, typecheck, tests, and build. Added `infra/LOCAL_DEV.md` and `infra/INCIDENT_RUNBOOK.md`.
- **FND-16 (`packages/ai`):**
  - Server-only `@google/genai` client wrapper (`ManageventAiClient`) with environment-resolved model IDs (`GEMINI_MODEL_FAST`, `GEMINI_MODEL_REASONING`), versioned prompt registry (`ai.ceremony_architect`, `ai.bilingual_copywriter`, `ai.budget_allocator`), Zod output schemas, daily per-user/anonymous quotas (`AiQuotaManager`), APP 8 PII & health-data prompt scrubber (`scrubPromptPii`), Memorial Mode tone guardrails (`enforceMemorialToneGuard`, `validateMemorialAiOutput`), and eval fixtures.

### 2. Test counts per package & coverage for payments, pricing and logistics

| Workspace                   | Test Files | Tests Passed | Notes / Coverage                                                                                                       |
| --------------------------- | ---------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `@managevent/config`        | 1          | 10           | ESLint physical-direction rule, log redaction, Tailwind/Vitest/Prettier presets                                        |
| `@managevent/db`            | 1          | 8            | UUIDv7 monotonicity, AES-256-GCM encryption, Postgres seed & RSVP round-trip                                           |
| `@managevent/validators`    | 1          | 14           | Valid & invalid fixtures for every primitive, `/content` file, and API schema                                          |
| `@managevent/types`         | 1          | 2            | Branded IDs (`EventId`, `UserId`) and domain type guards                                                               |
| `@managevent/i18n`          | 1          | 10           | 11-namespace dictionaries, Gregorian dates, mode                                                                       |
| `@managevent/ui`            | 1          | 6            | WCAG 2.2 AA contrast tests, 6 invitation themes, `ExperienceModeProvider`, arch                                        |
| `@managevent/auth`          | 1          | 28           | Better Auth config, scoping helpers, allowed & denied tests for all 22 perms                                           |
| `@managevent/payments`      | 1          | 10           | **Coverage:** 99.49% Stmts · 93.40% Branches · 100% Funcs · 99.49% Lines (`gst.ts`, `invoice.ts`, `plans.ts` all 100%) |
| `@managevent/pricing`       | 1          | 3            | **Coverage:** 100% Stmts · 97.14% Branches · 100% Funcs · 100% Lines                                                   |
| `@managevent/logistics`     | 1          | 3            | **Coverage:** 100% Stmts · 100% Branches · 100% Funcs · 100% Lines                                                     |
| `@managevent/api`           | 1          | 5            | `/health`, `/openapi.json`, `POST /v1/leads` (DB + job + idempotency + 429), RBAC                                      |
| `@managevent/worker`        | 1          | 2            | `lead.created` email job & `headcount.changed` → `RecommendationSet` DB test                                           |
| `@managevent/notifications` | 1          | 3            | English templates, quiet hours (8am–8pm), suppression, Resend & Twilio wrappers                                        |
| `@managevent/storage`       | 1          | 3            | R2 bucket selection, short-lived signed URLs, EXIF guard, media variants                                               |
| `@managevent/api-client`    | 1          | 2            | OpenAPI client freshness check & end-to-end typed client calls                                                         |
| `@managevent/ai`            | 1          | 5            | Env model resolution, PII/health scrubber, Memorial tone guard, quotas, fixtures                                       |
| **Total**                   | **16**     | **114**      | **114 / 114 passing (0 errors, 0 skipped)**                                                                            |

### 3. Exact library versions chosen

| Library                          | Pinned Version      | Rationale                                                                                                                 |
| -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `typescript`                     | `5.9.3`             | Per ADR-0010 (`typescript@~5.9` pinned until Next.js, Expo and `typescript-eslint` support TS 7).                         |
| `prisma` / `@prisma/client`      | `6.19.3`            | Latest stable 6.x release supporting `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` from `.env.example`. |
| `zod`                            | `3.24.4`            | Compatible across `@hono/zod-openapi`, `better-auth`, and `@google/genai` with zero peer conflicts.                       |
| `hono`                           | `4.13.13`           | Current stable Hono 4 release (`@hono/node-server` `1.14.1`, `@hono/zod-openapi` `0.19.10`).                              |
| `better-auth`                    | `1.2.12`            | Self-hosted Better Auth with `organization`, `twoFactor`, `magicLink`, and `bearer` plugins.                              |
| `pg-boss`                        | `10.4.2`            | PostgreSQL-backed queue for `apps/api` and `apps/worker` (`ADR-0003`).                                                    |
| `vitest` / `@vitest/coverage-v8` | `3.0.9`             | Fast ESM workspace runner with v8 branch/line coverage reporting.                                                         |
| `tailwindcss`                    | `4.0.14`            | Tailwind CSS v4 (`@theme` CSS-first configuration in `@managevent/config`).                                               |
| `@google/genai`                  | `1.4.0`             | Official Google Gen AI SDK (`ADR-0009`).                                                                                  |
| `stripe`                         | `23.0.1`            | Stripe Node SDK for AUD PaymentIntents, Connect transfers, and webhooks.                                                  |
| `eslint` / `typescript-eslint`   | `9.39.5` / `8.72.0` | Flat config ESLint 9 with full TypeScript 5.9 support.                                                                    |
| `prettier`                       | `3.9.10`            | Repo-wide code formatting.                                                                                                |
| `turbo`                          | `2.11.10`           | Monorepo task orchestration.                                                                                              |

### 4. DECISION-NEEDED items and deviations from docs

- **`// DECISION-NEEDED(FND-02)` (`packages/db/src/encryption.ts`):** Key rotation version registry for `PII_ENCRYPTION_KEY`. All ciphertexts are prefixed with `enc:v1:` so future key versions (`enc:v2:`) can be rotated seamlessly without schema changes. Moreover, `Rsvp.dietary` and `Rsvp.allergySeverity` keep their typed Prisma enum columns from `DATA_MODEL.md` while also storing AES-256-GCM ciphertext in `dietaryEncrypted` and `allergySeverityEncrypted`.
- **`// DECISION-NEEDED(FND-08)` (`packages/payments/src/plans.ts`):** Final consumer price point for the one-off Premium Event Pass (`$39` / `$69` / `$99` AUD incl. GST; set to placeholder `6900` cents = `$69.00 incl. GST`) and whether Memorial Mode invitations receive Premium entitlements free (`docs/business/PRICING_MODEL.md`).
- **`// DECISION-NEEDED(FND-09)` (`packages/pricing/src/price-list.ts`):** Final Perth launch service tier unit rates and outer-metro travel fee (`35000` cents = `$350.00 incl. GST` placeholder) in `priceListVersion = "2026.10.1"`.
- **Prisma version note (`packages/db`):** ADR-0004 mentioned Prisma 7.x, while `.env.example` uses Prisma 6's `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` in `schema.prisma` (which Prisma 7 removed in favour of driver adapters). We pinned `prisma@6.19.3` so `.env.example`, `prisma migrate deploy`, and `prisma migrate diff` work out-of-the-box without breaking `.env.example`.

### 5. Waiting on human

- **BIZ-01 / D-10:** Confirm operating entity structure (`Appilico Pty Ltd` trading as Managevent), real 11-digit ABN/ACN, and GST registration before issuing production tax invoices.
- **BIZ-04 / D-07 / D-08:** Live Stripe Australia account credentials, Connect Express platform profile approval, and legal sign-off on holding customer deposits/milestones prior to event delivery.
- **BIZ-05:** ACMA registration of the alphanumeric SMS sender ID `Managevent` and Meta approval for English WhatsApp Business templates.
- **BIZ-08:** Cultural reviewer sign-off on strings in `@managevent/i18n` and `/content/ceremonies/*.json`.
- **Production secrets (for staging/production deployment only; mocked locally):** `PII_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, `GUEST_TOKEN_PEPPER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`, `R2_SECRET_ACCESS_KEY`, `GEMINI_API_KEY`.

### 6. Known gaps or risks before Phase 1 (`apps/marketing`)

- **Content expansion (MKT-04 / MKT-05):** `/content` currently contains 2 ceremonies (`wedding`, `celebration-of-life`), 2 packages, and 9 Perth placeholder venues. Phase 1 (`MKT-04`, `MKT-05`) will expand `/content` to 8 fully written ceremonies and 6 packages to pass the 300-word local SEO thin-content guard (`MKT-10`).
- **Font subsetting (MKT-01):** Self-hosted WOFF2 subsets for `Cormorant Garamond`, and `Plus Jakarta Sans` need to be bundled in `apps/marketing` and `apps/invitation` to meet the `< 2.5s` 4G LCP budget.

## STEP 2 REPORT

**Status: partial; production deployment is blocked. No cloud resources were deployed and no live emails were sent.**

### URLs

- Local: http://localhost:3100.
- Intended production: https://www.managevent.com.au, and https://api.managevent.com.au/health. Not verified live by this session.
- Apex HTTPS and the requested 301 redirect have not been provisioned or verified.

### Completed Code

- A1: postinstall Prisma generation and explicit Turbo generation dependencies. A separate temporary clone passed install and all 27 typecheck tasks without `.env`.
- A2: new guarded migration drops plaintext RSVP dietary/severity columns. Encryption removes plaintext write keys. Raw-row tests prove encrypted-only storage; worker snapshots validate counts only and reject cross-event references.
- A4: ADR-0004 pins Prisma 6.x and requires Supabase Sydney session pooling for both database URLs.
- B: enc:v1 accepted; Premium confirmed at 6900 AUD cents incl. GST; memorial Premium entitlements are free without granting agency fulfilment; Builder stays unpublished with placeholder rates.
- C: minimal English marketing site, local font subsets, enquiry server action calling api-client, honeypot, unticked marketing consent, success/error states, draft legal pages, accessibility, 404, sitemap/robots, metadata and OG image. No fake prices, reviews, ABN or partner venues. Configurable owner contact defaults retained.
- D preparation only: Sydney Fly configs, API migration release command, internal worker without public ports, Docker secret exclusions, post-CI Fly deployment job and `infra/DEPLOY_RUNBOOK.md`.
- Production safety: verified-session lead authorization replaces forged role headers; production auth requires an explicit secret; errors omit raw internal details. Resend production transport is verification-gated and uses stable per-email idempotency keys. Lead notifications default to the confirmed inbox via configurable environment settings.

### Verification

- Scoped Turbo lint/typecheck/test/build: **69 tasks passed**, excluding the concurrently edited invitation app only.
- Unit/integration tests in the implemented scope: **120** across 18 test files (including the final worker adapter tests).
- Marketing Playwright: **22 passed** across desktop/mobile, mocked server-to-server API submission, validation, image rendering, overflow, axe scans and private Builder 404.
- Local production-build mobile Lighthouse: **Performance 90, Accessibility 100, SEO 100**. These are local measurements, not live production scores.
- Full root gates were attempted: formatting fails in concurrent invitation files; Turbo stops on invitation lint (`prefer-const` in its i18n helper). That unrelated work was not changed, staged or committed here. CI is not claimed green.
- Docker build, Supabase migration/seed, provider deploys, live HTTPS and real email receipt remain unverified.

### Waiting On Human / Blockers

- A3 remains pending: the available upgrade workflow does not expose its required scoped scan/install/upgrade tools. Existing Better Auth 1.2.12, Gemini SDK 1.4.0 and config Tailwind 4.0.14 were not upgraded. The new marketing app uses Next 16.4.2 and Tailwind/PostCSS 4.3.3. Existing peer warnings remain and must be resolved before launch.
- Authenticate official Fly/Vercel CLIs and select the production provider accounts. Supply Supabase Sydney session connection strings and production secrets **only through private provider/terminal prompts**, never chat or committed files. Exact secret-entry commands are in the runbook.
- Add `FLY_API_TOKEN` as a repository secret. Resolve concurrent invitation checks before merging to `main`. Contract-change label lookup returned 404; GitHub issue/PR tracking remains pending.
- Obtain actual Vercel, Fly certificate/IP and Resend domain DNS records. One exact DNS table is pending provider access; no guessed records were supplied. Wait for owner confirmation before verification. DMARC policy is `p=none`.
- Verify Resend domain before enabling the email gate or submitting any live enquiry. Confirm the lead row, queue completion, notification receipt and translated auto-reply after deployment.
- Legal/cultural review of draft copy remains pending. Preview noindex is implemented, but a real Vercel preview and its configuration are not verified.

### Monthly Cost Estimate

Indicative USD before tax, exchange rates and usage: Fly two always-on shared machines $10-20; Supabase Pro about $25; Vercel Pro about $20 per member for commercial use; Resend free within limits or about $20 Pro. Planning total **$55-85/month** for one Vercel member. Confirm current provider pricing, regional usage and backup requirements before provisioning; these are estimates, not retrieved quotes.
