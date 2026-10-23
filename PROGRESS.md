# Managevent Progress Tracker

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
| FND-14 | `packages/api-client`: typed client generated from `apps/api` OpenAPI spec, generate script, up-to-date verification test                                         | 🟨     |
| FND-15 | CI: extend `.github/workflows/ci.yml` (Postgres service, migrate & drift check, i18n parity, content validation, tests) and write `infra/LOCAL_DEV.md`            | ⬜     |
| FND-16 | `packages/ai`: `@google/genai` client, versioned prompt registry, Zod output schemas, quotas, PII scrubber, memorial tone guard, eval fixtures                    | ⬜     |

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
