# AGENTS.md: apps/api

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Backend API: api.managevent.com.au**

- **Domain:** api.managevent.com.au
- **Local port:** 4000
- **Phase:** Phase 0 onward. **Backlog:** FND-11, then every feature's API tasks (see `ROADMAP.md`)

The **only** writer to the database and the single authorisation layer for web, mobile and desktop. It also hosts webhooks (Stripe, Twilio, Resend) and AI endpoints (proxying `packages/ai`).

## Specification

ARCHITECTURE §§3, 5–12, `packages/db/DATA_MODEL.md`, ADR-0003 to 0009.

## Stack

Hono on Node 22, Zod (`packages/validators`), OpenAPI generated from Zod, Prisma (`packages/db`), Better Auth (`packages/auth`), pg-boss producer.

## Depends on (contracts; do not modify from this app)

`db`, `validators`, `types`, `auth`, `payments`, `pricing`, `logistics`, `notifications`, `storage`, `integrations`, `ai`, `config`

## Layout

```text
src/
  index.ts                      # process entry (serve on PORT)
  app.ts                        # createApiApp: middleware, Better Auth mount, routers
  routers.ts                    # THE list of routers; app.ts and openapi.ts both mount through it
  openapi.ts                    # generateOpenApiSpec()
  middleware/context.ts         # request id, redacted logging, actor, origin guard, error envelope
  lib/                          # deps, access (requireEventAccess), audit, auth, queue, rate-limit,
                                # guest-tokens, time, localized, email, env, errors, router
  modules/<module>/             # identity, events, billing, guest-site, headcount, checkin, well,
    routes.ts service.ts        # guest-list, responses, messaging, crm
    repo.ts  *.test.ts          # *.db.test.ts need the database; *.test.ts are pure
  webhooks/stripe.ts
  cli/                          # seed-demo.ts, create-staff.ts
  test/                         # test-only helpers (db, hosts, stripe transport)
  contract.routes.test.ts       # the route table below, checked against OpenAPI and authorisation
  e2e.flow.test.ts              # sign-up to check-in through HTTP on the real database
Dockerfile  fly.toml (D-01)
```

Not built yet: catalog, builder, orders, marketplace, inventory, ai, reporting, and the Twilio and Resend webhooks.

## Rules specific to this app

- Route = Zod-validated input → `requirePermission()` from `packages/auth` → service → repository (Prisma). No Prisma calls in route handlers.
- Errors use one error model: `{ error: { code, message, details?, requestId } }`. The message is localised by the client using the code.
- Idempotency: `Idempotency-Key` is supported on POSTs that create money or RSVP records.
- Public guest endpoints are authenticated by invitation token and rate-limited per IP and per token.
- Webhooks: verify signatures, store the raw event, dedupe by provider event id.
- Never log request bodies on guest, RSVP, auth or payment routes.
- Every DB transaction that changes money also writes an `AuditLog` row.
- An event the caller may not read is `404 NOT_FOUND`, never `403`. Use `requireEventAccess` for every `/v1/events/{eventId}/...` route.
- A guest link is matched exactly against the stored token. Unknown is `404`, revoked is `410 LINK_REVOKED`. No prefix or fallback matching.
- A guest view never contains another party, the token, an email, a phone, the salt, or an event, invitation or party id.
- Store only what the host's RSVP settings ask for (`modules/guest-site/minimise.ts`). Health fields are written with `encryptRsvpWriteData` and read with `decryptRsvpRecord` on nested rows.
- No mock providers in production paths. Without Stripe or Resend credentials the route answers `503 PAYMENTS_NOT_CONFIGURED` or `503 EMAIL_NOT_CONFIGURED`.
- Writes to a sample invitation (`Invitation.isDemo`) answer `403 DEMO_READ_ONLY`.
- A new, renamed or removed route changes three things together: the router, the list in `src/contract.routes.test.ts`, and `packages/api-client/src/generated.ts` (`pnpm --filter @managevent/api-client generate`).
- The local database is shared. Tests create rows with unique ids and delete only those; never truncate or reset.
- The client address comes from `clientIp(c)` (`lib/client-ip.ts`), never from `x-forwarded-for` or any other header read directly.
- A `roster`-scope grant (door crew) is accepted only by the check-in module (`allowRosterScope`). Host services use `requireEventAccess` without it, and `checkHostPermission` / `requireHostPermission` for any further permission.
- A guest link token is a credential: return it only to callers with `guest:write`.
- Counts that must hold under concurrency are checked under a lock: host edits of one party take the invitation lock, then the party lock (`guest-list/repo.ts`); the guest's own RSVP and wishes take the party lock.

