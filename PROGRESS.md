# Managevent Progress Tracker

## Step 2 Work Log

- A1 done: database postinstall generates Prisma; Turbo build/typecheck/test explicitly depend on `@managevent/db#db:generate`. Verified a separate temporary clone with `pnpm install --frozen-lockfile` and `pnpm turbo run typecheck`: 27 tasks passed, no `.env` required.
- A2 done: append-only encrypted-health migration applied locally; raw RSVP rows have no plaintext dietary/severity properties. Database: 8 tests; validators: 15; worker: 2; focused typechecks pass. EventHeadcount accepts numeric counts only.
- A3 blocked: available upgrade tool does not expose the required dependency scan/install/upgrade operations. No versions have been changed in Step 2.
- Production pending: no Fly/Vercel/Supabase/Resend tooling or authenticated provider sessions available. No cloud deployment performed. DNS values must come from the actual provider account, not generic examples.
- Contact defaults approved: `sadra.tabarestani@gmail.com`, `0452657916`; lead notification address confirmed as `m.sadra.mst@gmail.com`. All remain configurable.

Status key: ⬜ not started · 🟨 in progress · ✅ done

## Phase 0: Foundations

| ID     | Task                                                                                                                                                              | Status |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| FND-01 | Scaffold `packages/config` (tsconfig presets, ESLint flat config, Prettier, Tailwind v4 preset with brand tokens, Vitest preset, physical-direction ESLint rule)  | ✅     |
| FND-02 | `packages/db`: Prisma schema from `DATA_MODEL.md`, UUIDv7 ID generator, AES-256-GCM field encryption extension, initial migration, Perth placeholder seed         | ✅     |
| FND-03 | `packages/validators`: Zod schemas for every MVP API input/output, content schemas, primitives, fixture tests                                                     | ✅     |
| FND-04 | `packages/types`: domain types inferred from validators, branded ID types and helpers                                                                             | ✅     |
| FND-05 | `packages/i18n`: EN and FA dictionaries, `t()`, `getDir()`, Persian digits & ی/ک normalisation, Gregorian & Jalali formatters, `getExperienceMode()`, parity test | ✅     |
| FND-06 | `packages/ui`: celebration & memorial tokens, 7 invitation themes, CSS variables, Tailwind theme export, `ExperienceModeProvider`, base components, contrast test | ✅     |
| FND-07 | `packages/auth`: Better Auth config, roles, `PERMISSIONS.md` matrix, `requirePermission()`, resource scoping helpers, allowed/denied tests per permission         | ✅     |
| FND-08 | `packages/payments`: cents helpers, GST maths (`PAYMENTS_AND_GST.md`), tax invoice model, invitation plans/entitlements, Stripe test wrappers, rounding tests     | ✅     |
| FND-09 | `packages/pricing`: Builder estimator engine (`WEBSITE.md` §A6.4) with fixtures for every ceremony family                                                         | ✅     |
| FND-10 | `packages/logistics`: headcount → recommendations engine (`ARCHITECTURE.md` §6), pure functions, 100% branch coverage target                                      | ✅     |
| FND-11 | `apps/api`: Hono on Node 22, `/health`, Better Auth mount, `POST /v1/leads`, error model, request id, redaction, rate limit, idempotency, OpenAPI, Dockerfile     | ✅     |
| FND-12 | `apps/worker`: pg-boss setup, job registry (Zod, idempotent, dedupe key, retries), `lead.created` → email job                                                     | ✅     |
| FND-13 | `packages/notifications` (Resend, Twilio, consent, suppression, quiet hours, EN/FA templates) and `packages/storage` (R2 signed URLs)                             | ✅     |
| FND-14 | `packages/api-client`: typed client generated from `apps/api` OpenAPI spec, generate script, up-to-date verification test                                         | ✅     |
| FND-15 | CI: extend `.github/workflows/ci.yml` (Postgres service, migrate & drift check, i18n parity, content validation, tests) and write `infra/LOCAL_DEV.md`            | ✅     |
| FND-16 | `packages/ai`: `@google/genai` client, versioned prompt registry, Zod output schemas, quotas, PII scrubber, memorial tone guard, eval fixtures                    | ✅     |

## Phase 1: Marketing site `www`

