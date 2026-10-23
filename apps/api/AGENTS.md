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

## Proposed layout

```text
src/
  index.ts                      # app bootstrap
  middleware/                   # request id, logging with redaction, auth, rate limit, locale, errors
  modules/<module>/             # identity, catalog, builder, crm, events, invitations, orders,
    routes.ts service.ts        # payments, marketplace, inventory, checkin, messaging, ai, reporting
    repo.ts  *.test.ts
  webhooks/(stripe|twilio|resend).ts
  openapi.ts
Dockerfile  fly.toml (D-01)
```

## Rules specific to this app

- Route = Zod-validated input → `requirePermission()` from `packages/auth` → service → repository (Prisma). No Prisma calls in route handlers.
- Errors use one error model: `{ error: { code, message, details?, requestId } }`. The message is localised by the client using the code.
- Idempotency: `Idempotency-Key` is supported on POSTs that create money or RSVP records.
- Public guest endpoints are authenticated by invitation token and rate-limited per IP and per token.
- Webhooks: verify signatures, store the raw event, dedupe by provider event id.
- Never log request bodies on guest, RSVP, auth or payment routes.
- Every DB transaction that changes money also writes an `AuditLog` row.

## Environment variables

DATABASE_URL, DIRECT_URL, BETTER_AUTH__, AUTH_COOKIE_DOMAIN, GUEST_TOKEN_PEPPER, PII_ENCRYPTION_KEY, STRIPE__, RESEND__, TWILIO__, R2__, GEMINI__, ABN_LOOKUP_GUID, XERO_*. The names are listed in the root `.env.example`.

## Tests required

Vitest with a Postgres test container. Contract tests: responses validated against the Zod output schemas. Webhook signature tests.

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
