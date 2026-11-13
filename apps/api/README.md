# @managevent/api

Hono REST API on Node 22 (`api.managevent.com.au`, local port `4000`).

The **only** writer to the database and the single authorisation layer for web, mobile and desktop. Browsers do not call it directly: each web app talks to it server-side and proxies `/api/auth/*`.

## Running locally

A local PostgreSQL 16 on port 5432 is started from the repo root with `pnpm db:local:detach` (`pnpm db:local:status` shows whether it is running); apply the migrations with `pnpm db:migrate`. The environment is the root `.env` (copied from `.env.example`), which only `pnpm with-env <cmd>` and the root scripts load:

```bash
pnpm with-env pnpm --filter @managevent/api dev       # http://localhost:4000
pnpm with-env pnpm --filter @managevent/api test
pnpm with-env pnpm --filter @managevent/worker start  # consumes the jobs the API enqueues
```

Rules for changing this app are in [`AGENTS.md`](AGENTS.md).

`GET /health` answers without a database. `GET /openapi.json` serves the OpenAPI 3.1 document, which lists every JSON route below (the CSV export is the one plain route).

## How a request is handled

- **Order:** Zod-validated input → `requirePermission` (through `requireEventAccess` for event routes) → service → repository. No Prisma in handlers.
- **Sessions:** Better Auth cookie (`managevent.session_token`) or bearer token, resolved against the database on every request. Sessions last 30 days for everyone; an 8-hour limit for staff is OPS-10. Identity and role headers are never trusted. Staff (`PLANNER_STAFF`, `SUPER_ADMIN`) without two-factor enabled are treated as signed out.
- **Not yours means not found:** an event the caller may not read answers `404 NOT_FOUND`, never `403`. `403 FORBIDDEN` is for an event the caller can read but may not change (for example a `VIEWER` co-host).
- **Guests have no account.** `/v1/i/{eventSlug}/{guestToken}/...` is authenticated by the link alone, matched exactly against the stored token. Unknown link → `404`; revoked, superseded or removed → `410 LINK_REVOKED`; unpublished → `404`, except for a signed-in host of that event, who gets a read-only preview.
- **Errors:** `{ error: { code, message, details?, requestId } }`. Clients localise from `code`.
- **Origin guard and CORS:** non-GET `/v1/*` requests that carry a cookie and an `Origin` outside the trusted list are refused. The list is `AUTH_TRUSTED_ORIGINS`, or the `NEXT_PUBLIC_*_URL` values plus `http://localhost:3100` and `http://localhost:3001` outside production.
- **Rate limits** (in memory, per process; moving them to a shared store is OPS-11): `guestRead` 120/min per IP and 60/min per link, `guestWrite` 20/min per IP and 10/min per link, `enumGuard` (30 misses per IP in 10 minutes, then 429; on every route that resolves a guest link), `hostRead` 600/min, `hostWrite` 120/min, `bulk` 10/hour per event, `checkout` 10/hour, `scan` 600/min, `publicMisc` 60/min per IP. IPv6 callers are counted per /64.
- **Client address:** never taken from a header the caller can set. In order: `x-forwarded-for` on a request that carries our web servers' shared secret (`API_PROXY_SECRET`, header `x-managevent-proxy-secret`); the edge proxy's header named in `TRUSTED_CLIENT_IP_HEADER` (`x-real-ip` in production, which Caddy overwrites on every request); the connection address. A caller with no known address shares one bucket. The same address goes on consent and audit rows (`lib/client-ip.ts`).
- **Auth limits** (`lib/auth-guard.ts`, in front of `/api/auth/*`): per IP on sign-in, sign-up, two-factor, magic link and password reset; 10 wrong passwords per email address in 15 minutes; 5 emailed links per address an hour; 5 wrong two-factor codes per account in 15 minutes. Better Auth is handed the address the API resolved, never a request header. These endpoints accept `application/json` only (`415` otherwise).
- **Magic links:** never sent to, and never accepted for, an account with two-factor enabled or a staff role. The first link used for an address that was never verified removes the account's password and its other sessions before signing the owner in (the password may have been set by whoever registered the address first); the owner sets a new one through the reset flow.
- **Auth logs:** Better Auth's messages are logged without their arguments, so no email address reaches the logs.
- **Guest links are credentials.** `token`, `invitePath`, `previewPath` and the CSV `Invite Path` column are only returned to callers with `guest:write`; a `VIEWER` co-host gets null (blank in the CSV). Door crew (`CHECKIN_CREW`) can use the check-in routes only: every other event route answers `403`.
- **Logging:** method, redacted path, status and duration. Never bodies. The guest token in `/v1/i/...` paths is redacted.
- **Request ids:** a caller `X-Request-Id` is accepted only if it matches `[A-Za-z0-9._-]{1,128}`; otherwise one is generated.

