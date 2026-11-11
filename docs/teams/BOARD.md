# Sprint board

Sprint close, owned by the Scrum Master. English-only (en-AU) site for Australia. No Persian, Jalali or `fa` content is to be reintroduced.

## Team roster

| Team              | Role in this sprint                                     |
| ----------------- | ------------------------------------------------------- |
| Reader            | Read every area of the repo (read-only) and logged bugs |
| Strategy          | Set priorities and the deferral rules                   |
| Manager           | Assigned work packages and guarded scope                |
| Scrum             | Runs this board and closes the sprint                   |
| Product           | Specified and shipped new features                      |
| Dev A (bug fixes) | Fixed low-risk bugs from the reader logs                |
| Dev B (features)  | Built the product features                              |
| QA                | Reviewed the diff and the new files                     |
| Docs              | Owns the `root-docs-*` items and the markdown updates   |

## Files read (collapsed count per area)

| Area                                                                                                                                                          | Files   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Reader team: root `*.md`, `docs/**`, `.github/**`, `.cursor/**`                                                                                               | 64      |
| `apps/marketing/**` and `content/**` (read-only)                                                                                                              | 56      |
| `apps/invitation`                                                                                                                                             | 64      |
| Backend: `apps/api`, `apps/worker`, `apps/admin`, `packages/db`, `validators`, `auth`, `payments`, `notifications`, `ai`                                      | 90      |
| Shared and other: `packages/` i18n, ui, pricing, logistics, config, types, api-client, integrations; `apps/` mobile, portal, vendors, desktop-win; `infra/**` | 115     |
| **Total**                                                                                                                                                     | **389** |

## Checklist

### Reading

- [x] Reader team: root docs, `docs/**`, `.github/**`, `.cursor/**` (64 files)
- [x] Marketing site and content (56 files)
- [x] Invitation app (64 files)
- [x] Backend apps and packages (90 files)
- [x] Shared packages, other apps and infra (115 files)
- [x] Bugs logged: 16 root-docs, 13 marketing-site, 19 invitation-app, 24 backend, 17 shared-and-other (89 in total)

### Dev A, bug fixes

- [x] A1
- [x] A2
- [x] A3
- [x] A4

### Dev B / Product, features

- [x] PROD-INV-01 (awaiting-RSVP studio route, RSVP chase copy). The route has no host gate yet, see DECISION-NEEDED below.
- [x] PROD-MKT-01 (marketing venue prefill in the enquiry form)

### QA

- [x] Diff review of the changed and new files
- [x] Static grep for physical CSS, Arabic script and Jalali/Farsi/Persian references, with no hits in the invitation and marketing sources
- [ ] Run `vitest`, `eslint` and Playwright. Not done: pnpm is missing and Node is 20.17.
- [ ] Line-by-line read of every file in the QA scope. Not done: QA relied on grep, `tsc` and `git diff --stat`. Accessibility, hard-coded strings and PII logging were only partly checked by pattern.
- [ ] Script-level Persian regression grep. Not done: the shell locale lacks UTF-8 PCRE support. A manual diff read found nothing.
- [ ] Run the VPS compose stack to confirm `wget` in the api image for the healthcheck. Not done: no server or container access in this run.

### Open QA findings (none fixed)

- [ ] `calendar.ics/route.ts`: ICS lines are not folded at 75 octets (RFC 5545). Low severity, most clients tolerate it.
- [ ] `lib/i18n.ts`: `formatCeremonyDate` falls back to Perth (+08:00) for unknown IANA zones. This is documented.
- [ ] `pass/page.tsx`: RSVP status labels are hard-coded English. Move them to `packages/i18n` later.
- [ ] `studio/[eventId]/awaiting/page.tsx`: no host-access gate. Flagged DECISION-NEEDED(PROD-INV-01).
- [ ] `pass/page.tsx` and `QrCodeModal.tsx`: `console.error(err)` on QR failure. It should use the `packages/config` redaction helper.
- [ ] `lib/rsvp-chase-copy.ts`: English copy lives in a lib file. Move it to `packages/i18n` later.
- [ ] `enquiry-form.tsx`: the effect line is long and double-parses the URL. Cosmetic only.
- [x] No defects in `packages/api-client`, `apps/api/src/middleware/context.ts`, `csv-helper.ts` and `experience-mode.ts`
- [x] `next.config.ts` rewrite removal is safe. A bare `/anniversary` returns 404 as before.
- [x] `docker-compose.yml` `service_healthy` dependency is valid (the api service defines a healthcheck)
- [x] `apps/marketing/proxy.ts` only mentions retired Persian pages in a comment, and it redirects old links

