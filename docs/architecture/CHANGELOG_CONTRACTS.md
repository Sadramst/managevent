# Contract changelog

## Invitation platform: backend integration (2026-11-12)

`contract-change`. Follows the foundation entry below; read that one first. This entry records what changed while the modules were integrated, and states where nothing changed so consumers need not look.

**Breaking**

- **Queue payload `lead.created`** (`apps/api` producer, `apps/worker` consumer): the payload is now `{ leadId }` only. The worker loads the lead from the database. Name, email and the other enquiry fields are no longer on the queue. Deploy the API and the worker together; a job enqueued in the old shape still carries `leadId` and is handled.
- **Worker environment:** `RESEND_DOMAIN_VERIFIED` is no longer read and `MockSafeResendAdapter` is gone. The worker sends real email as soon as `RESEND_API_KEY` is set. Anyone who relied on the flag to hold sends back must now leave the key unset. `DEPLOYMENT.md`, `infra/DEPLOY_RUNBOOK.md` and `infra/vps/.env.example` are updated.
- **RSVP storage rule** (`POST /v1/i/{eventSlug}/{guestToken}/rsvp`; request schema `GuestRsvpSubmitSchema` unchanged): the API now stores only what the invitation's `rsvpConfig` asks for. Dietary and allergy fields need `askDietary`, accessibility notes need `askAccessibility`, song requests need a visible `songPrompt`, `messageToHost` needs `askMessage`, and `contact` needs `askContact` (default `false`). Anything else in the request is accepted and dropped, not rejected. A guest who answers `NO` has all four health columns set to null, including values from an earlier reply. A client that shows a field the settings turn off will see it come back empty.

**Additive**

- `@managevent/auth` (`permissions.ts`, `PERMISSIONS.md`): no change beyond the foundation entry (`checkin:scan` for `CUSTOMER_HOST` is own, `OWNER` and `EDITOR`). The API applies it together with the `qrPassesAndCheckin` entitlement, and returns dietary flags on the door list only when the caller also has `health:read`.
- `@managevent/validators`: no schema changed during integration. `invitation-host.ts`, `guest-site.ts` and `guest-list.ts` are as listed below; the request and response schemas of every route are the ones the OpenAPI document references.
- `@managevent/db`: no migration beyond `20261112000000_invitation_platform`. `DATA_MODEL.md` now documents three string conventions that have no enum: `Message.status` (`SENT`, `FAILED`, `NOT_CONFIGURED`), `Campaign.status` (`QUEUED`, `SENDING`, `SENT`, `PARTIAL`, `FAILED`) and the shape of `Campaign.audienceFilterJson` (`{ kind, recipients: [{ partyId, guestId }], skipped: [{ partyId, reason }] }`, ids only). `Campaign.idempotencyKey` is stored as `{invitationId}:{kind}:{Idempotency-Key}`.
- `@managevent/i18n`: 13 new `en` keys under `emails.*` for the worker: `leadPlannerAlertBody`, `leadValueYes`, `leadValueNo`, `leadValueNotProvided`, `invitationBody`, `invitationHostsFallback`, `invitationMemorialSubject`, `invitationMemorialBody`, `rsvpReminderSubject`, `rsvpReminderBody`, `rsvpReminderMemorialSubject`, `rsvpReminderMemorialBody`, `rsvpReminderDeadline`. No key was renamed or removed.
- `@managevent/api-client`:
  - `generated.ts` lists the 48 operations the API serves. Its freshness test compares against `extractOpenApiOperations(generateOpenApiSpec())` and no longer keeps a list by hand.
  - `http.text()` now returns the response exactly as sent, including a leading byte order mark (it used to strip it). `client.guestList.exportCsv()` therefore returns a CSV that Excel reads as UTF-8.
- `@managevent/ui` tokens and `@managevent/types`: no change.
- `@managevent/payments`: no change beyond the foundation entry.

**Route contract** (`apps/api`): the complete route list is in `apps/api/README.md` and is enforced by `apps/api/src/contract.routes.test.ts`. Codes used outside the stable list of the implementation contract: `409 CONFLICT` (wish on an invitation without a well; link words changed after first publish; a check-in `clientUuid` reused at another event; a party `Idempotency-Key` whose party has since been deleted) and `400 INVALID_SIGNATURE` (Stripe webhook).

Consumers: `apps/invitation` (RSVP form: mint a new `Idempotency-Key` after a successful submit, and render fields from `rsvpConfig`), `apps/marketing` (no change), `apps/admin` (lead routes), `apps/worker`.

## Invitation platform foundation (2026-11-12)

`contract-change`. Mostly additive; the breaking parts are listed first.

