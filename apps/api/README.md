# @managevent/api

Hono REST API on Node 22 (`api.managevent.com.au`, local port `4000`).

The **only** writer to the database and the single authorisation layer for web, mobile and desktop. It also hosts webhooks (Stripe, Twilio, Resend) and AI endpoints (proxying `packages/ai`).

## Endpoints (Phase 0)

- `GET /health`: Health check (`status: "ok"`, region `syd`).
- `ALL /api/auth/*`: Self-hosted Better Auth mount (`ADR-0005`).
- `POST /v1/leads`: Zod validation, Farsi normalisation, `Idempotency-Key` support, rate limiting, `Lead` + `ConsentRecord` persistence, and `lead.created` job enqueueing.
- `GET /v1/leads`: Staff CRM lead list (`requirePermission(actor, "lead:read")`).
- `GET /openapi.json`: Generated OpenAPI 3.1 document.

## Running locally

Step 2 hardening: Better Auth uses the Prisma adapter. Private routes resolve
roles from the database after session verification, never from arbitrary role
headers. Staff/admin access requires enabled two-factor authentication. Production
requires an explicit Better Auth secret; internal errors do not expose raw messages.
CORS allows only the primary www origin. Public enquiry submission is rate-limited.
Fly's release command runs migrations through Supabase session pooling.

```bash
pnpm --filter @managevent/api dev
```
