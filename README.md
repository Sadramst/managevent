# Managevent

**Every ceremony, from 0 to 100.** Managevent plans, styles, supplies and runs events of every kind in Perth, Western Australia: weddings and engagements, milestone birthdays, corporate galas, cultural ceremonies, and funerals, memorials and wakes (shown in a calm **Memorial Mode**). Its own digital invitations, RSVP with dietary and allergy needs, and door check-in feed the headcount into catering and hire planning.

_A product by **Appilico**._ English only (en-AU).

## Surfaces

| Surface                                                 | Domain                         | Folder             | Status                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing site, enquiry form, staff console at `/admin` | `www.managevent.com.au`        | `apps/marketing`   | Built. Multi-page site, ten ceremony pages, enquiry form to the API, staff console (password + TOTP) with enquiry inbox and site contact settings |
| Invitations: host studio, guest site, door check-in     | `invitation.managevent.com.au` | `apps/invitation`  | Built. Sign-up, template-first studio, guests and CSV, email invitations, RSVP, wishes, signed QR passes, calendar, check-in                      |
| API (Hono, Better Auth, OpenAPI)                        | `api.managevent.com.au`        | `apps/api`         | Built. 53 operations, Stripe Checkout and Resend used only when configured                                                                        |
| Background jobs (pg-boss)                               | internal                       | `apps/worker`      | Built. `lead.created`, `headcount.changed`, email campaigns and their sweep                                                                       |
| Staff role helpers                                      | (served by `/admin` on www)    | `apps/admin`       | Small package; the console UI lives in `apps/marketing`                                                                                           |
| Customer portal                                         | `app.managevent.com.au`        | `apps/portal`      | Planned (placeholder only)                                                                                                                        |
| Vendor portal and marketplace                           | `vendors.managevent.com.au`    | `apps/vendors`     | Planned (placeholder only)                                                                                                                        |
| iOS and Android                                         | App Store / Google Play        | `apps/mobile`      | Planned (placeholder only)                                                                                                                        |
| Windows back office and kiosk                           | MSI / MSIX                     | `apps/desktop-win` | Planned (placeholder only)                                                                                                                        |

"Built" means it runs end to end against PostgreSQL locally and in CI. Production is one VPS in Sydney ([ADR-0011](docs/architecture/adr/0011-production-on-single-sydney-vps.md)); this release has not been deployed yet, and live Stripe and Resend have never been exercised. Everything still to do is in **[ROADMAP.md](ROADMAP.md)**, the one backlog.

## Quick start

Needs Node.js 22.12 or later (`engines`; CI uses Node 22 from `.nvmrc`) and pnpm 10 (`corepack enable`). No Docker needed.

```bash
pnpm install
cp .env.example .env                       # then fill in the local secrets (infra/LOCAL_DEV.md §2)
pnpm db:local:detach                       # PostgreSQL 16 on localhost:5432, no Docker
pnpm db:migrate
pnpm db:seed                               # Perth placeholder content
pnpm with-env pnpm --filter @managevent/api seed:demo   # the six sample invitations
```

Nothing reads `.env` by itself: the root scripts and `pnpm with-env <command>` load it (`scripts/with-env.mjs`).

Run the apps, each in its own terminal:

```bash
pnpm with-env pnpm --filter @managevent/api dev          # API        http://localhost:4000
pnpm with-env pnpm --filter @managevent/worker dev       # worker     (no port)
pnpm with-env pnpm --filter @managevent/marketing dev    # www+/admin http://localhost:3100
pnpm with-env pnpm --filter @managevent/invitation dev   # invitation http://localhost:3001
```

`pnpm dev` starts all of them through Turbo. To use `/admin`, create a staff account with `staff:create` (see [apps/api/README.md](apps/api/README.md)). Stop the PostgreSQL server with `pnpm db:local:stop`.

## Quality gate