### Docs

- [x] This board created at `docs/teams/BOARD.md` and linked from `docs/README.md`
- [ ] The `root-docs-1` to `root-docs-16` fixes. Not done: these belong to the docs writer and were not part of this task.
- [ ] Marketing items (`marketing-site-*`). Not done: they belong to Team B.

## Deferred, DECISION-NEEDED

All of these touch money, privacy, auth, DB or contracts, so they were logged and not changed.

**Invitation**

- invitation-app-1: guest-safe DTO (privacy, DTO shape undecided)
- invitation-app-2: token 404 and removal of the fallback in `invitation-store.ts` (token and privacy path, plan mode, first item of WP1)
- invitation-app-3: auth and RBAC gate on studio and export
- invitation-app-4: studio persistence (DB)
- invitation-app-5: gate no-JS and dialog semantics (schedule behind app-1 and app-2, same guest page files)
- invitation-app-7: RSVP validation and consent enforcement (`contract-change` in validators, privacy)
- invitation-app-8: calendar link token (needs the guest-safe DTO from app-1)
- invitation-app-9: consent default and memorial RSVP copy (wording undecided)
- invitation-app-13 and shared-and-other-1: pepper and salts (secrets)
- invitation-app-14: signed QR and server-side pass data

**Backend**

- backend-1: Stripe webhook secret guard (money, `packages/payments`, plan mode)
- backend-2: retention job. backend-3 and backend-4: encryption coverage. backend-15 and backend-23 (DB, privacy, `contract-change`)
- backend-5: transactional lead submit and outbox (DB)
- backend-6: shared pg-boss instance and `DATABASE_URL` fail-fast (infra and env, defer to WP3)
- backend-7: trusted-proxy IP and auth rate limits (security policy)
- backend-8, backend-9, backend-10: auth (plan mode)
- backend-11, backend-12, backend-21: validators and payments contract changes
- backend-13, backend-14, backend-18: production guards, contact defaults and AI region
- backend-17: db test thresholds (confirm content first)

**Shared**

- shared-and-other-3: redaction keys (privacy behaviour change)
- shared-and-other-5 and shared-and-other-6: estimator clock and placeholder pricing (money)

**Founder's call**

- Deletion of `infra/vps/static` and `.github/modernize`

## Next-sprint suggestions

1. WP1, guest privacy path, in plan mode: invitation-app-2 (token 404, no fallback), then app-1 (guest-safe DTO), then app-8 and app-5.
2. WP2, auth: RBAC gate on studio and export (app-3), the `awaiting` route gate, then the backend auth items (backend-8 to backend-10).
3. Money and payments: Stripe webhook guard (backend-1) and the pricing placeholders and estimator clock, under `contract-change`.
4. Privacy and DB: retention job, encryption coverage and redaction keys. Resolve the pepper and salt storage decision first.
5. WP3, infra: pg-boss, `DATABASE_URL` fail-fast, trusted-proxy IP, and a container check of the api healthcheck.
6. Get pnpm and Node 22 working so `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and Playwright run, and CI can gate the board.
7. Move hard-coded English (pass status labels, RSVP chase copy) into `packages/i18n`, and route QR error logging through the redaction helper.
8. Docs writer to clear `root-docs-1` to `root-docs-16`, starting with the high item in `DEPLOYMENT.md`. Team B takes the `marketing-site-*` items.
9. Fold ICS lines at 75 octets.
