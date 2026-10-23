# Production Deploy Runbook

Status: configuration prepared; production is **not yet deployed or verified**.
Run all commands from the repository root. Never paste secrets into chat, source
files, command arguments recorded in chat, or Git. Enter them only in provider
secret prompts or a private local terminal session.

## Services

| Service            | Provider                    | Region                       | Configuration                                    |
| ------------------ | --------------------------- | ---------------------------- | ------------------------------------------------ |
| Database and queue | Supabase PostgreSQL         | Sydney, ap-southeast-2       | Session pooler for DATABASE_URL and DIRECT_URL   |
| API                | Fly, managevent-api         | syd                          | apps/api/fly.toml; always at least one machine   |
| Worker             | Fly, managevent-worker      | syd                          | apps/worker/fly.toml; no public service or ports |
| Marketing          | Vercel, root apps/marketing | syd1                         | Production branch main; automatic PR previews    |
| Email              | Resend                      | Disclosed offshore processor | Verify managevent.com.au before any send         |

## Environment Variable Names (No Values)

- API: DATABASE_URL, DIRECT_URL, PII_ENCRYPTION_KEY, BETTER_AUTH_SECRET, BETTER_AUTH_URL, AUTH_COOKIE_DOMAIN, APP_ENV, NODE_ENV, PORT, TZ.
- Worker: DATABASE_URL, DIRECT_URL, PII_ENCRYPTION_KEY, RESEND_API_KEY, RESEND_DOMAIN_VERIFIED, EMAIL_FROM_TRANSACTIONAL, LEAD_NOTIFICATION_EMAIL, APP_ENV, NODE_ENV, TZ.
- Marketing: API_URL, CONTACT_EMAIL, CONTACT_PHONE, VERCEL_ENV (provider-managed), NEXT_TELEMETRY_DISABLED.
- GitHub production deployment: FLY_API_TOKEN repository secret, added by the owner, never committed.

Configure sender hello@managevent.com.au and the owner's confirmed lead inbox in
the worker environment. Both remain editable without source changes. Keep
RESEND_DOMAIN_VERIFIED false until the owner confirms DNS changes and Resend
reports the domain verified. Never exercise a live email send before then.

## Owner Authentication And Secrets

Install official Fly and Vercel CLIs, then authenticate interactively:

```sh
fly auth login
vercel login
gh auth login
```

Create Supabase in Sydney and copy the **session-mode pooler** connection string
directly into provider secret storage. Do not use the transaction-mode URL.
Supply the same session URL for both database variables. With a valid key and
connection strings already held in private shell variables, the owner can run:

```powershell
fly secrets set --app managevent-api "DATABASE_URL=$env:DATABASE_URL" "DIRECT_URL=$env:DIRECT_URL" "PII_ENCRYPTION_KEY=$env:PII_ENCRYPTION_KEY" "BETTER_AUTH_SECRET=$env:BETTER_AUTH_SECRET"
fly secrets set --app managevent-worker "DATABASE_URL=$env:DATABASE_URL" "DIRECT_URL=$env:DIRECT_URL" "PII_ENCRYPTION_KEY=$env:PII_ENCRYPTION_KEY" "RESEND_API_KEY=$env:RESEND_API_KEY"
gh secret set FLY_API_TOKEN
vercel env add API_URL production
vercel env add CONTACT_EMAIL production
vercel env add CONTACT_PHONE production
```

`gh secret set` and `vercel env add` prompt privately. Never send the entered values
to an agent. Set the API auth URL and cookie domain, sender, lead notification
address and email-verification gate in the provider dashboard or private terminal.
Use separate preview configuration; previews must not send to production recipients.

## Provisioning And Deploy

```sh
fly apps create managevent-api
fly apps create managevent-worker
fly deploy --remote-only --config apps/api/fly.toml
fly scale count 1 --app managevent-api
fly deploy --remote-only --config apps/worker/fly.toml
fly scale count 1 --app managevent-worker
fly certs add api.managevent.com.au --app managevent-api
fly ips list --app managevent-api
fly certs show api.managevent.com.au --app managevent-api
```

