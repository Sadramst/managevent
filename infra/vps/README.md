# Managevent on a single Sydney VPS

Deployed and verified: **2026-11-11**.

| Item | Value |
| --- | --- |
| Provider / region | Vultr `syd` (Sydney, AU) — satisfies the `ap-southeast-2` PII rule |
| Plan | `vc2-1c-2gb` — 1 vCPU, 2 GB RAM, 55 GB SSD, plus a 5 GB swapfile |
| Host | `managevent-prod` (`managevent-api`), Ubuntu 24.04 |
| Public IP | `139.180.163.128` |
| Hostname | `api.managevent.com.au` (**DNS record still required**) |
| Path | `/opt/managevent` |

## What runs

| Container | Role | Exposure |
| --- | --- | --- |
| `managevent-db-1` | PostgreSQL 16 | internal only |
| `managevent-api-1` | Hono API on :4000 | via Caddy only |
| `managevent-worker-1` | pg-boss consumer (`lead.created`, `headcount.changed`) | none |
| `managevent-caddy-1` | TLS termination + reverse proxy | 80, 443 |

Only 22, 80 and 443 are reachable through UFW. Postgres and the API are never published.

## Required DNS record

At VentraIP **VIPcontrol** → Domains → `managevent.com.au` → DNS:

| Type | Name / Host | Value | TTL |
| --- | --- | --- | --- |
| `A` | `api` | `139.180.163.128` | `300` |

Once that resolves, Caddy issues the Let's Encrypt/ZeroSSL certificate automatically — no
restart needed. ACME account contact is currently `admin@managevent.com.au`.

## Updating the deployment

```bash
cd /opt/managevent
git pull
cd infra/vps
docker compose build
docker compose run --rm migrate   # only when packages/db/prisma/migrations changed
docker compose up -d
```

## Secrets

`infra/vps/.env` (mode `0600`, gitignored) holds `POSTGRES_PASSWORD`,
`PII_ENCRYPTION_KEY` and `BETTER_AUTH_SECRET`. Generate the last two with
`node scripts/generate-deployment-secrets.mjs`. Back this file up somewhere safe and
outside git: losing `PII_ENCRYPTION_KEY` makes encrypted guest health data unrecoverable.

## Known gaps

- The worker uses `MockSafeResendAdapter`, so **no email is actually sent**. A real Resend
  adapter must be wired before launch.
- `apps/invitation` and `apps/marketing` are not scaffolded, so there is nothing to deploy
  to Vercel yet.
- `www.managevent.com.au` still points at `103.42.108.46`, unrelated to this stack.
