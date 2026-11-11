# Managevent roadmap

**Build order (locked):** Shared packages & DB schema → 1. Marketing (`www`) → 2. Invitation (`invitation`) → 3. Customer portal (`app`) → 4. Vendor portal (`vendors`) and Admin (`admin`) → 5. Mobile (iOS and Android) → 6. Windows.

There are two tracks that run in parallel:

- **Product track:** the phases below.
- **Business track:** entity, insurance, suppliers, launch marketing (§B). See [docs/business/PERTH_STRATEGY.md](docs/business/PERTH_STRATEGY.md) for the Perth Go-To-Market strategy.

Durations are estimates assuming one founder plus AI agents with human review. Every backlog item below is written to become **one GitHub issue**. Create it with `.github/ISSUE_TEMPLATE/agent-task.yml` and copy the ID into the issue title, for example `[FND-03] packages/validators: core schemas`.

Status key: ⬜ not started · 🟨 in progress / partial · ✅ done

---

## A. Product track

### Phase 0: Foundations (≈ 2–3 weeks) ✅

**Exit criteria:**

- `pnpm build` is green with all shared packages scaffolded.
- The database schema is ready for the Sydney database (`ap-southeast-2`).
- `apps/api` has health, auth and leads endpoints ready for staging/production.
- CI and preview deploy configs work.

| ID     | Task                                                                                                                                                                                                                      | Paths                 | Depends on             | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------- | ------ |
| FND-01 | Scaffold `packages/config` (tsconfig presets, ESLint flat config, Prettier, Tailwind v4 preset with brand tokens, Vitest preset)                                                                                          | `packages/config`     | —                      | ✅     |
| FND-02 | `packages/db`: Prisma schema from `DATA_MODEL.md` (core: identity, events, guests, RSVP, leads, catalogue, orders, payments, audit), migrations, seed (Perth placeholder content)                                         | `packages/db`         | FND-01                 | ✅     |
| FND-03 | `packages/validators`: Zod schemas for every API input and output in the MVP, plus content schemas (mirrors `content/schemas`)                                                                                            | `packages/validators` | FND-02                 | ✅     |
| FND-04 | `packages/types`: domain types inferred from validators, plus ID prefix helpers                                                                                                                                           | `packages/types`      | FND-03                 | ✅     |
| FND-05 | `packages/i18n`: EN and FA dictionaries (`common`, `marketing`, `invitation`, `ceremonies`, `legal`), parity test, RTL helpers, deterministic date formatter (Gregorian and Jalali), digit helpers, `getExperienceMode()` | `packages/i18n`       | FND-01                 | ✅     |
| FND-06 | `packages/ui`: design tokens (celebration and memorial), 7 invitation themes, shadcn/ui base components, logical-property utilities, Memorial Mode provider                                                               | `packages/ui`         | FND-01, FND-05         | ✅     |
| FND-07 | `packages/auth`: Better Auth config, roles, permission matrix, resource scoping helpers, tests                                                                                                                            | `packages/auth`       | FND-02                 | ✅     |
| FND-08 | `packages/payments`: GST maths, money helpers, plan and entitlement config, tax invoice model, Stripe client wrappers (test mode)                                                                                         | `packages/payments`   | FND-03                 | ✅     |
| FND-09 | `packages/pricing`: Builder estimator engine with fixtures                                                                                                                                                                | `packages/pricing`    | FND-08                 | ✅     |
| FND-10 | `packages/logistics`: headcount → recommendations engine, as pure functions with fixtures                                                                                                                                 | `packages/logistics`  | FND-03                 | ✅     |
| FND-11 | `apps/api` skeleton: Hono, `/health`, Better Auth mount, `/v1/leads`, OpenAPI generation, error model, rate limiting, request logging with redaction                                                                      | `apps/api`            | FND-02, FND-03, FND-07 | ✅     |
| FND-12 | `apps/worker` skeleton: pg-boss, job registry, `lead.created` → email (Resend test)                                                                                                                                       | `apps/worker`         | FND-11                 | ✅     |
| FND-13 | `packages/notifications` (Resend and Twilio wrappers plus bilingual templates) and `packages/storage` (R2 signed URLs)                                                                                                    | `packages/*`          | FND-03                 | ✅     |
| FND-14 | `packages/api-client`: typed client generated from OpenAPI                                                                                                                                                                | `packages/api-client` | FND-11                 | ✅     |
| FND-15 | CI: lint, typecheck, test, build, i18n parity, migration check. Vercel preview per PR. Staging environment.                                                                                                               | `.github`, `infra`    | FND-01                 | ✅     |
| FND-16 | `packages/ai`: Gemini client, prompt registry, Zod output schemas, quotas, memorial tone guard, eval fixtures                                                                                                             | `packages/ai`         | FND-03                 | ✅     |

