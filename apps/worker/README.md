# @managevent/worker

Background worker on Node 22 using `pg-boss`. Rules for changing it are in [`AGENTS.md`](AGENTS.md).

## Registered jobs

- `lead.created` (payload `{ leadId }`): loads the lead, sends the auto-reply to the person who enquired and an alert with the enquiry details to the planner inbox, and records each send as a `Message` row.
- `headcount.changed` (payload `{ eventId, headcountId }`): computes catering, cake, seating, hire and RSA staffing recommendations via `@managevent/logistics` and stores a versioned `RecommendationSet`.
- `invitation.email_campaign` (payload `{ campaignId }`): sends the invitation or RSVP reminder emails of one `Campaign` created by the API, one `Message` row per recipient, then sets the campaign to `SENT`, `PARTIAL` or `FAILED`. If a run dies mid-send the campaign goes back to `QUEUED`, never stays `SENDING`.
- `invitation.email_campaign_sweep` (empty payload, every five minutes): puts campaigns back in the queue that have been `QUEUED` for two minutes or `SENDING` for 35 (their job was lost), and settles as `PARTIAL` or `FAILED` any that are still unfinished after a day. Without it a lost job would leave the campaign's guests marked as emailed, and counted against the plan quota, for good.
- `headcount.changed` writes under the event's headcount lock and only the event's newest snapshot holds the `OPEN` `RecommendationSet`; a job for an older snapshot stores its set as `SUPERSEDED`, whatever order the jobs run in.

Every job has a Zod payload schema, a dedupe key, a retry policy with exponential backoff and a dead-letter queue (`dlq.<job name>`). Handlers are idempotent against the database, so a retried or re-driven job never emails anyone twice.

## Email

There is one email adapter (`src/lib/resend.ts`) and no mock transport.

- With `RESEND_API_KEY` set, email goes through Resend's HTTP API. Each message carries a stable `Idempotency-Key` (`lead-auto-reply:<leadId>`, `lead-planner-alert:<leadId>`, `cmp:<campaignId>:<guestId>`).
- Without `RESEND_API_KEY` nothing is sent and nothing is reported as sent: `lead.created` writes a `Message` row with status `NOT_CONFIGURED`, and `invitation.email_campaign` marks the campaign `FAILED` with no `Message` rows (the API already answers `503 EMAIL_NOT_CONFIGURED` before a campaign is created).
- The planner alert goes to the alert address staff set in the console (`SiteSetting.notificationEmail`), else `LEAD_NOTIFICATION_EMAIL`, else the public contact email (`CONTACT_EMAIL`, else `appilico.au@gmail.com`), so an enquiry always reaches someone. The address is read when the job runs, so a change in the console applies to the next enquiry.
- Senders: `EMAIL_FROM_TRANSACTIONAL` for enquiry emails, `EMAIL_FROM_INVITATIONS` for invitations and reminders (falls back to the transactional sender).
- Invitation and reminder emails contain the party's personal link (`NEXT_PUBLIC_INVITATION_URL/i/{eventSlug}/{token}`) and a signed unsubscribe link (`NEXT_PUBLIC_INVITATION_URL/unsubscribe?t=...`). `GUEST_TOKEN_PEPPER` must be the same value as in the API, because the API verifies the unsubscribe token the worker signs.
- Reminders are never sent before 8am or after 8pm in the event's time zone.
- `Message.to` stores `sha256(lowercased address)`, never the address. Addresses, links and tokens are never logged.

Tests inject a recording adapter or a fake `fetch`; no live service is contacted.

## Queues

- The API is the producer (`apps/api/src/lib/queue.ts`); this process is the only consumer. Both use pg-boss on the application database (schema `pgboss`).
- On start the worker creates each queue and its dead-letter queue, then applies the retry policy with `updateQueue`. That second step matters: when the API has already created the queue by enqueueing first, creating it again changes nothing.
- The in-process dedupe set in `registry.ts` is memory only and is lost on restart. Correctness does not rely on it: every handler checks the database first (`headcount.changed` returns the existing `RecommendationSet` for a snapshot; the email jobs skip recipients that already have a `Message` row).

## Not implemented yet

`startWorker` starts every schedule in `src/schedules.ts` whose job is registered (today: `invitation.email_campaign_sweep`). `retention.cleanup` (remove dietary and allergy data 90 days after the event, PRV-01) and `vendor.compliance_expiry_check` (ADM-04) are declared there but have no job yet, so nothing schedules or runs them. Real RSVPs store encrypted health information, so the retention job is needed before launch. SMS and WhatsApp sends (INV-08) are not built either.

## Environment

`DATABASE_URL`, `PII_ENCRYPTION_KEY`, `GUEST_TOKEN_PEPPER` (same value as the API), `RESEND_API_KEY`, `EMAIL_FROM_TRANSACTIONAL`, `EMAIL_FROM_INVITATIONS`, `LEAD_NOTIFICATION_EMAIL`, `CONTACT_EMAIL`, `NEXT_PUBLIC_INVITATION_URL`, `NEXT_PUBLIC_ADMIN_URL`. `NEXT_PUBLIC_ADMIN_URL` is the base of the "open this enquiry" link in the planner alert (`<base>/leads/<leadId>`); the staff console lives at `/admin` on www, which is also the local default. Production sets `https://www.managevent.com.au/admin`. `RESEND_DOMAIN_VERIFIED` is no longer read: setting `RESEND_API_KEY` is what turns sending on.

## Running locally

From the repo root, with the local database running (`pnpm db:local:detach`):

```bash
pnpm with-env pnpm --filter @managevent/worker start   # or `dev` to restart on changes
pnpm with-env pnpm --filter @managevent/worker test
```

On start it logs one line with the registered jobs and `emailConfigured`. To see the RSVP bridge end to end, run the API and the worker together and submit an RSVP through a guest link: the API stores an `EventHeadcount` snapshot and enqueues `headcount.changed`, and within a few seconds the worker writes a `RecommendationSet` with `basedOnHeadcountId` set to that snapshot.
