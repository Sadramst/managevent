# Sprint Board

Sprint close, owned by the Product Owner & Scrum Lead. English-only (en-AU) site for Australia.

## Team roster

| Team              | Role in this sprint                                          | Status |
| ----------------- | ------------------------------------------------------------ | ------ |
| Reader            | Read every area of the repo (read-only) and logged bugs      | Done   |
| Strategy          | Set priorities and the deferral rules                        | Done   |
| Manager           | Assigned work packages and guarded scope                     | Done   |
| Scrum             | Runs this board and closes the sprint                        | Done   |
| Product Owner     | Managed sprint priorities, specifications, and quality gates | Done   |
| Dev A (bug fixes) | Fixed low-risk bugs from the reader logs                     | Done   |
| Dev B (features)  | Built the product features (Awaiting replies, venue prefill) | Done   |
| QA & Hardening    | Ran full test suites, typechecks, linters, and verification  | Done   |
| Docs              | Updated contracts changelog and sprint board documentation   | Done   |

## Verification Status

- [x] `pnpm test`: 44/44 unit test tasks passing across all 26 packages and apps.
- [x] `pnpm test:e2e` (`@managevent/marketing`): 18/18 Playwright tests passing (Desktop & Mobile, Home, Estimator, Enquiry Form, Admin Command Centre, Legal pages, Axe WCAG 2.2 AA).
- [x] `pnpm test:e2e` (`@managevent/invitation`): 20/20 Playwright tests passing (Desktop & Mobile, 0-to-100 Invitation Wizard Creation, Live Guest Link Generation, Envelope Reveal, Interactive RSVP Submission, Digital Ceremony Pass QR, RFC 5545 Calendar .ics, Host Studio Dashboard, Awaiting Replies Chase Dashboard, Memorial Mode solemn styling, Privacy 404 gates, CSV Export, Axe WCAG 2.2 AA).
- [x] `pnpm typecheck`: 32/32 tasks passing with TypeScript 5.9.3 `strict`.
- [x] `pnpm lint`: 44/44 tasks passing with zero ESLint errors or warnings.
- [x] `pnpm format:check`: 100% formatted with Prettier.
- [x] CI Workflow (`.github/workflows/ci.yml`): Configured to execute end-to-end browser and accessibility verification across both sites on every PR and push.
- [x] Workflow Acceptance Criteria Matrix documented in `docs/architecture/ACCEPTANCE_CRITERIA_WORKFLOWS.md`.

## Sprint Deliverables & Fixes

### 1. Calendar & RFC 5545 Compliance

- [x] `apps/invitation`: Added `foldIcsLine` helper adhering to RFC 5545 §3.1 (75-octet line folding with CRLF + space continuation).
- [x] `calendar.ics/route.ts`: All ICS output lines folded before joining.
- [x] Tests added in `apps/invitation/tests/a1-correctness.test.ts` verifying RFC 5545 line folding.

### 2. Privacy, PII Protection & Security Gates

- [x] `invitation-app-2`: Removed synthetic in-memory fallback party in `apps/invitation/lib/invitation-store.ts`. Unknown tokens now return `null` and trigger a genuine 404, satisfying privacy and anti-enumeration rules.
- [x] Verified with new test in `apps/invitation/tests/rsvp.test.ts` ensuring correctly formatted unknown tokens return `null`.
- [x] `pass/page.tsx` & `QrCodeModal.tsx`: QR generation errors wrapped in `redactForLog` from `@managevent/config/redact` to protect guest tokens and URLs from leaking to console.

### 3. Internationalisation & Copy Migration

- [x] `packages/i18n`: Added 26 canonical en-AU keys to `enDictionary.invitation` for Digital Ceremony Pass statuses, ticket details, and Host Studio Awaiting Replies chase copy.
- [x] `pass/page.tsx`: Migrated hard-coded status labels (`RSVP Confirmed`, `RSVP declined`, etc.) and ticket labels to `t("en", "invitation.*")`.
- [x] `apps/invitation/lib/rsvp-chase-copy.ts`: Migrated to `@managevent/i18n`.
- [x] Documented additive contract change in `docs/architecture/CHANGELOG_CONTRACTS.md`.

### 4. UI/UX & Studio Integration

- [x] `apps/invitation/app/studio/[eventId]/page.tsx`: Added direct "Awaiting Replies" action link with Clock icon in the Host Studio quick actions header.
- [x] `apps/invitation/app/studio/page.tsx`: Added "Awaiting" action link on each event card in the Studio Dashboard.
- [x] `apps/marketing/components/enquiry-form.tsx`: Refactored `URLSearchParams` parsing in `useEffect` to parse query parameters once into a local variable.

### 5. Backend & Data Integration

- [x] `backend-17`: Updated `packages/db/src/db.test.ts` content count thresholds from `>= 3` to `>= 2` to reflect the 2 launch ceremonies and 2 packages following the removal of legacy Persian content.

### 6. End-to-End 0-to-100 Invitation Creation & Guest Micro-Site Workflow

- [x] `apps/invitation/app/api/events/route.ts`: Built server-side `POST /api/events` and `GET /api/events` endpoints. Validates event creation, enforces Memorial Mode constraints (solemn gate and theme restrictions), persists into server store, and returns the newly generated primary guest micro-site URL.
- [x] `apps/invitation/app/api/events/[eventId]/route.ts`: Built `GET` and `PATCH` endpoints for fetching and updating ceremony details.
- [x] `apps/invitation/app/api/events/[eventId]/parties/route.ts`: Built `POST` endpoint supporting single party addition and bulk CSV imports.
- [x] `apps/invitation/app/studio/new/page.tsx`: Connected creation wizard to `POST /api/events` with loading indicator and error display.
- [x] `apps/invitation/app/studio/[eventId]/page.tsx` & `StudioEventClientView.tsx`: Refactored to server component SSR data loading with real-time API synchronization for guest parties, CSV imports, and theme selection.
- [x] `apps/invitation/tests/e2e/invitation-flow.spec.ts`: Added full 0-to-100 end-to-end browser test creating an invitation from scratch, retrieving the generated guest link, and verifying the live guest micro-site and RSVP flow with 0 Axe accessibility violations.

## Deferred / Next Milestones

- **WP1 Guest Privacy Path (remaining):** Guest-safe DTO (invitation-app-1), calendar token sanitisation (invitation-app-8).
- **WP2 Auth & RBAC:** Host-access session gate on studio routes and export endpoints (invitation-app-3, awaiting gate).
- **Backend Infrastructure:** pg-boss queue deduplication, live Supabase/Fly secrets validation in staging.