### Phase 1: Marketing site `www` (≈ 4–5 weeks) ✅ (Core Launch & Admin Ready)

**Exit criteria:** the core Perth launch site, Instant Cost Estimator, Venues showcase, Enquiry capture, and Admin Command Centre are built and verified; multi-page programmatic SEO (`MKT-04`, `MKT-05`, `MKT-10`) expands as real photography and rates are finalised.

| ID     | Task                                                                                                                                                | Depends on     | Status |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| MKT-01 | Scaffold `apps/marketing` (Next.js, English-first with i18n routing `/fa`, metadata, fonts, layout, header, footer, language switch, mode provider) | FND-05, FND-06 | ✅     |
| MKT-02 | Content loader for `content/` with validation against `content/schemas` at build (`loadLaunchCeremonies`, `loadPerthCity`, `loadPerthVenues`)       | FND-03         | ✅     |
| MKT-03 | Home page with Perth editorial hero, 0-to-100 services matrix, all-events showcase, and digital RSVP-to-catering bridge explainer                   | MKT-01, MKT-02 | ✅     |
| MKT-04 | Ceremonies hub and detail template, plus 8 fully written ceremonies (EN and FA; 5 verticals live on home, standalone detail pages expanding)        | MKT-02         | 🟨     |
| MKT-05 | Packages catalogue and detail (interactive tier selector live in Instant Cost Estimator; standalone `/packages` catalogue pending final rate card)  | MKT-02         | 🟨     |
| MKT-06 | **Instant Cost Estimator (`#estimator`)** (interactive event type, guest slider, tier & bar mode, AUD incl. GST & logistics calculation → enquiry)  | FND-09, FND-11 | ✅     |
| MKT-07 | Venues showcase with curated Perth locations (`content/venues/perth.json` validated and rendered on home; standalone map detail pages next)         | MKT-02         | ✅     |
| MKT-08 | `/invitations` product showcase & Digital RSVP Bridge explainer (plus full `apps/invitation` app built in Phase 2)                                  | MKT-01         | ✅     |
| MKT-09 | Memorial Mode applied automatically to solemn selections (`celebration-of-life` in Estimator, Ceremony cards, and Admin CRM)                        | MKT-04         | ✅     |
| MKT-10 | Programmatic local SEO: `/perth`, `/perth/[ceremony]`, aliases, the thin-content guard in CI, gated cities                                          | MKT-04, MKT-07 | ⬜     |
| MKT-11 | Contact and Book forms → `/v1/leads`, auto-reply, planner notification, plus one-click pre-fill from Instant Cost Estimator                         | FND-11, FND-12 | ✅     |
| MKT-12 | How it works, Pricing estimator, legal pages (`/privacy`, `/terms`), Accessibility statement (`/accessibility`)                                     | MKT-02         | ✅     |
| MKT-13 | Technical SEO: sitemaps, robots, hreflang, generated OG images (EN and FA)                                                                          | MKT-04         | ✅     |
| MKT-14 | Analytics with the consent banner and conversion events                                                                                             | MKT-01         | ⬜     |
| MKT-15 | Playwright suite (home, Estimator, Admin Console, enquiry → lead, RTL checks, axe accessibility scans), Lighthouse CI budgets                       | MKT-06         | ✅     |
| MKT-16 | **Admin Lite & Planner Command Centre:** `/admin` lead inbox, detail inspector, status transitions, active event run-sheets, and `apps/admin`       | FND-11         | ✅     |