## Environment variables

`DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_COOKIE_DOMAIN`, `AUTH_TRUSTED_ORIGINS`, `GUEST_TOKEN_PEPPER`, `PII_ENCRYPTION_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM_TRANSACTIONAL`, `API_PROXY_SECRET` (shared with the web apps), `TRUSTED_CLIENT_IP_HEADER` (`fly-client-ip` on Fly), and the `NEXT_PUBLIC_..._URL` origins of the web apps. Reserved for modules not built yet: the `TWILIO_`, `R2_`, `GEMINI_` and `XERO_` groups and `ABN_LOOKUP_GUID`. The names are listed in the root `.env.example`. A variable a turbo task needs must also be in `globalEnv` in `turbo.json`.

## Tests required

Vitest against a real PostgreSQL (locally `pnpm db:local:detach`; suites skip with `describe.skipIf(!dbAvailable)` when it is not reachable). Contract tests: responses validated against the Zod output schemas. Webhook signature tests.

## Routes

All JSON routes are in the OpenAPI document (`GET /openapi.json`). Details are in `README.md`.

| Area                                      | Routes                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| System                                    | `GET /health`, `GET /openapi.json`, `ALL /api/auth/*` (Better Auth)                                                                                                                                                                                                                                                                                                      |
| Identity                                  | `GET /v1/me`                                                                                                                                                                                                                                                                                                                                                             |
| Events                                    | `GET` `POST /v1/events`; `GET` `PATCH` `DELETE /v1/events/{eventId}`                                                                                                                                                                                                                                                                                                     |
| Invitation                                | `PATCH /v1/events/{eventId}/invitation`; `POST .../invitation/publish`; `POST .../invitation/unpublish`                                                                                                                                                                                                                                                                  |
| Plan and billing                          | `GET /v1/events/{eventId}/plan`; `POST .../plan/checkout`; `POST .../plan/checkout/confirm`; `POST /v1/webhooks/stripe`                                                                                                                                                                                                                                                  |
| Guest micro-site (link is the credential) | `GET /v1/i/{eventSlug}/{guestToken}`; `GET .../status`; `POST .../rsvp`; `GET .../passes`; `GET .../calendar`; `POST .../wishes`                                                                                                                                                                                                                                         |
| Public                                    | `GET /v1/public/demos`; `POST /v1/public/legacy/resolve`; `POST /v1/public/unsubscribe`                                                                                                                                                                                                                                                                                  |
| Check-in                                  | `GET /v1/events/{eventId}/check-in`; `POST .../check-in/scans`                                                                                                                                                                                                                                                                                                           |
| Well                                      | `GET /v1/events/{eventId}/well-entries`; `PATCH` `DELETE .../well-entries/{entryId}`                                                                                                                                                                                                                                                                                     |
| Guest list                                | `GET` `POST /v1/events/{eventId}/parties`; `PATCH` `DELETE .../parties/{partyId}`; `POST .../parties/{partyId}/revoke-link`; `POST .../reissue-link`; `POST .../parties/{partyId}/guests`; `PATCH` `DELETE .../guests/{guestId}`; `PUT .../parties/{partyId}/rsvp`; `POST /v1/events/{eventId}/guests/import`; `GET .../guests/export.csv` (plain route, not in OpenAPI) |
| Responses                                 | `GET /v1/events/{eventId}/responses`; `GET .../responses/dietary`                                                                                                                                                                                                                                                                                                        |
| Messaging                                 | `GET /v1/events/{eventId}/messaging`; `POST .../messaging/email-invitations`; `POST .../messaging/rsvp-reminders`                                                                                                                                                                                                                                                        |
| CRM                                       | `POST /v1/leads` (public); `GET /v1/leads`; `GET` `PATCH /v1/leads/{leadId}` (staff)                                                                                                                                                                                                                                                                                     |

There is no `/v1/invitations` or `/v1/rsvp`: the invitation hangs off its event, and guests reply through their link.

## Status

✅ Invitation platform backend built: 48 OpenAPI operations plus the CSV export, Better Auth sessions, pg-boss producer, demo seed and staff bootstrap tools, Dockerfile and `fly.toml` targeting `syd`. Not yet exercised against live Stripe or Resend (no keys locally).