| ID     | Task                                                                                                   | Status |
| ------ | ------------------------------------------------------------------------------------------------------ | ------ |
| MKT-01 | Scaffold `apps/marketing` (Next.js, i18n routing `/fa`, metadata, fonts, layout, header, footer)       | ⬜     |
| MKT-02 | Content loader for `content/` with validation against `content/schemas` at build                       | ⬜     |
| MKT-03 | Home page with the ceremony dial hero                                                                  | ⬜     |
| MKT-04 | Ceremonies hub and detail template, plus 8 fully written ceremonies (EN and FA)                        | ⬜     |
| MKT-05 | Packages catalogue and detail                                                                          | ⬜     |
| MKT-06 | Ceremony Builder `/plan` (steps, URL state, estimate via the API, save, share link, lead capture)      | ⬜     |
| MKT-07 | Venues list (map) and detail, with Perth placeholders                                                  | ⬜     |
| MKT-08 | `/invitations` product page with a demo phone mock-up                                                  | ⬜     |
| MKT-09 | Memorials hub, with Memorial Mode applied to all solemn routes                                         | ⬜     |
| MKT-10 | Programmatic local SEO: `/perth`, `/perth/[ceremony]`, aliases, thin-content guard in CI, gated cities | ⬜     |
| MKT-11 | Contact and Book forms → `/v1/leads`, auto-reply, planner notification                                 | ⬜     |
| MKT-12 | FAQ, How it works, Pricing explainer, About, legal pages (MDX), Accessibility statement                | ⬜     |
| MKT-13 | Technical SEO: sitemaps, robots, JSON-LD, generated OG images (EN and FA)                              | ⬜     |
| MKT-14 | Analytics with the consent banner and conversion events                                                | ⬜     |
| MKT-15 | Playwright suite (Builder → lead, RTL snapshots, Memorial Mode), Lighthouse CI budgets                 | ⬜     |
| MKT-16 | Admin Lite: minimal `apps/admin` lead inbox behind staff auth                                          | ⬜     |

## Phase 2: Invitation app `invitation`

| ID     | Task                                                                                                    | Status |
| ------ | ------------------------------------------------------------------------------------------------------- | ------ |
| INV-01 | Scaffold `apps/invitation`, port themes and components per `MIGRATION.md`                               | ⬜     |
| INV-02 | Data and API: events, sub-events, parties, guests, tokens, invitation design and content endpoints      | ⬜     |
| INV-03 | Studio create flow                                                                                      | ⬜     |
| INV-04 | AI wording assistant (EN and FA, tones including memorial) via `packages/ai`                            | ⬜     |
| INV-05 | Guest micro-site: server-rendered core, gate reveal, Story, Timeline and Gallery views, music, calendar | ⬜     |
| INV-06 | RSVP flow and `headcount.changed`                                                                       | ⬜     |
| INV-07 | Host responses dashboard, CSV and XLSX export (UTF-8 BOM)                                               | ⬜     |
| INV-08 | Share Studio: links, QR codes, `wa.me`, email invitations; bulk SMS and WhatsApp (Premium)              | ⬜     |
| INV-09 | Plans and entitlements, Premium Event Pass checkout (Stripe), entitlement guards                        | ⬜     |
| INV-10 | QR passes (signed tokens)                                                                               | ⬜     |
| INV-11 | Photo wall (upload, moderation, realtime, `/display`)                                                   | ⬜     |
| INV-12 | Wishing well (D-05 option a) and tribute book with moderation                                           | ⬜     |
| INV-13 | Memorial Mode end to end, plus the memorial demo event                                                  | ⬜     |
| INV-14 | Legacy slug import (`LegacySlug`), migration of the anniversary event                                   | ⬜     |
| INV-15 | Hardening: in-app browser Playwright projects, no-JavaScript render test, rate limits, privacy headers  | ⬜     |

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
| ADM-01 | Expand Admin Lite into the full CRM pipeline (leads → proposals → booked)    | ⬜     |
| ADM-02 | Proposal builder (from estimates and packages), send, accept, deposit link   | ⬜     |
| ADM-03 | Event command centre: run-sheets, tasks, vendor assignment, crew rosters     | ⬜     |
| ADM-04 | Vendor verification queue (approve or reject with reasons, expiry alerts)    | ⬜     |
| ADM-05 | Inventory (hire stock, barcodes, reservations, dispatch and return, damage)  | ⬜     |
| ADM-06 | Finance: margin per event, GST report, BAS export, Xero sync, payout release | ⬜     |
| ADM-07 | Content admin (until a CMS exists): packages, venues, prices                 | ⬜     |
| ADM-08 | Audit log viewer, user and role management, MFA enforcement                  | ⬜     |

## Phase 5: Mobile, iOS and Android