> MKT-16 is delivered both as the `@managevent/admin` domain engine (`apps/admin`) and the interactive Planner & Admin Command Centre at `/admin` in `apps/marketing`.

### Phase 2: Invitation app `invitation` (≈ 5–6 weeks) ✅

**Exit criteria:** the WEBSITE.md §B18 checklist is complete, and the Appilico anniversary event migration path is implemented.

| ID     | Task                                                                                                                               | Depends on     | Status |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| INV-01 | Scaffold `apps/invitation`, port themes and components from `appilico-invitations` and `anniversary-invitation` per `MIGRATION.md` | FND-06         | ✅     |
| INV-02 | Data and API: events, sub-events, parties, guests, tokens (HMAC with `stableId`), invitation design and content endpoints          | FND-11         | ✅     |
| INV-03 | Studio create flow (basics → template → wording → personalise → guests → RSVP settings → preview → publish)                        | INV-02         | ✅     |
| INV-04 | AI wording assistant (EN and FA, tones including memorial) via `packages/ai`                                                       | FND-16         | ✅     |
| INV-05 | Guest micro-site: server-rendered core, gate reveal, Story, Timeline and Gallery views, music, calendar, maps                      | INV-02         | ✅     |
| INV-06 | RSVP flow (party members, dietary per person, idempotent, editable until deadline) and `headcount.changed`                         | INV-05, FND-10 | ✅     |
| INV-07 | Host responses dashboard, CSV and XLSX export (UTF-8 BOM)                                                                          | INV-06         | ✅     |
| INV-08 | Share Studio: links, QR codes, `wa.me`, email invitations; bulk SMS and WhatsApp (Premium)                                         | FND-13         | ✅     |
| INV-09 | Plans and entitlements, Premium Event Pass checkout (Stripe), entitlement guards                                                   | FND-08         | ✅     |
| INV-10 | QR passes (signed tokens)                                                                                                          | INV-06         | ✅     |
| INV-11 | Photo wall (upload, moderation, realtime, `/display`)                                                                              | FND-13         | ✅     |
| INV-12 | Wishing well (D-05 option a) and tribute book with moderation                                                                      | INV-05         | ✅     |
| INV-13 | Memorial Mode end to end, plus the memorial demo event                                                                             | INV-05         | ✅     |
| INV-14 | Legacy slug import (`LegacySlug`), the `appilico.com.au` rewrite note, migration of the anniversary event                          | INV-02         | ✅     |
| INV-15 | Hardening: in-app browser Playwright projects, no-JavaScript render test, rate limits, privacy headers                             | INV-05         | ✅     |

### Phase 3: Customer portal `app` (≈ 5 weeks) ⬜

| ID     | Task                                                                                                           | Status |
| ------ | -------------------------------------------------------------------------------------------------------------- | ------ |
| PRT-01 | Scaffold `apps/portal`, SSO, onboarding from a Builder estimate (`?estimate=`)                                 | ⬜     |
| PRT-02 | Event dashboard: timeline, checklist, key dates, planner contact                                               | ⬜     |
| PRT-03 | Live RSVP and headcount panel (realtime), dietary breakdown                                                    | ⬜     |
| PRT-04 | **Recommendations: one-click apply** (catering, cake, seating, hire) with re-pricing                           | ⬜     |
| PRT-05 | Order customisation (add-ons, tiers), change requests to the planner                                           | ⬜     |
| PRT-06 | Payment schedule: deposits and milestones (Stripe: cards, Apple Pay, Google Pay, Afterpay), tax invoices (PDF) | ⬜     |
| PRT-07 | Interactive seating chart (drag and drop, tables from `logistics`, guest assignment, print)                    | ⬜     |
| PRT-08 | Budget tracker                                                                                                 | ⬜     |
| PRT-09 | Planner chat (realtime, attachments)                                                                           | ⬜     |
| PRT-10 | Co-hosts and family collaborators (roles)                                                                      | ⬜     |
| PRT-11 | Documents (contracts, run-sheet PDF), e-signature acceptance of terms                                          | ⬜     |

