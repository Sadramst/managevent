# AGENTS.md: master rules for every coding agent

These rules apply to **every agent and every human** working anywhere in this repository: Claude Code, Gemini CLI, Cursor, GitHub Issue agents, Copilot. A folder's own `AGENTS.md` adds rules for that folder. It never removes rules from this file. If two rules conflict, the stricter one wins. If you are still unsure, stop and ask in the issue.

## 1. What Managevent is (read once)

Managevent runs ceremonies of every kind from 0 to 100: weddings, engagements, birthdays, corporate galas, and funerals and memorials. Perth (WA) comes first, then other Australian cities. It has three business lines that share one platform:

1. **Agency:** our planners deliver the event.
2. **Marketplace:** vetted vendors take bookings through us, and we take commission via Stripe Connect (planned: VEN, MKP).
3. **Tools:** digital invitations, RSVP, guest management and check-in.

**The core hook:** RSVP data from `invitation.` (headcount, adults and children, dietary needs) becomes headcount snapshots that drive catering, cake, seating and hire recommendations (`ARCHITECTURE.md` §6). Never build a feature that breaks this bridge.

**What exists** (runs end to end on local PostgreSQL; not deployed from this branch yet):

| App               | What it is                                                                                                                   | Local port |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api`        | Hono API, Better Auth, 53 operations; Stripe Checkout and Resend used only when configured                                   | 4000       |
| `apps/worker`     | pg-boss jobs: `lead.created`, `headcount.changed`, `invitation.email_campaign` and its sweep                                 | —          |
| `apps/marketing`  | `www.` pages and the staff console at `/admin` (password + TOTP, enquiries, contact settings)                                | 3100       |
| `apps/invitation` | Host sign-up and studio, guest site, RSVP with encrypted health data and consent, wishes, QR passes, calendar, door check-in | 3001       |

PostgreSQL runs on 5432. `apps/portal`, `apps/vendors`, `apps/mobile` and `apps/desktop-win` are placeholders; `apps/admin` is a small helper package. Everything not built is in [`ROADMAP.md`](ROADMAP.md), the only backlog.

## 2. Before you write any code

1. Read this file, then the `AGENTS.md` of the folder you are working in, then the issue and its `ROADMAP.md` row.
2. Read the contract you depend on:
   - **Data:** `packages/db/DATA_MODEL.md` and `packages/db/prisma/schema.prisma`
   - **API shapes:** `packages/validators`, and the API routes in `apps/api/README.md`
   - **Copy:** `packages/i18n`
   - **Design:** `docs/design/DESIGN_SYSTEM.md`
   - **Web routes:** `WEBSITE.md`
3. Check `docs/architecture/OPEN_DECISIONS.md`. If your task touches an open decision, do not decide it silently. Raise it in the issue.
4. Work **only inside the paths your issue names**. Changes to a shared package need the `contract-change` label (see §6).

## 3. Non-negotiable rules

### Stack (see `docs/architecture/adr/`)

- **Package manager:** pnpm workspaces only (pnpm 10). Never npm or yarn, and never commit another lockfile.
- **Node:** CI uses Node 22 (`.nvmrc`); `engines` requires `>=22.12`.
- **Language:** TypeScript 5.9 `strict` everywhere (ADR-0010). No `any` (use `unknown` and narrow it). No `@ts-ignore` without a linked issue.
- **Web:** Next.js App Router (React 19), Tailwind CSS v4 with the preset from `packages/config`, and the shared brand shell and tokens from `packages/ui`. Motion is CSS; there is no Framer Motion or shadcn/ui.
- **API:** Hono on Node, with Prisma 6 and PostgreSQL 16. Jobs run on pg-boss in the same database.
- **Auth:** Better Auth (`packages/auth`), email and password, 30-day sessions. Staff (`PLANNER_STAFF`, `SUPER_ADMIN`) must use TOTP and are created only with the API's `staff:create` CLI. The browser reaches the API only through each web app's same-origin `/api/auth` proxy; every other call is server-side through `packages/api-client`. Web apps never import Prisma.
- **Mobile and desktop (planned):** Expo with Expo Router and NativeWind; Tauri v2 (ADR-0007).
- **Validation:** Zod schemas in `packages/validators`. These are the single contract and are imported by both client and server. Never redefine a shape locally.
- **Hosting:** one Vultr VPS in Sydney with Docker Compose and Caddy (ADR-0011, `DEPLOYMENT.md`). No Vercel, Fly.io or Supabase, and no staging. Do not add a hosting provider without an ADR.
- **Versions:** pin exact versions in each `package.json`. Do not use RC or beta versions unless an ADR allows it (ADR-0012 allows `embedded-postgres` for local development only).

### Data and privacy (Australian Privacy Act, APPs)

- All personal information is stored in **Australia (Sydney)**. Never add a service that stores or processes PII outside Australia without an ADR (ADR-0008 lists the accepted ones). Analytics, logging and error tracking count.
- Guests are not our customers. Collect the **minimum** they need to RSVP, and only what the host's RSVP settings ask for. Dietary, allergy and accessibility data is **health information**, which is sensitive under the APPs: ask for consent, encrypt it at field level (`PII_ENCRYPTION_KEY`), scope it to the event, and delete it on the retention schedule (the retention job is PRV-01).
- Never log PII, tokens, guest links, payment data or request bodies. Use the redaction helpers in `packages/config`.
- Never commit secrets, salts or keys. Locally everything goes in the root `.env` (copied from `.env.example`); production secrets live only in `infra/vps/.env` on the server.
  - _Lesson from `anniversary-invitation`, which committed its slug salt:_ salts are per-event, stored in the database, and never in the repo.

### Money (AUD and GST)

- All money is **integer cents in AUD** (`amountCents: number`). Never use floats for money.
- GST is calculated **only** in `packages/payments` (10%, rounding rules in `docs/compliance/PAYMENTS_AND_GST.md`). Never inline `* 1.1` anywhere.
- Prices shown to consumers are **GST-inclusive**, as the Australian Consumer Law requires. Every tax invoice shows the ABN and the GST amount.
- Invitation plans and limits come from `packages/payments/src/plans.ts`. Never copy the figures into code or copy.

### Internationalisation and RTL

- No hard-coded user-facing strings. Everything goes through `packages/i18n`. Copy is English (`en-AU`) only. Add keys in the same PR. To add a language later, widen `EnabledLocaleSchema` in `packages/validators` and add its dictionary in `packages/i18n` through a `contract-change`.
- Use **logical CSS properties only** (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start`, `end`, `text-start`). Never use `ml`, `mr`, `left` or `right` for layout.
- Directional icons (arrows, chevrons) flip in RTL. Logos, media controls and numbers inside LTR runs do not.
- If another locale is ever enabled, the language lives in the URL, **never only in storage**. WhatsApp and Instagram in-app browsers can throw on `localStorage`. This is a lesson from `anniversary-invitation`.
- Use the deterministic date formatters from `packages/i18n` (`src/dates.ts`, day first: `23 October 2026`); no `Intl` formatting during SSR or hydration. Numeric dates are `DD/MM/YYYY`.

