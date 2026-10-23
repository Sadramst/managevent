# AGENTS.md: master rules for every coding agent

These rules apply to **every agent and every human** working anywhere in this repository: Claude Code, Gemini CLI, Cursor, GitHub Issue agents, Copilot. A folder's own `AGENTS.md` adds rules for that folder. It never removes rules from this file. If two rules conflict, the stricter one wins. If you are still unsure, stop and ask in the issue.

## 1. What Managevent is (read once)

Managevent runs ceremonies of every kind from 0 to 100: weddings, Persian ceremonies (Sofreh Aghd, Baleh Boroon, Nowruz, Shab-e Yalda, Mehmooni), birthdays, corporate galas, and funerals and memorials. Perth (WA) comes first, then other Australian cities. It has three business lines that share one platform:

1. **Agency:** our planners deliver the event.
2. **Marketplace:** vetted vendors take bookings through us, and we take commission via Stripe Connect.
3. **Tools:** digital invitations, RSVP, guest management and check-in.

**The core hook:** RSVP data from `invitation.` (headcount, adults and children, dietary needs) flows into `app.` and drives catering, cake, seating and hire recommendations. Never build a feature that breaks this bridge.

## 2. Before you write any code

1. Read this file, then the `AGENTS.md` of the folder you are working in, then the issue.
2. Read the contract you depend on:
   - **Data:** `packages/db/DATA_MODEL.md` (and `schema.prisma` once it exists)
   - **API shapes:** `packages/validators`
   - **Copy and translations:** `packages/i18n`
   - **Design:** `docs/design/DESIGN_SYSTEM.md`
   - **Web routes:** `WEBSITE.md`
3. Check `docs/architecture/OPEN_DECISIONS.md`. If your task touches an open decision, do not decide it silently. Raise it in the issue.
4. Work **only inside the paths your issue names**. Changes to a shared package need the `contract-change` label (see §6).

## 3. Non-negotiable rules

### Stack (see `docs/architecture/adr/`)

- **Package manager:** pnpm workspaces only. Never npm or yarn, and never commit another lockfile.
- **Language:** TypeScript `strict` everywhere. No `any` (use `unknown` and narrow it). No `@ts-ignore` without a linked issue.
- **Web:** Next.js App Router, Tailwind CSS, shadcn/ui and Framer Motion.
- **Mobile:** Expo, Expo Router and NativeWind.
- **Desktop:** Tauri v2.
- **API:** Hono on Node, with Prisma and PostgreSQL in Sydney.
- **Validation:** Zod schemas in `packages/validators`. These are the single contract and are imported by both client and server. Never redefine a shape locally.
- **Versions:** pin exact versions in each app's `package.json` when you scaffold it. Use the latest stable release at scaffold time. Do not use RC or beta versions unless an ADR allows it.

### Data and privacy (Australian Privacy Act, APPs)

- All personal information is stored in **Australia (ap-southeast-2 / Sydney)**. Never add a service that stores PII outside Australia without a new ADR. Analytics, logging and error tracking count.
- Guests are not our customers. Collect the **minimum** they need to RSVP. Dietary and allergy data is **health information**, which is sensitive under the APPs. Keep it encrypted at rest, scope it to the event, and delete it on the retention schedule.
- Never log PII, tokens, payment data or full guest URLs. Use the redaction helpers in `packages/config`.
- Never commit secrets, salts or keys. Everything goes in `.env` (see `.env.example`).
  - _Lesson from `anniversary-invitation`, which committed its slug salt:_ salts are per-event, stored in the database, and never in the repo.

### Money (AUD and GST)

- All money is **integer cents in AUD** (`amountCents: number`). Never use floats for money.
- GST is calculated **only** in `packages/payments` (10%, rounding rules in `docs/compliance/PAYMENTS_AND_GST.md`). Never inline `* 1.1` anywhere.
- Prices shown to consumers are **GST-inclusive**, as the Australian Consumer Law requires. Every tax invoice shows the ABN and the GST amount.

### Internationalisation and RTL