The API release command runs migrations before switching traffic. Do not expose
the worker with an HTTP service. Inspect machine state with `fly status --app`
for each app. Docker builds have not been executed locally because Docker is
unavailable; verify the remote build before claiming success.

In Vercel import the GitHub repository, select root `apps/marketing`, framework
Next.js, install from the pnpm workspace root, and production branch `main`.
Use `pnpm --filter @managevent/marketing build` as the build command. Enable files
outside the root directory so workspace packages and `/content` are included.
Add www.managevent.com.au as primary; configure managevent.com.au as a **301**
redirect to www. PR previews are staging for now. Verify X-Robots-Tag and robots
metadata in a real preview before approving launch.

## DNS Handoff

Do not add guessed Vercel IPs, Fly IPs, Resend DKIM, SPF or ownership records.
Obtain the exact values from Vercel's domain configuration, `fly ips list` /
`fly certs show`, and Resend's domain screen. Build **one** registrar table with
Type, Name, Value, TTL and Provider. Include DMARC at `_dmarc` with `v=DMARC1; p=none`.
Inspect any existing SPF/DMARC records before changing them; never publish two SPF
records at the same name. Include any provider-requested ownership records.
Wait for the owner's explicit confirmation before DNS/certificate verification.
No provider-specific records have been obtained in this session.

## Migration And Catalogue Seed

Back up the database first. Use session pooling for migrations and queue traffic.
For existing RSVP records the new health migration refuses rows missing ciphertext;
backfill with the application's original v1 key before retrying. Never edit a
merged migration or discard existing health values to force deployment.

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:drift-check
pnpm db:seed
```

Run against production only from a private terminal with the production variables
set. The seed loads only catalogue ceremonies, Perth placeholder venues, packages,
price-list metadata and invoice sequence. It never seeds test leads. Existing
seeds preserve IDs and invoice sequence. Keep the Builder unpublished.

## Verification

After DNS confirmation, verify HTTPS, apex 301 redirect, EN and FA pages, `/health`,
the Sydney runtime and Resend domain status. Only after Resend is verified, submit
one clearly labelled real test enquiry from the live site and confirm the row,
queue completion, notification receipt and translated auto-reply receipt. Do not
log request bodies, recipient addresses, or email contents during verification.

## View Leads In Supabase SQL Editor

Use the authenticated dashboard, not a public SQL endpoint. Treat the result as
personal information, with staff access only:

```sql
SELECT id, "createdAt", stage, source, name, email, phone,
       "preferredLanguage", "ceremonySlug", "eventDate", "guestEstimate", message
FROM "Lead"
WHERE "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 50;
```

## Rollback

```sh
fly releases --app managevent-api
fly releases --app managevent-worker
fly deploy --app managevent-api --config apps/api/fly.toml --image <previous-image-reference>
fly deploy --app managevent-worker --config apps/worker/fly.toml --image <previous-image-reference>
vercel rollback <previous-production-deployment-url>
```

Do not run an old application image incompatible with the encrypted-only schema.
Use a forward migration for database repairs; destructive columns cannot be
restored by rolling back an image. Restore a verified backup only under an agreed
incident procedure, accounting for writes after the backup. Fly logs may be read
with `fly logs --app managevent-api` and `fly logs --app managevent-worker`; never
print provider secrets or full connection strings.

## Cost Planning

Budget in USD before tax, currency conversion and usage: two always-on shared Fly
machines roughly $10-20/month combined, Supabase Pro about $25/month, Vercel Pro
about $20/member/month for commercial use, Resend $0 within free transactional
limits or roughly $20/month for Pro. Indicative total $55-85/month for one Vercel
member. These are planning estimates, not verified current provider quotes. Confirm
plans, backups, bandwidth and regional rates in the billing dashboards before provisioning.