### Memorial Mode

Funeral, memorial, celebration-of-life and wake routes and events **must** render in Memorial Mode: the calm palette, a respectful tone, no confetti, no celebratory animation, no upbeat default music, no countdown "until the party" language, and no upsell banners. The mode comes from the event or ceremony category through the shared `getExperienceMode()` helper in `packages/i18n`. Never hand-roll it. See `docs/design/MEMORIAL_MODE.md`.

### Accessibility and performance

- **Accessibility:** WCAG 2.2 AA. Keyboard reachable, visible focus, `prefers-reduced-motion` respected (the invitation gate has a reduced-motion path), and colour contrast ≥ 4.5:1.
- **Performance (marketing and invitation pages on a mid-range Android over 4G):** LCP < 2.5s, INP < 200ms, CLS < 0.1. Invitation guest pages must work without JavaScript for the core details (who, when, where).

### Security

- Every API route has three things: a Zod-validated input, an authenticated session, and an RBAC permission check from `packages/auth`. The only exceptions are explicitly marked public routes, such as guest RSVP through a link token or the enquiry form.
- Guest links use unguessable tokens (`WEBSITE.md` §B6). Unknown tokens return a real 404. Guest pages are `noindex` and are never listed anywhere.
- The client address comes only from headers our own edge sets (`DEPLOYMENT.md`, "Client address trust model"). Never read `x-forwarded-for` or a platform header directly.
- Webhooks (Stripe today; Twilio and Resend when added) verify signatures and are idempotent, keyed by provider event id.
- No mock providers in production paths. When Stripe or Resend is not configured, say so (`503 …_NOT_CONFIGURED`, `GET /v1/me` capabilities); never pretend.