- No hard-coded user-facing strings. Everything goes through `packages/i18n`. Add the `en` and `fa` keys **in the same PR**. A parity test fails the build otherwise.
- Use **logical CSS properties only** (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start`, `end`, `text-start`). Never use `ml`, `mr`, `left` or `right` for layout.
- Directional icons (arrows, chevrons) flip in RTL. Logos, media controls and numbers inside LTR runs do not.
- The language lives in the URL (`/fa/...` or `?lang=fa`), **never only in storage**. WhatsApp and Instagram in-app browsers can throw on `localStorage`. This is a lesson from `anniversary-invitation`.

### Memorial Mode

Funeral, memorial, celebration-of-life and wake routes and events **must** render in Memorial Mode: the calm palette, a respectful tone, no confetti, no celebratory animation, no upbeat default music, no countdown "until the party" language, and no upsell banners. The mode comes from the event or ceremony category through the shared `getExperienceMode()` helper. Never hand-roll it. See `docs/design/MEMORIAL_MODE.md`.

### Accessibility and performance

- **Accessibility:** WCAG 2.2 AA. Keyboard reachable, visible focus, `prefers-reduced-motion` respected (the invitation gate animation must have a reduced-motion path), and colour contrast ≥ 4.5:1.
- **Performance (marketing and invitation pages on a mid-range Android over 4G):** LCP < 2.5s, INP < 200ms, CLS < 0.1. Invitation guest pages must work without JavaScript for the core details (who, when, where).

### Security

- Every API route has three things: a Zod-validated input, an authenticated session, and an RBAC permission check from `packages/auth`. The only exceptions are explicitly marked public routes, such as guest RSVP via a token.
- Guest links use unguessable tokens (see `WEBSITE.md` §B6). Unknown tokens return a real 404. Guest pages are `noindex` and are never listed anywhere.
- Webhooks (Stripe, Twilio, Resend) verify signatures and are idempotent, keyed by event id.

## 4. Roles (RBAC)

These are defined in `packages/auth`. Never invent new roles in an app.

| Role            | Who                                                      | Main surfaces                             |
| --------------- | -------------------------------------------------------- | ----------------------------------------- |
| `CUSTOMER_HOST` | Event host and invited co-hosts or family                | `app.`, `invitation.` Host Studio, mobile |
| `GUEST`         | Invitation recipient (often has no account; token-based) | `invitation.` guest micro-site            |
| `VENDOR`        | Venue, caterer, stylist, rentals, entertainment, florist | `vendors.`                                |
| `PLANNER_STAFF` | Managevent coordinators                                  | `admin.`, mobile                          |
| `CHECKIN_CREW`  | On-the-day door and setup staff                          | mobile (crew mode), Windows kiosk         |
| `SUPER_ADMIN`   | Owners, finance, operations                              | `admin.`                                  |

## 5. Definition of done (every PR)

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass from the repo root.
- [ ] Tests cover the new behaviour. Use Vitest for logic, Playwright for web flows, and Maestro or Detox for mobile where the issue requires it.
- [ ] Both `en` and `fa` strings are added and the RTL layout has been checked, with screenshots in the PR for UI work.
- [ ] Memorial Mode has been checked if the UI can show a memorial event.
- [ ] No new PII leaves Australia. No secrets are committed.
- [ ] The docs are updated: the app's `README.md`, plus `DATA_MODEL.md` and `WEBSITE.md` if they changed.
- [ ] The PR links its issue and fills in `.github/PULL_REQUEST_TEMPLATE.md`.

## 6. Contract changes

The shared packages `db`, `validators`, `types`, `auth`, `payments`, `i18n` and `ui` tokens are contracts. Several agents build against them in parallel. To change one:

1. Open or label the issue `contract-change`, and describe the change and every consumer it affects.
2. Make changes additive where possible: new optional fields, new endpoints. Breaking changes need a migration note in the PR and in `docs/architecture/CHANGELOG_CONTRACTS.md`.
3. Prisma migrations are **append-only**. Never edit a migration that has merged.

## 7. Commands

```bash
pnpm install                         # from repo root, always
pnpm --filter @managevent/<app> dev  # run one app
pnpm turbo run build --filter=...<app>  # build an app and its dependencies
pnpm --filter @managevent/db db:migrate  # once packages/db exists
```

## 8. Commits and branches

- Branches: `feat/<app>-<short>`, `fix/<app>-<short>`, `chore/...`, `docs/...`
- Commits follow Conventional Commits with the app as scope: `feat(invitation): envelope gate reveal`
- One issue maps to one PR. Keep PRs under about 600 changed lines where possible.

## 9. When you are unsure

Do not guess about money, privacy, compliance, Memorial Mode, or anything in `OPEN_DECISIONS.md`. Leave a `// DECISION-NEEDED(<issue#>): …` comment, record it in the PR description, and choose the most conservative behaviour.
