# Deployment

How Managevent is actually deployed today, and how to repeat or repair it.

**Status:** API + worker + PostgreSQL are live on a single Sydney VPS, and
`www.managevent.com.au` and `invitation.managevent.com.au` serve branded static pages from
the same box. Those static pages are a **holding page and invitation teaser**, not the real
product: `apps/marketing` and `apps/invitation` are still `"status": "not-scaffolded"`, so
no Vercel project exists and none can be deployed yet.

| Item                | Value                                                          |
| ------------------- | -------------------------------------------------------------- |
| Provider / region   | Vultr `syd` — Sydney, NSW, AU (`ap-southeast-2` equivalent)    |
| Plan                | `vc2-1c-2gb` — 1 vCPU, 2 GB RAM, 55 GB SSD, 5 GB swap          |
| Host                | `managevent-prod` (`managevent-api`), Ubuntu 24.04             |
| Public IP           | `139.180.163.128`                                              |
| API hostname        | `api.managevent.com.au` (live, Let's Encrypt)                  |
| Marketing hostname  | `www.managevent.com.au` (static page, Let's Encrypt)           |
| Invitation hostname | `invitation.managevent.com.au` (static page, ZeroSSL)          |
| Repo on server      | `/opt/managevent`                                              |
| Stack definition    | [`infra/vps/docker-compose.yml`](infra/vps/docker-compose.yml) |
| Operator runbook    | [`infra/vps/README.md`](infra/vps/README.md)                   |

## Architecture

```text
Internet :80/:443
      │
   ┌──▼─────┐   automatic TLS
   │ caddy  │   (Let's Encrypt for api/www, ZeroSSL for invitation)
   └──┬──┬──┘
      │  │
      │  └──▶ /srv/www, /srv/invitation  (static pages, read-only mount)
      │
      │ http://api:4000   (never published to the host)
   ┌──▼─────┐        ┌──────────┐
   │  api   │───────▶│ postgres │  internal network only
   └────────┘        └────┬─────┘
   ┌──────────┐           │
   │  worker  │───────────┘
   └──────────┘
```

Only **22, 80 and 443** are open in UFW. PostgreSQL and the API have no host port
mapping, so they are unreachable from outside the Docker network.

## Why a VPS instead of Vercel + Fly.io

The original plan targeted Vercel (web), Fly.io (API/worker) and Supabase (Postgres).
Current reality:

- `apps/marketing` and `apps/invitation` contain only docs and a placeholder
  `package.json` (`"status": "not-scaffolded"`) — there is nothing to build.
- Supabase and Fly.io both require account provisioning and a card, and Fly needs an
  interactive `auth login`.
- The VPS is already in Sydney, so the Australian Privacy Act requirement that PII stays
  in Australia is satisfied without a managed database provider.

Hostinger was evaluated and rejected: its **VPS** data centres are Europe, Asia
(Singapore and others), North America and Brazil — **no Australia**. Sydney appears only
in their CDN, which stores nothing.

## DNS

At VentraIP VIPcontrol → Domains → `managevent.com.au` → DNS:

| Type | Name         | Value             | TTL   |
| ---- | ------------ | ----------------- | ----- |
| `A`  | `api`        | `139.180.163.128` | 3600  |
| `A`  | `www`        | `139.180.163.128` | 14400 |
| `A`  | `invitation` | `139.180.163.128` | 3600  |

The apex (`managevent.com.au`) still points at `103.42.108.46`; leave it alone until a
real marketing app replaces the holding page and a redirect decision is made.

`www` previously pointed at `103.42.108.46` with a 4-hour TTL, so browsers that visited the
old site can keep loading it for hours after the record changes. Flush the client cache
(`ipconfig /flushdns`, or test in a private window) before concluding DNS is wrong.

## Static pages

`www` and `invitation` are plain HTML served by Caddy from `infra/vps/static/`, mounted
read-only into the container at `/srv`. Edit the files there and they are live on the next
request — no rebuild needed.

`invitation` is deliberately pinned to **ZeroSSL's ACME endpoint** in the Caddyfile. Let's
Encrypt cached a negative (NXDOMAIN) answer for that name before the DNS record existed,
which blocks LE issuance for roughly an hour; ZeroSSL had no such cache and issued
immediately. Do not remove that `tls` block without re-checking issuance.

## First-time provisioning

Performed once; kept here so the environment is reproducible.

```bash
# 1. Create the instance (Vultr API or dashboard): Sydney, Ubuntu 24.04, 2 GB,
#    with the deployment SSH public key installed.

# 2. Base system
apt-get update && apt-get install -y docker.io docker-compose-v2 git ufw curl
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
ufw default deny incoming && ufw allow 22,80,443/tcp && ufw --force enable

# 3. Code and secrets
git clone https://github.com/Sadramst/managevent.git /opt/managevent
cd /opt/managevent
node scripts/generate-deployment-secrets.mjs --out /tmp/secrets.env   # never commit
cp infra/vps/.env.example infra/vps/.env && chmod 600 infra/vps/.env  # then fill it in
```

`infra/vps/.env` needs `POSTGRES_PASSWORD`, `PII_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL` and `AUTH_COOKIE_DOMAIN`. The last two secrets come from
`scripts/generate-deployment-secrets.mjs`; the database password is generated separately.

```bash
# 4. Build, migrate, seed, run
cd /opt/managevent/infra/vps
docker compose build
docker compose run --rm migrate
docker compose run --rm seed
docker compose up -d
```

## Updating a deployment

```bash
cd /opt/managevent && git pull
cd infra/vps
docker compose build
docker compose run --rm migrate   # only when prisma/migrations changed
docker compose up -d
```

Migrations are **append-only** (root `AGENTS.md` §6). `db:migrate` runs
`prisma migrate deploy`, never `db push`.

## Verification

```bash
# from the host
cd /opt/managevent/infra/vps
docker compose ps                       # api and db must both be (healthy)
docker compose exec -T api \
  wget -qO- http://127.0.0.1:4000/health

# public
curl -fsS https://api.managevent.com.au/health
```

Expected body:

```json
{ "status": "ok", "service": "managevent-api", "region": "syd" }
```

Seeded data: 3 ceremony types, 9 venues, 3 packages (price list `2026.10.1`).

## Secrets

`infra/vps/.env` is mode `0600` and gitignored. Back it up outside the server: if
`PII_ENCRYPTION_KEY` is lost, every encrypted guest health/dietary field becomes
unrecoverable. Rotating `PII_ENCRYPTION_KEY` requires re-encrypting existing rows — there
is no key-version table yet (`DECISION-NEEDED(FND-02)`).

Never commit `.env`, `.env.*` or generated key files. Only `.env.example` is tracked.

## Troubleshooting

**Certificate will not issue even though DNS is correct.**
ACME CAs cache negative answers for the zone's SOA minimum. This zone uses
`3600` (1 hour), so a validation that ran _before_ the A record existed can keep returning
`NXDOMAIN` for up to an hour, even though `dig` and public resolvers show the record.
Diagnose with DNS-over-HTTPS, which bypasses every intermediate cache:

```bash
curl 'https://dns.google/resolve?name=api.managevent.com.au&type=A'
```

If that returns `139.180.163.128`, the record is fine and only the CA cache is stale.
Wait for the SOA minimum to elapse, then restart Caddy to force a fresh order:

```bash
docker compose restart caddy
```

**`api` container unhealthy right after start.**
The API runs through `tsx`, which compiles TypeScript on boot; on 1 vCPU this takes
~45 seconds. The healthcheck has a 30 s `start_period` plus retries, so brief
`health: starting` is normal.

**Worker running but no email arrives.**
The worker has one real Resend adapter and no mock. It sends as soon as `RESEND_API_KEY` is
set in its environment; there is no second switch (`RESEND_DOMAIN_VERIFIED` is no longer
read). Without the key nothing is sent and nothing is reported as sent: `lead.created`
records a `Message` row with status `NOT_CONFIGURED`, the API answers
`503 EMAIL_NOT_CONFIGURED` to invitation and reminder emails, and `GET /v1/me` reports
`emailInvitations: false`. Check that the key is present, that the sender domain is verified
in Resend, and that `GUEST_TOKEN_PEPPER` is the same value for the API and the worker
(unsubscribe links are signed by one and verified by the other).

## Known gaps

| Gap                                                | Impact                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/marketing`, `apps/invitation` not scaffolded | No Vercel deployment possible; checklist URLs (`/i/...`, `/studio`) do not exist |
| Email never sent against live Resend               | The real adapter is tested with a fake `fetch` only; verify one send per kind    |
| No off-server database backups                     | Single point of failure; volume `managevent_db-data` is on one disk              |
| ACME contact is a placeholder                      | `admin@managevent.com.au` in the Caddyfile — confirm the mailbox exists          |