Error codes: `VALIDATION_ERROR` 400, `INVALID_SIGNATURE` 400 (Stripe webhook only), `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `FEATURE_NOT_IN_PLAN` 403, `PLAN_LIMIT_EXCEEDED` 403, `DEMO_READ_ONLY` 403, `PREVIEW_READ_ONLY` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RSVP_CLOSED` 409, `NOT_PUBLISHED` 409, `SLUG_TAKEN` 409, `STALE_WRITE` 409, `ALREADY_PREMIUM` 409, `MEMORIAL_COMPLIMENTARY` 409, `PAYMENT_NOT_COMPLETED` 409, `QUIET_HOURS` 409, `LINK_REVOKED` 410, `PUBLISH_REQUIREMENTS_NOT_MET` 422, `RATE_LIMITED` 429, `EMAIL_NOT_CONFIGURED` 503, `PAYMENTS_NOT_CONFIGURED` 503, `QUEUE_UNAVAILABLE` 503 (an email campaign could not be queued; repeat the request with the same `Idempotency-Key`), `INTERNAL_ERROR` 500.

## Routes

`src/routers.ts` is the single list of routers. The HTTP app and the OpenAPI generator both mount through it, and `src/contract.routes.test.ts` holds the route table by hand and fails when the two drift.

### System and auth

| Route               | Auth        | Notes                                                                                               |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `GET /health`       | public      | `status: "ok"`, region                                                                              |
| `GET /openapi.json` | public      | OpenAPI 3.1                                                                                         |
| `ALL /api/auth/*`   | Better Auth | sign-up, sign-in, two-factor, sign-out; magic link and password reset only when email is configured |
| `GET /v1/me`        | public      | the signed-in user or `null` (never 401), plus `capabilities` (what this deployment can do)         |

### Events, invitation and plan (`modules/events`, `modules/billing`)

| Route                                             | Permission                 | Notes                                                                                                                                                                                              |
| ------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/events`                                  | session                    | events the caller owns or co-hosts                                                                                                                                                                 |
| `POST /v1/events`                                 | session                    | no `Idempotency-Key` yet (OPS-09); one transaction: event (`DRAFT`), FREE invitation with fresh salt and slug, `OWNER` co-host. The experience mode comes from the occasion and cannot be supplied |
| `GET /v1/events/{eventId}`                        | `event:read`               |                                                                                                                                                                                                    |
| `PATCH /v1/events/{eventId}`                      | `event:update`             | title, start, end, time zone                                                                                                                                                                       |
| `DELETE /v1/events/{eventId}`                     | `event:update`, owner only | soft delete                                                                                                                                                                                        |
| `PATCH /v1/events/{eventId}/invitation`           | `event:update`             | design, content, RSVP settings, well, link words. `expectedUpdatedAt` → `409 STALE_WRITE`. Plan and Memorial Mode rules → `403 FEATURE_NOT_IN_PLAN` / `400`                                        |
| `POST /v1/events/{eventId}/invitation/publish`    | `event:update`             | needs headline, hosts, venue name and a future start (`422 PUBLISH_REQUIREMENTS_NOT_MET`, `details.missing`)                                                                                       |
| `POST /v1/events/{eventId}/invitation/unpublish`  | `event:update`             |                                                                                                                                                                                                    |
| `GET /v1/events/{eventId}/plan`                   | `event:read`               | plan, effective plan (memorial events get Premium free), entitlements, usage, upgrade price                                                                                                        |
| `POST /v1/events/{eventId}/plan/checkout`         | `payment:create`           | real Stripe Checkout; `Idempotency-Key` required                                                                                                                                                   |
| `POST /v1/events/{eventId}/plan/checkout/confirm` | `payment:create`           | applies the upgrade once the session is paid                                                                                                                                                       |
| `POST /v1/webhooks/stripe`                        | Stripe signature           | raw body verified; each event stored once in `WebhookEvent` and applied once                                                                                                                       |

There is no mock payment path. Without a real `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET` for the webhook) these routes answer `503 PAYMENTS_NOT_CONFIGURED` and `GET /v1/me` reports `stripeCheckout: false`. The upgrade (one `Payment`, `Invitation.plan = PREMIUM`, one `AuditLog` entry, in one transaction) is applied by whichever of confirm and the webhook arrives first; the other finds it done.

### Guest micro-site (`modules/guest-site`)

| Route                                         | Notes                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /v1/i/{eventSlug}/{guestToken}/status`   | `{ state: "ACTIVE" }`, or 404 / 410                                                                    |
| `GET /v1/i/{eventSlug}/{guestToken}`          | the guest-safe view: this party only, no token, salt, email, phone or internal id                      |
| `POST /v1/i/{eventSlug}/{guestToken}/rsvp`    | `Idempotency-Key` required; one transaction (below)                                                    |
| `GET /v1/i/{eventSlug}/{guestToken}/passes`   | signed QR passes (`MV1.{passId}.{sig}`) for attending guests; `enabled: false` without the entitlement |
| `GET /v1/i/{eventSlug}/{guestToken}/calendar` | `{ filename, ics }`, one UTC `VEVENT`, no guest name                                                   |
| `POST /v1/i/{eventSlug}/{guestToken}/wishes`  | wishing well or tribute book entry; starts `PENDING`                                                   |
| `GET /v1/public/demos`                        | the published sample invitations                                                                       |
| `POST /v1/public/legacy/resolve`              | old link path → current link, or 404                                                                   |

