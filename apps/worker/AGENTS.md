# AGENTS.md: apps/worker

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Background worker (internal, no HTTP port)**

The only consumer of the pg-boss queues the API produces. Registered jobs: `lead.created`, `headcount.changed` (→ `RecommendationSet`), `invitation.email_campaign` and the scheduled `invitation.email_campaign_sweep`. What each does is in [`README.md`](README.md).

- **Open backlog:** PRV-01 (the `retention.cleanup` job), ADM-04 (a handler for `vendor.compliance_expiry_check`), and the send jobs of INV-08 (SMS and WhatsApp). See [`ROADMAP.md`](../../ROADMAP.md).
- **Planned, not built:** retention and deletion, SMS and WhatsApp sends, media processing (INV-11), AI jobs (INV-04), Xero sync and payout release (ADM-06), document expiry alerts (ADM-04), event pack generation (MOB-03, WIN-05).

## Specification

`ARCHITECTURE.md` §§6, 9–11; the retention schedule in `packages/db/DATA_MODEL.md`.

## Stack

Node 22, pg-boss on the application database, `tsx` to run TypeScript directly.

## Depends on (contracts; do not modify from this app)

Today: `db`, `validators`, `logistics`, `i18n`, `config`. Planned jobs will add `notifications`, `storage`, `payments`, `integrations` and `ai`.

## Layout

```text
src/
  index.ts            # startWorker(): create queues, register jobs, start schedules
  registry.ts         # WorkerJobRegistry: queue + dead-letter queue, retry policy, in-process dedupe
  schedules.ts        # cron definitions (Australia/Perth)
  jobs/<job>.ts       # one file per job: name, Zod payload schema, dedupe key, retry policy, handler
  lib/                # resend.ts (the one email adapter), unsubscribe-token.ts, format.ts
  test/db.ts          # test-only database helpers
```

## Rules specific to this app

- Every job has a Zod payload schema, is **idempotent against the database**, and declares a dedupe key. The in-process dedupe set is a convenience, never the guarantee.
- Retries use exponential backoff; jobs that exhaust them go to `dlq.<job name>`. Showing dead letters to staff is not built yet.
- Quiet hours: reminder and marketing sends only between 8am and 8pm in the event's (recipient's) time zone.
- Retention jobs run nightly and log counts, not contents.
- No mock transports: without `RESEND_API_KEY` nothing is sent and nothing is reported as sent.

## Environment variables

Listed in [`README.md`](README.md#environment); the names are in the root `.env.example`.

## Tests required

Vitest per job against the local PostgreSQL, with an injected email adapter or `fetch`. An integration test for `headcount.changed` → `RecommendationSet`.

## Status

Built and running locally: the four jobs above. Not deployed from this branch yet (OPS-01); email has never been sent through a live Resend account (OPS-02). `retention.cleanup` and `vendor.compliance_expiry_check` are declared in `src/schedules.ts` with no handler, so they never run (PRV-01, ADM-04).