### Phase 4: Vendor portal `vendors` and Admin `admin` (≈ 6–8 weeks) 🟨 (Admin Core Built)

| ID     | Task                                                                                                                                      | Status |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| VEN-01 | Scaffold `apps/vendors`, vendor signup, organisation, **ABN Lookup validation**                                                           | ⬜     |
| VEN-02 | Compliance uploads (public liability certificate of currency, food safety, RSA, liquor licence, WWCC where relevant) with expiry tracking | ⬜     |
| VEN-03 | Stripe Connect Express onboarding (AU) and payout dashboard                                                                               | ⬜     |
| VEN-04 | Service catalogue (services, tiers, prices incl. GST, photos), availability calendar                                                      | ⬜     |
| VEN-05 | Quotes and bookings inbox (accept, decline, counter), run-sheets per booking                                                              | ⬜     |
| VEN-06 | Reviews (verified, post-event only)                                                                                                       | ⬜     |
| ADM-01 | Expand Admin Lite into the full CRM pipeline (leads → proposals → booked, built in `apps/admin` & `/admin`)                               | ✅     |
| ADM-02 | Proposal builder (from estimates and packages), send, accept, deposit link                                                                | ⬜     |
| ADM-03 | Event command centre: run-sheets, RSVP bridge recommendations, APP 3 masked dietary reveal (`apps/marketing/app/[locale]/admin`)          | ✅     |
| ADM-04 | Vendor verification queue (ABN & $20M PLI compliance matrix built in `/admin`; full approval queue workflow next)                         | 🟨     |
| ADM-05 | Inventory (hire stock, barcodes, reservations, dispatch and return, damage)                                                               | ⬜     |
| ADM-06 | Finance: margin per event, ATO GST report (`splitIncGstCents`), 12% commission view in `/admin` (Xero sync & payout release next)         | 🟨     |
| ADM-07 | Content admin (until a CMS exists): packages, venues, prices                                                                              | ⬜     |
| ADM-08 | Audit log viewer (live in `/admin`), user and role management, MFA enforcement                                                            | 🟨     |

### Phase 5: Mobile, iOS and Android (≈ 6 weeks) ⬜

| ID     | Task                                                                                                                     | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| MOB-01 | Scaffold Expo (Router, NativeWind, i18n RTL, secure token storage), role-based navigation                                | ⬜     |
| MOB-02 | Customer mode: event home, RSVP live counts with push, guest list, planner chat, quick photo sharing to the wall         | ⬜     |
| MOB-03 | Crew mode: roster, **offline event pack**, camera QR scanner, duplicate detection, guest and table lookup, dietary flags | ⬜     |
| MOB-04 | Crew setup and delivery checklists with photo evidence                                                                   | ⬜     |
| MOB-05 | Offline sync engine, conflict rules, background sync                                                                     | ⬜     |
| MOB-06 | Push notifications (Expo), deep links into `invitation.` and `app.`                                                      | ⬜     |
| MOB-07 | EAS build, store listings (EN and FA), privacy nutrition labels, TestFlight and internal testing                         | ⬜     |

### Phase 6: Windows, Tauri (≈ 6 weeks) ⬜

