# Managevent Production Stack on Dedicated Sydney VPS (`syd`)

| Item              | Value                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| Provider / region | Vultr `syd` (Sydney, AU) — satisfies the `ap-southeast-2` PII rule               |
| Plan              | `vc2-1c-2gb` — 1 vCPU, 2 GB RAM, 55 GB SSD, plus a 5 GB swapfile                 |
| Host              | `managevent-prod` (`managevent-api`), Ubuntu 24.04                               |
| Public IP         | `139.180.163.128`                                                                |
| Hostnames         | `www.managevent.com.au`, `invitation.managevent.com.au`, `api.managevent.com.au` |
| Path              | `/opt/managevent`                                                                |

## What runs

| Container                 | Role                                                                                       | Exposure       |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------- |
| `managevent-db-1`         | PostgreSQL 16 (`managevent`)                                                               | internal only  |
| `managevent-api-1`        | Hono API on `:4000` (`api.managevent.com.au`)                                              | via Caddy only |
| `managevent-worker-1`     | `pg-boss` consumer (`lead.created`, `headcount.changed`)                                   | none           |
| `managevent-marketing-1`  | Next.js Marketing + `/admin` Command Centre on `:3100` (`www.managevent.com.au`)           | via Caddy only |
| `managevent-invitation-1` | Next.js Invitations Studio + Guest Micro-sites on `:3001` (`invitation.managevent.com.au`) | via Caddy only |
| `managevent-caddy-1`      | Automatic TLS termination + reverse proxy                                                  | 80, 443        |

Only ports 22, 80 and 443 are reachable through UFW. Postgres and internal app ports are never exposed directly.

## Updating the deployment

```bash
cd /opt/managevent
git pull
cd infra/vps
docker compose build
docker compose run --rm migrate
docker compose run --rm seed
docker compose up -d
```

## Secrets

`infra/vps/.env` (mode `0600`, gitignored) holds `POSTGRES_PASSWORD`, `PII_ENCRYPTION_KEY`, and `BETTER_AUTH_SECRET`.
