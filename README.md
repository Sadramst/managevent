# Managevent

**Every ceremony, from 0 to 100.** Managevent plans, styles, supplies and runs ceremonies of every kind in Perth, Western Australia, then nationally. The planning is powered by our own digital invitation and event tools.

_A product by **Appilico**._

| Surface                                             | Domain                         | App folder         | Status                                          |
| --------------------------------------------------- | ------------------------------ | ------------------ | ----------------------------------------------- |
| Marketing site, Ceremony Builder, AI Event Planner  | `www.managevent.com.au`        | `apps/marketing`   | Spec ready, see [WEBSITE.md](WEBSITE.md)        |
| Digital invitations, Host Studio, guest micro-sites | `invitation.managevent.com.au` | `apps/invitation`  | Spec ready, see [WEBSITE.md](WEBSITE.md) Part B |
| Customer portal                                     | `app.managevent.com.au`        | `apps/portal`      | Planned                                         |
| Vendor portal                                       | `vendors.managevent.com.au`    | `apps/vendors`     | Planned                                         |
| Admin and planner command centre                    | `admin.managevent.com.au`      | `apps/admin`       | Planned                                         |
| Backend API and webhooks                            | `api.managevent.com.au`        | `apps/api`         | Planned                                         |
| Background jobs                                     | (internal)                     | `apps/worker`      | Planned                                         |
| iOS and Android (customers and on-the-day crew)     | App Store / Google Play        | `apps/mobile`      | Planned                                         |
| Windows back-office and venue kiosk                 | Microsoft Store / MSI          | `apps/desktop-win` | Planned                                         |

## Repository status

This repository currently contains **structure, specifications and contracts only**. No application code exists yet. Each app is built independently by a coding agent (Claude Code, Gemini, Cursor or a GitHub Issue agent), following:

1. [`AGENTS.md`](AGENTS.md): the rules every agent obeys in every folder.
2. The `AGENTS.md` inside the app or package being built.
3. A GitHub Issue created from `.github/ISSUE_TEMPLATE/agent-task.yml`.

## Start here

| If you want to…                        | Read                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Understand the business                | [docs/business/BUSINESS_PLAN.md](docs/business/BUSINESS_PLAN.md)                 |
| See the phased plan and backlog        | [ROADMAP.md](ROADMAP.md)                                                         |
| Understand the system design           | [ARCHITECTURE.md](ARCHITECTURE.md)                                               |
| Build the websites                     | [WEBSITE.md](WEBSITE.md)                                                         |
| See the data model                     | [packages/db/DATA_MODEL.md](packages/db/DATA_MODEL.md)                           |
| Check legal and compliance obligations | [docs/compliance/COMPLIANCE_REGISTER.md](docs/compliance/COMPLIANCE_REGISTER.md) |
| Check open decisions                   | [docs/architecture/OPEN_DECISIONS.md](docs/architecture/OPEN_DECISIONS.md)       |
| Hand work to an agent                  | [docs/agents/AGENT_WORKFLOW.md](docs/agents/AGENT_WORKFLOW.md)                   |

## Repository layout

```
managevent/
├── apps/
│   ├── marketing/       www.managevent.com.au: Next.js
│   ├── invitation/      invitation.managevent.com.au: Next.js (merges appilico-invitations + anniversary-invitation)
│   ├── portal/          app.managevent.com.au: Next.js
│   ├── vendors/         vendors.managevent.com.au: Next.js
│   ├── admin/           admin.managevent.com.au: Next.js
│   ├── api/             api.managevent.com.au: Hono (Node) REST + webhooks
│   ├── worker/          background jobs (pg-boss queue): reminders, payouts, AI, media
│   ├── mobile/          Expo React Native: iOS + Android
│   └── desktop-win/     Tauri v2: Windows back-office + offline venue kiosk
├── packages/
│   ├── config/          shared tsconfig, ESLint, Tailwind preset, Vitest config
│   ├── db/              Prisma schema, migrations, seed (single source of truth for data)
│   ├── types/           shared TypeScript domain types (derived from validators where possible)
│   ├── validators/      Zod schemas: the contract between every app and the API
│   ├── ui/              design tokens + web components (shadcn/ui based)
│   ├── ui-native/       React Native components on the same tokens
│   ├── i18n/            EN / FA dictionaries, RTL helpers, Jalali calendar, number formatting
│   ├── ai/              Gemini client, prompts, output schemas, safety rules
│   ├── auth/            Better Auth config, RBAC roles and permission checks
│   ├── payments/        Stripe + Stripe Connect, GST maths, tax invoices
│   ├── pricing/         Ceremony Builder estimator engine, package rules
│   ├── logistics/       RSVP → headcount → catering/cake/seating/hire recommendation engine
│   ├── notifications/   Resend email, Twilio SMS/WhatsApp, push, templates
│   ├── storage/         Cloudflare R2 uploads, image/video variants, signed URLs
│   ├── integrations/    ABN Lookup, Xero, Google/Apple Maps, calendar (.ics)
│   └── api-client/      typed client for apps/api (used by web, mobile, desktop)
├── content/             structured placeholder content (Perth venues, ceremonies, packages, testimonials)
├── docs/                business, compliance, architecture (ADRs), design, agent workflow
├── infra/               domains, DNS, environments, deployment notes
├── .github/             CI, issue templates for agents, PR template
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
pnpm build        # builds all scaffolded workspaces
pnpm lint && pnpm typecheck && pnpm test
```

## Licence

Proprietary. © Appilico. All rights reserved. See [LICENSE.md](LICENSE.md).