| ID     | Task                                                                                                  | Status |
| ------ | ----------------------------------------------------------------------------------------------------- | ------ |
| MOB-01 | Scaffold Expo (Router, NativeWind, i18n RTL, secure token storage), role-based navigation             | ⬜     |
| MOB-02 | Customer mode: event home, RSVP live counts with push, guest list, planner chat, quick photo sharing  | ⬜     |
| MOB-03 | Crew mode: roster, offline event pack, camera QR scanner, duplicate detection, guest and table lookup | ⬜     |
| MOB-04 | Crew setup and delivery checklists with photo evidence                                                | ⬜     |
| MOB-05 | Offline sync engine, conflict rules, background sync                                                  | ⬜     |
| MOB-06 | Push notifications (Expo), deep links into `invitation.` and `app.`                                   | ⬜     |
| MOB-07 | EAS build, store listings (EN and FA), privacy nutrition labels, TestFlight and internal testing      | ⬜     |

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
| BIZ-03 | Draft terms, refund and cancellation policy, privacy policy, vendor terms; legal review | ⬜     |
| BIZ-04 | Stripe AU account, Connect platform profile, Afterpay enablement, confirm D-07 and D-08 | ⬜     |
| BIZ-05 | Twilio AU: register alphanumeric sender id, approve WhatsApp Business templates         | ⬜     |
| BIZ-06 | Perth supplier network                                                                  | ⬜     |
| BIZ-07 | Venue relationships                                                                     | ⬜     |
| BIZ-08 | Content: real photography, Persian cultural content reviewer, licensed music library    | ⬜     |
| BIZ-09 | Google Business Profile (Perth), Instagram and Farsi community channels, launch offer   | ⬜     |
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
  - Typed `en` and `fa` dictionaries across all 11 namespaces in `I18N_RTL.md` (`common`, `marketing`, `invitation`, `portal`, `vendors`, `admin`, `mobile`, `desktop`, `ceremonies`, `legal`, `emails`).
  - `t()`, `getDir()`, `toPersianDigits()`, `toLatinDigits()`, `normalizePersianText()` (normalising Arabic `ي`/`ى`/`ك` to Persian `ی`/`ک`), and `isolateLtr()`.
  - Deterministic Gregorian and Jalali (Solar Hijri) date formatters (`formatGregorianDate`, `formatJalaliDate`, `formatCeremonyDate`) with zero `Intl` calls in SSR paths.
  - Canonical `getExperienceMode()` helper and dictionary parity test.
- **FND-06 (`packages/ui`):**
  - Celebration and Memorial palette tokens, typography, corner radius hierarchy, and motion tokens per `DESIGN_SYSTEM.md`.
  - All 7 invitation themes (`royal-ivory`, `midnight-celestial`, `emerald-botanic`, `persian-azure`, `alabaster-platinum`, `memorial-alabaster`, `memorial-slate`) with `isThemeCompatibleWithMode()`.
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
  - Resend and Twilio clients enforcing Spam Act 2003 consent, global channel suppression, 8am–8pm quiet hours in recipient local time, and bilingual `en`/`fa` templates.
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
| `@managevent/i18n`          | 1          | 10           | 11-namespace EN/FA parity, Persian script hygiene, Jalali/Gregorian dates, mode                                        |
| `@managevent/ui`            | 1          | 6            | WCAG 2.2 AA contrast tests, 7 invitation themes, `ExperienceModeProvider`, arch                                        |
| `@managevent/auth`          | 1          | 28           | Better Auth config, scoping helpers, allowed & denied tests for all 22 perms                                           |
| `@managevent/payments`      | 1          | 10           | **Coverage:** 99.49% Stmts · 93.40% Branches · 100% Funcs · 99.49% Lines (`gst.ts`, `invoice.ts`, `plans.ts` all 100%) |
| `@managevent/pricing`       | 1          | 3            | **Coverage:** 100% Stmts · 97.14% Branches · 100% Funcs · 100% Lines                                                   |
| `@managevent/logistics`     | 1          | 3            | **Coverage:** 100% Stmts · 100% Branches · 100% Funcs · 100% Lines                                                     |
| `@managevent/api`           | 1          | 5            | `/health`, `/openapi.json`, `POST /v1/leads` (DB + job + idempotency + 429), RBAC                                      |
| `@managevent/worker`        | 1          | 2            | `lead.created` email job & `headcount.changed` → `RecommendationSet` DB test                                           |
| `@managevent/notifications` | 1          | 3            | EN/FA templates, quiet hours (8am–8pm), suppression, Resend & Twilio wrappers                                          |
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
- **BIZ-05:** ACMA registration of the alphanumeric SMS sender ID `Managevent` and Meta approval for EN/FA WhatsApp Business templates.
- **BIZ-08 (`TODO(fa-review)`):** Native Persian cultural reviewer sign-off on all `fa` strings in `@managevent/i18n` and `/content/ceremonies/*.json`.
- **Production secrets (for staging/production deployment only; mocked locally):** `PII_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, `GUEST_TOKEN_PEPPER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`, `R2_SECRET_ACCESS_KEY`, `GEMINI_API_KEY`.

### 6. Known gaps or risks before Phase 1 (`apps/marketing`)

- **Content expansion (MKT-04 / MKT-05):** `/content` currently contains 3 ceremonies (`wedding`, `sofreh-aghd`, `celebration-of-life`), 3 packages, and 9 Perth placeholder venues. Phase 1 (`MKT-04`, `MKT-05`) will expand `/content` to 8 fully written ceremonies and 6 packages to pass the 300-word local SEO thin-content guard (`MKT-10`).
- **Font subsetting (MKT-01):** Self-hosted WOFF2 subsets for `Cormorant Garamond`, `Plus Jakarta Sans`, and `Vazirmatn` need to be bundled in `apps/marketing` and `apps/invitation` to meet the `< 2.5s` 4G LCP budget.