| ID     | Task                                                                                                                    | Status |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| WIN-01 | Scaffold Tauri v2 (React UI on shared packages), auth, auto-updater, MSI or MSIX signing                                | ⬜     |
| WIN-02 | Inventory and warehouse: barcode HID scanning, stock moves, dispatch and returns                                        | ⬜     |
| WIN-03 | 2D floorplan and seating editor (venue templates, tables, dance floor, sofreh placement), sync with `app.`              | ⬜     |
| WIN-04 | Batch printing: QR place cards, table numbers, welcome boards (print templates, printer selection)                      | ⬜     |
| WIN-05 | Offline check-in kiosk (event pack, scanner or camera, kiosk lockdown mode)                                             | ⬜     |
| WIN-06 | Live Display Controller: second screen or projector, slideshow, tribute reel, moderated photo wall, offline media cache | ⬜     |

### Phase 7: Marketplace growth and expansion (ongoing) ⬜

- Self-serve marketplace booking (customers book vendors directly, with commission)
- Sydney and Melbourne launch (turn on `city.json` status, local venues and vendors, local SEO pages)
- B2B subscriptions for corporate hosts, and premium vendor placement
- Apple and Google Wallet passes, live-stream coordination, multi-kiosk LAN sync
- Additional languages: Arabic (RTL), Chinese, Hindi (built on `@managevent/i18n` parity architecture)

---

## B. Business track (parallel)

| ID     | Task                                                                                                                                              | When                    | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| BIZ-01 | Confirm the entity structure (Appilico as operator; is Managevent a business name or a separate company?), ABN and ACN, GST registration          | Before any paid booking | ⬜     |
| BIZ-02 | $20M public liability plus professional indemnity insurance. Check whether event cancellation cover is offered to customers.                      | Before launch           | ⬜     |
| BIZ-03 | Draft terms, refund and cancellation policy, privacy policy, vendor terms. Get legal review (ACL, unfair contract terms).                         | Phase 1                 | 🟨     |
| BIZ-04 | Stripe AU account, Connect platform profile, Afterpay enablement, confirm D-07 and D-08                                                           | Phase 0–1               | ⬜     |
| BIZ-05 | Twilio AU: register the alphanumeric sender id, approve WhatsApp Business templates                                                               | Phase 2                 | ⬜     |
| BIZ-06 | Perth supplier network: 3 caterers (including Halal), 2 cake makers, 2 florists, 2 DJs or MCs, 2 photographers, a hire partner, a marquee partner | Phase 1–2               | ⬜     |
| BIZ-07 | Venue relationships: Swan Valley, Fremantle, council halls (Joondalup, Canning, Melville), riverside function centre                              | Phase 1–2               | ⬜     |
| BIZ-08 | Content: real photography, a Persian cultural content reviewer, a licensed music library                                                          | Phase 1–2               | ⬜     |
| BIZ-09 | Google Business Profile (Perth), Instagram and community channels, launch offer (see `docs/business/PERTH_STRATEGY.md`)                           | Phase 1                 | 🟨     |
| BIZ-10 | Crew hiring and training: RSA, food handling, WWCC for kids' events, uniforms, run-sheet training                                                 | Phase 3–5               | ⬜     |
| BIZ-11 | Accounting: Xero setup, chart of accounts for events (deposits as liabilities until delivery), BAS cadence                                        | Phase 1                 | ⬜     |

---

## C. Milestones

| Milestone                                | Definition                                                                               | Status |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| **M0: Foundations live**                 | Phase 0 exit criteria are met (`packages/*`, `apps/api`, `apps/worker` built & tested)   | ✅     |
| **M1: Public launch (Perth)**            | `www` is live, leads flow into `/admin`, and the business track BIZ-01 to BIZ-03 is done | 🟨     |
| **M2: Invitations live**                 | `invitation.` is built (`INV-01`…`INV-15`); awaiting cloud deployment & first live pass  | 🟨     |
| **M3: First fully digital agency event** | A booked event uses the RSVP bridge, the portal, payments and the seating chart          | ⬜     |
| **M4: Marketplace beta**                 | 10 verified vendors take bookings through the platform                                   | ⬜     |
| **M5: On-site tech**                     | The crew app and Windows kiosk are used at a live event                                  | ⬜     |
| **M6: Second city**                      | Sydney or Melbourne is `live`                                                            | ⬜     |
