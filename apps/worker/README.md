# @managevent/worker

Background worker on Node 22 using `pg-boss`.

## Registered Jobs (Phase 0)

- `lead.created`: Sends localised (`en`/`fa`) auto-reply email to the lead and alerts planners, persisting an idempotent `Message` record.
- `headcount.changed`: Computes catering, cake, seating, hire and RSA staffing recommendations via `@managevent/logistics` and stores a versioned `RecommendationSet`.

## Running locally

In production, `lead.created` uses Resend rather than the local mock. Configure
`RESEND_API_KEY`, `EMAIL_FROM_TRANSACTIONAL`, and `LEAD_NOTIFICATION_EMAIL` in Fly
secret/config storage. The sender is hello@managevent.com.au and the notification
inbox is the owner's confirmed address. Set `RESEND_DOMAIN_VERIFIED` only after
Resend confirms domain verification and the owner has confirmed DNS changes.
Until then the adapter fails without making a network request. Auto-reply and
planner alert use separate stable provider idempotency keys. Tests always inject
mock transports; no live service is contacted. See the deployment runbook for
the remaining provider setup and live delivery checks.

```bash
pnpm --filter @managevent/worker dev
```