## 4. Roles (RBAC)

These are defined in `packages/auth`. Never invent new roles in an app.

| Role            | Who                                                      | Surfaces today                          | Planned surfaces                |
| --------------- | -------------------------------------------------------- | --------------------------------------- | ------------------------------- |
| `CUSTOMER_HOST` | Event host (co-hosts: INV-17)                            | `invitation.` studio and door check-in  | `app.` portal, mobile           |
| `GUEST`         | Invitation recipient (no account; the link is the token) | `invitation.` guest site                | —                               |
| `VENDOR`        | Venue, caterer, stylist, rentals, entertainment, florist | none                                    | `vendors.`                      |
| `PLANNER_STAFF` | Managevent coordinators (TOTP required)                  | `www.managevent.com.au/admin`           | mobile                          |
| `CHECKIN_CREW`  | On-the-day door and setup staff                          | API check-in routes only (roster scope) | mobile crew mode, Windows kiosk |
| `SUPER_ADMIN`   | Owners, finance, operations (TOTP required)              | `www.managevent.com.au/admin`           | —                               |

## 5. Definition of done (every PR)

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass from the repo root, with local PostgreSQL running (`pnpm db:local:detach`).
- [ ] Tests cover the new behaviour. Use Vitest for logic, Playwright for web flows, and Maestro or Detox for mobile where the issue requires it.
- [ ] Strings are added in `packages/i18n` (en-AU spelling, day-first dates), with screenshots in the PR for UI work.
- [ ] Memorial Mode has been checked if the UI can show a memorial event.
- [ ] No new PII leaves Australia. No secrets are committed.
- [ ] The docs are updated: the app's `README.md`, plus `DATA_MODEL.md` and `WEBSITE.md` if they changed. The finished item's row is deleted from `ROADMAP.md` in the same PR, and any new undone work gets a row.
- [ ] The PR links its issue and fills in `.github/PULL_REQUEST_TEMPLATE.md`.

## 6. Contract changes

The shared packages `db`, `validators`, `types`, `auth`, `payments`, `i18n` and `ui` tokens are contracts. Several agents build against them in parallel. To change one:

1. Open or label the issue `contract-change`, and describe the change and every consumer it affects.
2. Make changes additive where possible: new optional fields, new endpoints. Breaking changes need a migration note in the PR and in `docs/architecture/CHANGELOG_CONTRACTS.md`.
3. Prisma migrations are **append-only** and must stay backward compatible with the previous release, because a rollback runs the previous images against the new schema. Never edit a migration that has merged.
4. A new, renamed or removed API route also updates `apps/api/src/contract.routes.test.ts` and the generated client (`pnpm --filter @managevent/api-client generate`).

## 7. Commands

Nothing reads the root `.env` by itself: the root scripts and `pnpm with-env <command>` (`scripts/with-env.mjs`) load it.

```bash
pnpm install                                              # from repo root, always
cp .env.example .env                                      # once; fill in the local values (infra/LOCAL_DEV.md)
pnpm db:local:detach                                      # PostgreSQL 16 on localhost:5432, no Docker
pnpm db:migrate                                           # apply migrations
pnpm db:seed                                              # Perth placeholder content
pnpm with-env pnpm --filter @managevent/api seed:demo     # the six sample invitations
pnpm with-env pnpm --filter @managevent/<app> dev         # run one app
pnpm lint && pnpm typecheck && pnpm test && pnpm build    # the gate
```

Also: `pnpm format:check`, `pnpm validate:content`, `pnpm db:drift-check`, `pnpm test:e2e`. Run Prettier only on the files you changed. Deployment is in `DEPLOYMENT.md`.

## 8. Commits and branches

- Branches: `feat/<app>-<short>`, `fix/<app>-<short>`, `chore/...`, `docs/...`
- Commits follow Conventional Commits with the app as scope: `feat(invitation): envelope gate reveal`
- One issue maps to one PR, titled with its ROADMAP id. Keep PRs under about 600 changed lines where possible.

## 9. When you are unsure

Do not guess about money, privacy, compliance, Memorial Mode, or anything in `OPEN_DECISIONS.md`. Leave a `// DECISION-NEEDED(<issue# or ROADMAP id>): …` comment, record it in the PR description, and choose the most conservative behaviour.
