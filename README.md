# Managevent

**Every ceremony, from 0 to 100.** Managevent plans, styles, supplies and runs ceremonies and events of every kind in Perth, Western Australia (Swan Valley, Perth CBD, Fremantle, Cottesloe, South Perth & metropolitan WA), then nationally: Weddings, Milestone Birthdays, Corporate Galas & Brand Launches, Cultural & Community Ceremonies, and Funerals, Memorials & Wakes (served in respectful **Memorial Mode**).

Our full-service planning and vendor marketplace are powered by our own digital invitation, RSVP, dietary & allergy bridge, and check-in tools.

_A product by **Appilico**._

| Surface                                                           | Domain                         | App folder         | Status                                                                                  |
| ----------------------------------------------------------------- | ------------------------------ | ------------------ | --------------------------------------------------------------------------------------- |
| Marketing site, Instant Cost Estimator, Venues & `/admin` Console | `www.managevent.com.au`        | `apps/marketing`   | ✅ Built & verified locally (English (en-AU), multi-language ready)                     |
| Digital invitations, Host Studio, guest micro-sites & QR passes   | `invitation.managevent.com.au` | `apps/invitation`  | ✅ Built & verified locally (`INV-01` … `INV-15`)                                       |
| Admin and planner command centre (CRM, Run-sheets, GST, Audit)    | `admin.managevent.com.au`      | `apps/admin`       | ✅ Domain engine (`@managevent/admin`) + integrated UI at `/admin` in `apps/marketing`  |
| Backend API and webhooks (Hono on Node 22 + OpenAPI 3.1)          | `api.managevent.com.au`        | `apps/api`         | ✅ Built & verified locally (`Dockerfile`; runs on the Sydney VPS, see `DEPLOYMENT.md`) |
| Background jobs (`pg-boss`: email notifications & RSVP bridge)    | (internal)                     | `apps/worker`      | ✅ Built & verified locally (`Dockerfile`; runs on the Sydney VPS, see `DEPLOYMENT.md`) |
| Customer portal                                                   | `app.managevent.com.au`        | `apps/portal`      | ⬜ Planned (Phase 3: `PRT-01` … `PRT-11`)                                               |
| Vendor portal                                                     | `vendors.managevent.com.au`    | `apps/vendors`     | ⬜ Planned (Phase 4: `VEN-01` … `VEN-06`)                                               |
| iOS and Android (customers and on-the-day crew)                   | App Store / Google Play        | `apps/mobile`      | ⬜ Planned (Phase 5: `MOB-01` … `MOB-07`)                                               |
| Windows back-office and venue kiosk                               | Microsoft Store / MSI          | `apps/desktop-win` | ⬜ Planned (Phase 6: `WIN-01` … `WIN-06`)                                               |

## Repository status

- **Phase 0 (Foundations `FND-01` … `FND-16`)**: ✅ **Complete**. All 17 shared packages (`config`, `db`, `validators`, `types`, `i18n`, `ui`, `auth`, `payments`, `pricing`, `logistics`, `notifications`, `storage`, `api-client`, `ai`), `apps/api`, and `apps/worker` are implemented and covered by unit & integration tests.
- **Phase 1 (Marketing Platform & Admin Command Centre `apps/marketing` + `apps/admin`)**: ✅ **Core Launch & Admin Complete**. Built with an English-first UI/UX (`en` default at `/`) and architectural support for adding languages later, featuring the all-events showcase, 0-to-100 services matrix, interactive Instant Cost Estimator (`#estimator`), curated Perth venues showcase (each card links to a prefilled enquiry), digital RSVP-to-catering bridge explainer, enquiry & consultation booking form, and the **Planner & Admin Command Centre** (`/admin`).
- **Phase 2 (Digital Invitations `apps/invitation`)**: ✅ **Complete (`INV-01` … `INV-15`)**. Host Studio, AI wording assistant, 6 themes + Memorial Mode, server-rendered Guest Micro-site, encrypted RSVP dietary bridge, QR passes, Photo Wall, Wishing Well / Tribute Book, and Legacy Slug migration are implemented and verified. Host Studio also has an **Awaiting replies** page (`/studio/[eventId]/awaiting`) with copy-ready reminder text (calm wording in Memorial Mode), and the guest micro-site has a no-JavaScript fallback for core details and a hardened `.ics` calendar download.
- **See [`PROGRESS.md`](PROGRESS.md) and [`ROADMAP.md`](ROADMAP.md)** for the full Done (`✅`) vs Undone (`⬜`) breakdown across all product and business tracks.

## Start here