**Breaking**

- `@managevent/auth` (`better-auth.ts`):
  - The `organization` plugin is removed. Its `invitation` model resolved to the event `Invitation` table through `prismaAdapter`. Nothing consumed it.
  - `magicLink` is registered only when a real sender is passed. The option is renamed from `onSendMagicLink` to `sendMagicLink`; a new `sendResetPassword` enables password reset.
  - Email and password sign-in is enabled (10 to 128 characters, auto sign-in). New accounts always get `roles = ["CUSTOMER_HOST"]` from a server-side hook; `roles` is not client input.
  - Cookies: `cookieDomain` no longer defaults to `localhost`. Unset, `localhost` or an IP gives host-only cookies. `Secure` follows `baseURL` (https) only, not `NODE_ENV`.
  - New options: `trustedOrigins`, `generateId` (maps to `advanced.database.generateId`).
- `@managevent/auth` (`permissions.ts`, `PERMISSIONS.md`): `checkin:scan` for `CUSTOMER_HOST` changes from none to own (`OWNER`, `EDITOR`), so a self-serve host can run the door. The API still gates it on the `qrPassesAndCheckin` entitlement.
- `@managevent/payments` (`plans.ts`): `InvitationPlanEntitlements` gains the required key `rsvpReminders` (FREE false; PREMIUM and AGENCY true). Code that builds this object by hand must add it.

**Additive**

- `@managevent/db`: migration `20261112000000_invitation_platform`. New columns `Invitation.isDemo`, `Party.tokenVersion`, `Party.revokedTokens`, `Pass.revokedAt`, `WellEntry.idempotencyKey` (unique), `Campaign.idempotencyKey` (unique), `Lead.notes`; new table `WebhookEvent` (prefix `whk_`); new indexes listed in `DATA_MODEL.md`. All new columns are nullable or defaulted, so existing rows need no backfill. Run `pnpm db:migrate` then `pnpm db:generate`.
- `@managevent/validators`: new files `invitation-host.ts`, `guest-site.ts`, `guest-list.ts` (host events and invitation content, guest micro-site, guest list, messaging, CRM inbox), each exporting inferred types next to its schemas. Existing schemas are unchanged.
- `@managevent/payments`: new `checkout.ts` (`createStripeCheckoutClient`, `isStripeCheckoutConfigured`, `isStripeWebhookConfigured`, `PaymentsNotConfiguredError`, `StripeWebhookSignatureError`) on the real `stripe` SDK. It never falls back to the placeholder key or webhook secret in `stripe.ts`.
- `@managevent/i18n`: new `en` keys `emails.authMagicLinkSubject`, `emails.authMagicLinkBody`, `emails.authResetPasswordSubject`, `emails.authResetPasswordBody`.
- `@managevent/api-client`: resource objects on the client (`client.me`, `client.events`, `client.billing`, `client.guestSite`, `client.checkIn`, `client.well`, `client.guestList`, `client.responses`, `client.messaging`, `client.leads`), `isApiError()`, the `NETWORK_ERROR` code (`status: 0`), and the `cookie`, `forwardedFor` and `userAgent` options. `getHealth()`, `createLead()` and `listLeads()` are unchanged.

Consumers: `apps/api` (updated in the same change), `apps/worker`, `apps/invitation`, `apps/marketing`.

## Venue enquiry prefill keys (2026-11-11)

Additive `contract-change`. No breaking change.

- `@managevent/i18n` (`launch.ts`): new `en` keys `launchVenueAsk`, `launchVenueNote` and `launchVenuePrefill`. They back the "Ask about this venue" link on marketing venue cards (`/?venue=<slug>#enquiry`), which prefills the enquiry message with a neutral line the visitor can edit.
- `@managevent/validators` and `@managevent/db`: no change.
- Consumers: `apps/marketing` only.

## Remove Persian (`fa`) locale and Persian ceremonies (2026-11-11)

Breaking contract change (`contract-change`). The platform is now English (en-AU) only, aimed at Australian customers.

- `@managevent/validators`: `LocaleSchema` is `en | ar | zh | hi`; `EnabledLocaleSchema` is `en`. `fa` removed from `LocalizedTextSchema`. Theme id `persian-azure` and builder category `sofreh-set` removed.
- `@managevent/i18n`: `fa` dictionaries, Jalali dates and Persian digit helpers removed. `ENABLED_LOCALES` is `["en"]`.
- `@managevent/ui`: `persian-azure` theme and Vazirmatn font tokens removed (6 launch themes).
- `@managevent/pricing`: `sofreh-set` price-list entry removed.
- `content/`: Persian ceremony and package content removed.
- `@managevent/db`: no schema change. Data migration `remove_persian` sets `locale='en'` on existing `fa` rows and remaps removed themes and ceremony slugs.
- Consumers: remove `fa` usage; old `/fa/...` URLs redirect to `/en/...`.

