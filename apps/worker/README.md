# @managevent/worker

Background worker on Node 22 using `pg-boss`.

## Registered Jobs (Phase 0)

- `lead.created`: Sends localised (`en`/`fa`) auto-reply email to the lead and alerts planners, persisting an idempotent `Message` record.
- `headcount.changed`: Computes catering, cake, seating, hire and RSA staffing recommendations via `@managevent/logistics` and stores a versioned `RecommendationSet`.

## Running locally

```bash
pnpm --filter @managevent/worker dev
```