Run from the repo root with PostgreSQL running (the API, worker and database tests need it):

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm format:check
pnpm validate:content
pnpm db:drift-check
pnpm test:e2e                              # Playwright; see each web app's README for its set-up
```

CI (`.github/workflows/ci.yml`) runs these (Playwright for the marketing site only; the invitation suite is INV-18) plus the OpenAPI client freshness check, Docker image builds, Compose and Caddyfile checks and a secret scan.

## Start here

| If you want to…                           | Read                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| See what is left to build                 | [ROADMAP.md](ROADMAP.md)                                                                                                             |
| Follow the rules for any change           | [AGENTS.md](AGENTS.md)                                                                                                               |
| Set up a local machine                    | [infra/LOCAL_DEV.md](infra/LOCAL_DEV.md)                                                                                             |
| Deploy or operate production              | [DEPLOYMENT.md](DEPLOYMENT.md)                                                                                                       |
| Understand the system design              | [ARCHITECTURE.md](ARCHITECTURE.md)                                                                                                   |
| Build or extend the websites              | [WEBSITE.md](WEBSITE.md)                                                                                                             |
| See the data model                        | [packages/db/DATA_MODEL.md](packages/db/DATA_MODEL.md)                                                                               |
| Check open decisions                      | [docs/architecture/OPEN_DECISIONS.md](docs/architecture/OPEN_DECISIONS.md)                                                           |
| Check legal and compliance obligations    | [docs/compliance/COMPLIANCE_REGISTER.md](docs/compliance/COMPLIANCE_REGISTER.md)                                                     |
| Read the business plan and Perth strategy | [docs/business/BUSINESS_PLAN.md](docs/business/BUSINESS_PLAN.md), [docs/business/PERTH_STRATEGY.md](docs/business/PERTH_STRATEGY.md) |
| Report a security problem                 | [SECURITY.md](SECURITY.md)                                                                                                           |

## Repository layout

```text
managevent/
├── apps/
│   ├── api/            Hono API on Node: Better Auth, 53 operations, Stripe webhook, CLIs (seed:demo, staff:create)
│   ├── worker/         pg-boss jobs: lead.created, headcount.changed, invitation email campaigns
│   ├── marketing/      Next.js: www pages and the staff console at /admin
│   ├── invitation/     Next.js: host studio, guest site, door check-in
│   ├── admin/          staff role helpers used by the console
│   ├── portal/         placeholder (customer portal, planned)
│   ├── vendors/        placeholder (vendor portal, planned)
│   ├── mobile/         placeholder (Expo app, planned)
│   └── desktop-win/    placeholder (Tauri app, planned)
├── packages/
│   ├── config/         tsconfig, ESLint, Tailwind and Vitest presets, log redaction
│   ├── db/             Prisma schema and migrations, UUIDv7 ids, field encryption, seed
│   ├── validators/     Zod schemas: the contract between apps and the API
│   ├── types/          domain types and branded ids
│   ├── i18n/           en-AU copy for every surface, dates, getExperienceMode()
│   ├── ui/             brand shell shared by both web apps, tokens, invitation themes
│   ├── auth/           Better Auth configuration, roles and permission matrix
│   ├── payments/       AUD cents, GST maths, invitation plans, Stripe Checkout and webhook verification
│   ├── pricing/        estimator engine
│   ├── logistics/      headcount → catering, cake, seating and hire recommendations
│   ├── notifications/  Resend and Twilio wrappers, consent and quiet hours (not used by an app yet; the API and worker call Resend directly)
│   ├── storage/        R2 signed URLs (not used by an app yet)
│   ├── ai/             Gemini client and guards (not wired to an app yet)
│   ├── api-client/     typed client generated from the API's OpenAPI spec
│   ├── integrations/   placeholder (ABN Lookup, Xero, maps)
│   └── ui-native/      placeholder (React Native components)
├── content/            ceremonies, packages, locations and venues, testimonials, JSON schemas
├── docs/               business, compliance, architecture (ADRs), design, agent workflow
├── infra/              local dev, environments, DNS, incident runbook; vps/ is the production stack
├── scripts/            local PostgreSQL, .env loader, content validation, deployment secrets
├── .github/            CI, deploy workflow, issue and PR templates
└── .cursor/rules/      Cursor rules mirroring AGENTS.md
```

## Licence

Proprietary. © Appilico. All rights reserved. See [LICENSE.md](LICENSE.md).