Step 2 launch (2026-10-23): additive EN/FA marketing and draft legal dictionary
keys; auth re-exports the Prisma adapter for the API's database-backed sessions.
API lead authorization no longer trusts client role headers. Production email
requires explicit domain verification and uses provider idempotency keys.

Step 2 plans (2026-10-23): additive `getInvitationPlan(plan, mode)` and optional
mode arguments on entitlement helpers grant memorial Premium access for zero cents.
Agency-only logistics fulfilment remains agency-only. Premium celebration price
confirmed at 6900 AUD cents inclusive of GST.

## Step 2: Encrypted Health Storage (2026-10-23)

Breaking database contract: remove `Rsvp.dietary` and `Rsvp.allergySeverity`.
API health inputs remain typed; callers must use `encryptRsvpWriteData()` before
persistence. API/worker consumers regenerate Prisma. Migration
`20261023010000_encrypted_health_only` refuses legacy plaintext rows without a
ciphertext mirror. Backfill with the application key before migration; never
edit the initial migration. Worker snapshots accept validated counts only and
reject cross-event snapshot references.

Record every change to `packages/db`, `validators`, `types`, `auth`, `payments`, `i18n` keys (renames or removals only) and `ui` tokens here, newest first.

| Date       | PR     | Package                     | Change                                                                                               | Breaking? | Migration notes |
| ---------- | ------ | --------------------------- | ---------------------------------------------------------------------------------------------------- | --------- | --------------- |
| 2026-10-23 | FND-16 | `@managevent/ai`            | Server-side `@google/genai` client, versioned prompts, Zod schemas, quotas, PII & memorial guards    | No        | Initial release |
| 2026-10-23 | FND-14 | `@managevent/api-client`    | Typed API client generated from `apps/api` OpenAPI 3.1 spec with `generate` & `generate:check`       | No        | Initial release |
| 2026-10-23 | FND-13 | `@managevent/notifications` | Resend & Twilio wrappers, Spam Act consent/suppression/quiet-hours checks, EN/FA templates           | No        | Initial release |
| 2026-10-23 | FND-13 | `@managevent/storage`       | Cloudflare R2 signed upload/download URLs, public/private bucket selection, variant descriptors      | No        | Initial release |
| 2026-10-23 | FND-10 | `@managevent/logistics`     | RSVP headcount -> catering, allergen, cake, seating, hire and RSA staffing recommendation engine     | No        | Initial release |
| 2026-10-23 | FND-09 | `@managevent/pricing`       | Ceremony Builder estimator (`WEBSITE.md` §A6.4), price list `2026.10.1`, ceremony family fixtures    | No        | Initial release |
| 2026-10-23 | FND-08 | `@managevent/payments`      | AUD cents, 10% GST per-line half-up rounding, ATO TaxInvoice, plans/entitlements, Stripe test wrap   | No        | Initial release |
| 2026-10-23 | FND-07 | `@managevent/auth`          | Better Auth config, `PERMISSIONS.md` matrix (22 permissions), `requirePermission()`, scoping helpers | No        | Initial release |
| 2026-10-23 | FND-06 | `@managevent/ui`            | Celebration & Memorial tokens, 7 invitation themes, `ExperienceModeProvider`, base components        | No        | Initial release |
| 2026-10-23 | FND-05 | `@managevent/i18n`          | EN/FA dictionaries (11 namespaces), `t()`, `getDir()`, Jalali/Gregorian dates, `getExperienceMode()` | No        | Initial release |
| 2026-10-23 | FND-04 | `@managevent/types`         | Inferred domain types, branded entity ID types (`EventId`, `UserId`, etc.) and type guards           | No        | Initial release |
| 2026-10-23 | FND-03 | `@managevent/validators`    | MVP API input/output Zod schemas, `/content` schemas, and AU primitives (cents, phone, ABN)          | No        | Initial release |
| 2026-10-23 | FND-02 | `@managevent/db`            | Prisma schema (`DATA_MODEL.md`), prefixed UUIDv7 IDs, AES-256-GCM field encryption, Perth seed       | No        | Initial release |
| 2026-10-23 | FND-01 | `@managevent/config`        | Initial tsconfig, ESLint flat config, Prettier, Tailwind v4 preset, Vitest preset, redaction         | No        | Initial release |
| —          | —      | —                           | Initial structure                                                                                    | —         | —               |
