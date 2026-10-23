# AGENTS.md: apps/worker

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Background worker**

- **Domain:** (internal)
- **Phase:** Phase 0 onward. **Backlog:** FND-12, then per-feature jobs (see `ROADMAP.md`)

Async and scheduled jobs: emails, SMS and WhatsApp sends, RSVP reminders, `headcount.changed` → recommendations, media processing (resize, EXIF strip, transcode, blurhash), AI jobs, Xero sync, payout release, retention and deletion, document expiry alerts, event pack generation.

## Specification

ARCHITECTURE §§6, 9–11, `packages/db/DATA_MODEL.md` retention schedule.

## Stack

Node 22, pg-boss, shared packages.

## Depends on (contracts; do not modify from this app)

`db`, `validators`, `notifications`, `storage`, `logistics`, `payments`, `integrations`, `ai`, `config`

## Proposed layout

```text
src/
  index.ts            # boot, register jobs, schedules
  jobs/<job-name>.ts  # one file per job; exports name, schema (Zod), handler, retry policy
  schedules.ts        # cron (in Australia/Perth time where business-facing)
```

## Rules specific to this app

- Every job has a Zod payload schema, is **idempotent**, and declares a dedupe key.
- Retries use exponential backoff. Failures that need a human go to a dead-letter queue, which is visible in admin.
- Quiet hours: marketing and reminder sends only between 8am and 8pm in the recipient's time zone.
- Retention jobs run nightly and log counts, not contents.

## Environment variables

Same as apps/api (subset). The names are listed in the root `.env.example`.

## Tests required

Vitest per job with fixtures. An integration test for `headcount.changed` → `RecommendationSet`.

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