Every `/v1/i/*` response carries `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`.

The RSVP transaction: validate against the party (own guests only, maybe only if allowed, plus-ones within the seats) → create plus-one guests → upsert one `Rsvp` per guest with health fields encrypted → `ConsentRecord` per guest who shared health information (and for contact details) → sync passes → headcount snapshot. After the commit `headcount.changed` is enqueued; the worker turns it into a `RecommendationSet`. A retry with the same `Idempotency-Key` returns `replayed: true` and writes nothing, so a form needs a new key for a new submission.

Only what the host asked for is stored (`modules/guest-site/minimise.ts`): dietary and allergy fields need `askDietary`, accessibility notes need `askAccessibility`, song requests need a visible song prompt, the message needs `askMessage`, and contact details need `askContact` (off by default). A guest who answers "no" has no health information kept, including anything an earlier "yes" left on file.

### Check-in and well moderation (`modules/checkin`, `modules/well`)

| Route                                                | Permission                            | Notes                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/events/{eventId}/check-in`                  | `checkin:scan` + `qrPassesAndCheckin` | door list with totals; dietary flags only with `health:read`                                                             |
| `POST /v1/events/{eventId}/check-in/scans`           | same                                  | `QR` or `MANUAL`; result `OK`, `DUPLICATE`, `INVALID` or `WRONG_EVENT`; replay by `clientUuid` returns the stored result |
| `GET /v1/events/{eventId}/well-entries?moderation=`  | `media:moderate`                      |                                                                                                                          |
| `PATCH /v1/events/{eventId}/well-entries/{entryId}`  | `media:moderate`                      | approve or reject; only approved wall entries reach guests                                                               |
| `DELETE /v1/events/{eventId}/well-entries/{entryId}` | `media:moderate`                      | soft delete                                                                                                              |

### Guest list, responses and messaging (`modules/guest-list`, `modules/responses`, `modules/messaging`)

| Route                                                                        | Permission                      | Notes                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /v1/events/{eventId}/parties`                                           | `guest:read`                    | filter by `status`, `tag`, `q`; cursor paging                                                  |
| `POST /v1/events/{eventId}/parties`                                          | `guest:write`                   | optional `Idempotency-Key` (200 on replay); FREE cap of 30 guests → `403 PLAN_LIMIT_EXCEEDED`  |
| `PATCH` / `DELETE /v1/events/{eventId}/parties/{partyId}`                    | `guest:write`                   | delete soft-deletes the party, its guests and revokes its passes                               |
| `POST .../parties/{partyId}/revoke-link`, `.../reissue-link`                 | `guest:write`                   | revoke → the link answers 410; reissue → a new token, the old one stays dead                   |
| `POST .../parties/{partyId}/guests`, `PATCH` / `DELETE .../guests/{guestId}` | `guest:write`                   |                                                                                                |
| `PUT .../parties/{partyId}/rsvp`                                             | `rsvp:submit`                   | host enters a reply on a guest's behalf (no health data)                                       |
| `POST /v1/events/{eventId}/guests/import`                                    | `guest:write`                   | CSV text, dry run by default; a commit takes an `Idempotency-Key`                              |
| `GET /v1/events/{eventId}/guests/export.csv?includeHealth=`                  | `guest:read` (+ `health:read`)  | `text/csv` with BOM and CRLF, every cell quoted, formula injection neutralised. Not in OpenAPI |
| `GET /v1/events/{eventId}/responses`                                         | `guest:read`                    | totals, dietary counts, songs, messages, deadline, latest headcount                            |
| `GET /v1/events/{eventId}/responses/dietary`                                 | `health:read`                   | per-guest matrix, decrypted; staff reads are audited                                           |
| `GET /v1/events/{eventId}/messaging`                                         | `guest:read`                    | email status, quota and campaigns                                                              |
| `POST /v1/events/{eventId}/messaging/email-invitations`                      | `guest:write`                   | `Idempotency-Key` required; `202` and a queued campaign                                        |
| `POST /v1/events/{eventId}/messaging/rsvp-reminders`                         | `guest:write` + `rsvpReminders` | 08:00 to 20:00 event time only (`409 QUIET_HOURS`); at most two per address                    |
| `POST /v1/public/unsubscribe`                                                | signed token                    |                                                                                                |

