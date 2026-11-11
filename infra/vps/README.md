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
export COMPOSE_PARALLEL_LIMIT=1
# Build one service at a time. The 2 GB host cannot run parallel Next.js builds.
docker compose build api && docker compose build worker \
  && docker compose build marketing && docker compose build invitation
docker compose run --rm migrate
docker compose run --rm seed
docker compose up -d
```

Never start a second build while one is running (check `ps aux | grep "docker compose"` first). `COMPOSE_PARALLEL_LIMIT=1` makes Compose build and start at most one service at a time, which avoids out-of-memory stalls on this plan. The memory limits in `docker-compose.yml` are unchanged. Plan size is DECISION-NEEDED.

The apex `managevent.com.au` permanently redirects to `https://www.managevent.com.au`. Its DNS A record must point at this server for Caddy to issue a certificate.

`marketing` and `invitation` wait for `api` to be healthy (`/health`). They have no healthcheck of their own because no health endpoint is confirmed for them.

## Secrets

`infra/vps/.env` (mode `0600`, gitignored) holds `POSTGRES_PASSWORD`, `PII_ENCRYPTION_KEY`, and `BETTER_AUTH_SECRET`.