| If you want to…                              | Read                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Read the Perth All-Events Business Strategy  | [docs/business/PERTH_STRATEGY.md](docs/business/PERTH_STRATEGY.md)               |
| Understand the business model & unit metrics | [docs/business/BUSINESS_PLAN.md](docs/business/BUSINESS_PLAN.md)                 |
| See all Done (`✅`) and Undone (`⬜`) tasks  | [PROGRESS.md](PROGRESS.md) and [ROADMAP.md](ROADMAP.md)                          |
| Understand the system design                 | [ARCHITECTURE.md](ARCHITECTURE.md)                                               |
| Build or extend the websites                 | [WEBSITE.md](WEBSITE.md)                                                         |
| See the data model                           | [packages/db/DATA_MODEL.md](packages/db/DATA_MODEL.md)                           |
| Check legal and compliance obligations       | [docs/compliance/COMPLIANCE_REGISTER.md](docs/compliance/COMPLIANCE_REGISTER.md) |
| Check open decisions                         | [docs/architecture/OPEN_DECISIONS.md](docs/architecture/OPEN_DECISIONS.md)       |
| Deploy to Sydney (`syd` / `syd1`)            | [infra/DEPLOY_RUNBOOK.md](infra/DEPLOY_RUNBOOK.md)                               |

## Repository layout

```text
managevent/
├── apps/
│   ├── marketing/       www.managevent.com.au: Next.js (Marketing, Estimator, Venues & /admin Command Centre)
│   ├── invitation/      invitation.managevent.com.au: Next.js (Host Studio + Guest Micro-sites + QR Passes)
│   ├── admin/           admin.managevent.com.au: CRM pipeline, ATO GST & APP 3 health data audit engine
│   ├── api/             api.managevent.com.au: Hono (Node 22) REST + OpenAPI 3.1 + webhooks
│   ├── worker/          background jobs (pg-boss queue): reminders, payouts, AI, RSVP headcount bridge
│   ├── portal/          app.managevent.com.au: Next.js (Planned — Phase 3)
│   ├── vendors/         vendors.managevent.com.au: Next.js (Planned — Phase 4)
│   ├── mobile/          Expo React Native: iOS + Android (Planned — Phase 5)
│   └── desktop-win/     Tauri v2: Windows back-office + offline venue kiosk (Planned — Phase 6)
├── packages/
│   ├── config/          shared tsconfig, ESLint, Tailwind preset, Vitest config, PII log redaction
│   ├── db/              Prisma schema, migrations, AES-256-GCM field encryption, Perth seed
│   ├── types/           shared TypeScript domain types and branded UUIDv7 ID helpers
│   ├── validators/      Zod schemas: the contract between every app and the API
│   ├── ui/              design tokens (Celebration & Memorial Mode) + web components
│   ├── ui-native/       React Native components on the same tokens (Planned — Phase 5)
│   ├── i18n/            English (en-AU) dictionaries, locale and RTL plumbing, Gregorian dates
│   ├── ai/              Gemini client, prompts, output schemas, PII scrubber, memorial tone guard
│   ├── auth/            Better Auth config, RBAC roles and 22-permission matrix
│   ├── payments/        Stripe + Stripe Connect, GST maths (integer AUD cents), tax invoices
│   ├── pricing/         Ceremony Builder estimator engine, package rules
│   ├── logistics/       RSVP → headcount → catering/cake/seating/hire recommendation engine
│   ├── notifications/   Resend email, Twilio SMS/WhatsApp, consent & quiet hours, templates
│   ├── storage/         Cloudflare R2 uploads, image/video variants, signed URLs
│   ├── integrations/    ABN Lookup, Xero, Google/Apple Maps, calendar (.ics)
│   └── api-client/      typed client generated from apps/api OpenAPI 3.1 spec
├── content/             structured Perth content (venues, ceremonies, packages, testimonials, schemas)
├── docs/                business strategy, compliance, architecture (ADRs), design, agent workflow
├── infra/               domains, DNS, environments, Sydney deployment runbook
├── .github/             CI, deploy workflow, issue templates for agents, PR template
└── .cursor/rules/       Cursor rules mirroring AGENTS.md
```

## Toolchain

- Node.js 22 LTS (see `.nvmrc`) and pnpm 10 (`corepack enable`)
- Turborepo for task orchestration
- Rust stable plus the Windows MSVC toolchain, for `apps/desktop-win` only
- Expo EAS for mobile builds

```bash
corepack enable
pnpm install
pnpm build                              # builds all scaffolded workspaces
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @managevent/marketing dev # run marketing + /admin on http://localhost:3100
pnpm --filter @managevent/invitation dev # run invitation app on http://localhost:3001
```

## Licence

Proprietary. © Appilico. All rights reserved. See [LICENSE.md](LICENSE.md).