Without `RESEND_API_KEY` the two campaign routes answer `503 EMAIL_NOT_CONFIGURED` and queue nothing.

Host edits that change who is coming take a headcount snapshot and enqueue `headcount.changed`, the same as a guest RSVP.

### CRM (`modules/crm`)

| Route                      | Permission          | Notes                                                                                                  |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| `POST /v1/leads`           | public              | `Idempotency-Key` support, 60/min per IP, `Lead` + `ConsentRecord`, enqueues `lead.created { leadId }` |
| `GET /v1/leads`            | `lead:read` (staff) | stage, search, cursor                                                                                  |
| `GET /v1/leads/{leadId}`   | `lead:read`         |                                                                                                        |
| `PATCH /v1/leads/{leadId}` | `lead:write`        | stage, notes, assignee; the audit entry never contains the notes text                                  |

### Site settings (`modules/site-settings`)

The public contact email and phone shown on www, and where new-enquiry alerts go. One `SiteSetting` row; a column that has never been saved falls back to `CONTACT_EMAIL` / `CONTACT_PHONE` (and `LEAD_NOTIFICATION_EMAIL` for the alert address), then to `appilico.au@gmail.com` and no phone.

| Route                         | Permission                     | Notes                                                                                                                          |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/site-settings`       | public                         | `contactEmail` and `contactPhone` only (never the alert address); `Cache-Control: public, max-age=30`; 60/min per IP           |
| `GET /v1/admin/site-settings` | `site_settings:manage` (staff) | The values in force, whether the alert address is custom, and when staff last saved                                            |
| `PUT /v1/admin/site-settings` | `site_settings:manage`         | Replaces all three values; a blank phone hides it, a blank alert address follows the contact email; audited by field name only |

### Sample invitations

Invitations with `Invitation.isDemo` are read-only: every write, by anyone, answers `403 DEMO_READ_ONLY`.

## Jobs

The API only produces jobs (`lib/queue.ts`, one pg-boss instance per process): `lead.created`, `headcount.changed` (singleton key per snapshot) and `invitation.email_campaign`. A failed enqueue is logged and never fails the request; `apps/worker` consumes them.

## Command-line tools

Run them from the repo root with the environment loaded:

```bash
# Six sample invitations, one per template. Safe to run again: it updates in place.
pnpm with-env pnpm --filter @managevent/api seed:demo

# A staff account with two-factor already enrolled (the API rejects staff without it).
pnpm with-env pnpm --filter @managevent/api staff:create -- \
  --email planner@example.org --name "Planner Name" --role PLANNER_STAFF
```

`staff:create` takes the password from `STAFF_BOOTSTRAP_PASSWORD` (at least 12 characters) or generates one. It prints the password (if generated), the TOTP URI and the backup codes once; add the URI to an authenticator app straight away. `--promote` gives the role to an existing account and REPLACES its credentials: the account gets the password from `STAFF_BOOTSTRAP_PASSWORD` (or a generated one), a new authenticator and new backup codes, and its earlier password, authenticator, sessions and pending sign-in links stop working. Sign-up is open, so whatever an existing account already has may belong to someone other than the person being made staff.

## Tests

Vitest against the real local database (suites skip when it is not reachable). The database is shared: tests create rows with unique ids and remove only those.

- `src/contract.routes.test.ts`: the contract's route table against the OpenAPI document, plus 401 when signed out and 404 for another host on every event route.
- `src/e2e.flow.test.ts`: one wedding from sign-up to check-in through HTTP, with real session cookies.
- `src/modules/*/*.db.test.ts`: each module against the database; `*.test.ts` without `.db` are pure.
- Stripe is exercised with the real SDK over a local transport (`src/test/stripe.ts`); nothing contacts Stripe or Resend.
