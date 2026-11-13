# Deployment

The one description of how Managevent runs in production and how to change it. Every other deployment document in this repository points here. The decision record is [ADR-0011](docs/architecture/adr/0011-production-on-single-sydney-vps.md); every environment variable is in [`infra/ENVIRONMENTS.md`](infra/ENVIRONMENTS.md).

Contents: [What is live](#what-is-live) · [Architecture](#architecture) · [Go-live checklist for this release](#go-live-checklist-for-this-release) · [First deploy of this release: verify on the box](#first-deploy-of-this-release-verify-on-the-box) · [Updating](#updating) · [Rollback](#rollback) · [Continuous deployment](#continuous-deployment) · [Backups and restore](#backups-and-restore) · [Secrets](#secrets) · [DNS](#dns) · [First-time provisioning](#first-time-provisioning) · [Troubleshooting](#troubleshooting) · [Known gaps](#known-gaps)

## What is live

Everything runs on **one virtual server in Sydney**. There is no Vercel, Fly.io or Supabase project, no staging environment and no CDN. The server and its DNS exist, but this release has not been deployed to it yet (ROADMAP OPS-01): the [go-live checklist](#go-live-checklist-for-this-release) is how it gets there.

| Item              | Value                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Provider / region | Vultr `syd` (Sydney, NSW). All stored personal information stays in Australia                |
| Plan              | `vc2-1c-2gb`: 1 vCPU, 2 GB RAM, 55 GB SSD, 5 GB swap file. Tight: see [Capacity](#capacity)  |
| Host              | `managevent-prod`, Ubuntu 24.04, public IP `139.180.163.128`                                 |
| Repository        | `/opt/managevent` (a git checkout of `main`)                                                 |
| Stack definition  | [`infra/vps/docker-compose.yml`](infra/vps/docker-compose.yml), Compose project `managevent` |
| Secrets           | `/opt/managevent/infra/vps/.env`, mode `0600`, never committed                               |
| Firewall          | UFW allows 22, 80 and 443 only                                                               |

| Hostname                       | Served by                | What it is                                                                          |
| ------------------------------ | ------------------------ | ----------------------------------------------------------------------------------- |
| `www.managevent.com.au`        | `marketing` (port 3100)  | Marketing site, and the staff console under `/admin`                                |
| `invitation.managevent.com.au` | `invitation` (port 3001) | Host studio and guest invitation pages                                              |
| `api.managevent.com.au`        | `api` (port 4000)        | Hono API, Better Auth, Stripe webhook                                               |
| `managevent.com.au`            | Caddy                    | Redirects to `www`. **Not live yet**: its DNS record points elsewhere ([DNS](#dns)) |

## Architecture

```text
                         Internet
                            │ 80 / 443  (the only published ports)
                    ┌───────▼────────┐
                    │     caddy      │  TLS, HSTS, compression, body limits, access log,
                    └──┬─────┬─────┬─┘  overwrites every client-address header
        www.           │     │     │           api.
   ┌───────────────────┘     │     └──────────────────────┐
   │              invitation.│                            │
┌──▼─────────┐        ┌──────▼──────┐                     │
│ marketing  │        │ invitation  │   Next.js apps: every data call and every
│ :3100      │        │ :3001       │   sign-in goes server-side to http://api:4000
└──────┬─────┘        └──────┬──────┘   with the shared API_PROXY_SECRET
       └──────────┬──────────┘                            │
              ┌───▼────────────────────────────────────────▼──┐
              │ api :4000   the only writer to the database   │
              └───┬───────────────────────────────────────────┘
                  │ SQL and pg-boss jobs
              ┌───▼────────┐        ┌──────────┐
              │ db         │◄───────│ worker   │  emails, headcount recommendations
              │ postgres16 │        └──────────┘
              └───┬────────┘
                  │ nightly pg_dump → age-encrypted archive → /var/backups/managevent
                  ▼                                          → bucket in Australia
```

| Container    | Image                   | Memory limit | Health check                        | Notes                                             |
| ------------ | ----------------------- | ------------ | ----------------------------------- | ------------------------------------------------- |
| `db`         | `postgres:16-alpine`    | 512 MB       | `pg_isready`                        | Volume `managevent_db-data`. Never published      |
| `api`        | `managevent-api`        | 384 MB       | `GET /health`                       | Runs through `tsx`; takes up to a minute to start |
| `worker`     | `managevent-worker`     | 320 MB       | none (no port); restarts on failure | Consumes pg-boss jobs                             |
| `marketing`  | `managevent-marketing`  | 448 MB       | any HTTP answer below 500           |                                                   |
| `invitation` | `managevent-invitation` | 448 MB       | any HTTP answer below 500           |                                                   |
| `caddy`      | `caddy:2-alpine`        | 128 MB       | admin API on `127.0.0.1:2019`       | Certificates in volume `managevent_caddy-data`    |

All containers restart unless stopped, and every log is capped at 5 × 10 MB (`json-file`). The four app containers run as the unprivileged `node` user with `no-new-privileges`.

### Client address trust model

Rate limits, sign-in lockouts and the address written on consent and audit rows all depend on knowing the real visitor address. A request header can be typed by anyone, so the rule is: **an address is only believed when the sender could not have chosen it.**

1. **Caddy is the only entry point** and `trusted_proxies` is not configured, so Caddy discards any `X-Forwarded-For` a caller sends and writes its own from the TCP connection.
2. **Caddy also removes or overwrites the other headers our code would accept** (`infra/vps/Caddyfile`, snippet `edge`): it deletes `Fly-Client-IP` and `X-Vercel-Forwarded-For` (nothing reads them; both web apps read only `X-Real-IP`, then `X-Forwarded-For`, the two headers Caddy writes), sets `X-Real-IP` to the connection's address, and deletes `X-Managevent-Proxy-Secret` from every incoming request.
3. **Browser → Caddy → Next app → API.** The Next app reads the visitor address from the headers Caddy set and forwards it to the API as `x-forwarded-for` together with `API_PROXY_SECRET`. The API believes a forwarded address only with that secret (`apps/api/src/lib/client-ip.ts`). The secret never leaves the Docker network, and a copy sent from the internet is dropped at step 2.
4. **Caller → Caddy → API** (anything that uses `api.managevent.com.au` directly: the Stripe webhook, later the mobile apps). There is no secret, so the API falls back to `TRUSTED_CLIENT_IP_HEADER=x-real-ip`, which Caddy overwrote. This is the one place we set that variable, and it is safe only because port 4000 is not published: the only senders that can reach the API are Caddy and our own containers.

If a CDN or load balancer is ever put in front of Caddy, every point above changes. Reconfigure `trusted_proxies` and re-test spoofing before switching DNS.

Access logs follow the same care: Caddy writes one JSON line per request with the path after a guest-link prefix (`/i/`, `/e/`, `/legacy/`, `/anniversary/`, `/display/`, and `/v1/i/` on the API) and every query string replaced by `[redacted]`, no request or response headers, and addresses truncated to the /24 or /48 network. Read them with `docker compose logs caddy`.

### Capacity

The memory limits add up to **2,240 MB on a 2 GB server**. They are ceilings and typical use is lower, but a busy hour runs into swap, and a Next.js build (about 1.3 GB of heap) cannot run next to the live site without squeezing it. **Recommendation: the 4 GB plan (`vc2-2c-4gb`)**, for exactly that reason: the limits we consider safe already exceed the RAM. Until then, never build two images at once on the server (`deploy.sh` builds one at a time) and prefer the GitHub Actions path, which builds nothing on the server. The plan size is the founder's decision (OPEN_DECISIONS D-17).

## Go-live checklist for this release

This release replaces the mock invitation app with the real platform: accounts, the staff console, real guest links, and optional email and payments. Work through it in order on the server (`ssh root@139.180.163.128`). Steps marked **owner** need an account or a secret only the business owner has.

**Before you start**

- [ ] The pull request is merged and **CI is green, including the four "Docker image" jobs and "Ops scripts and Compose files"**. The Dockerfiles, Compose files and scripts were rewritten for this release; that CI run is the first time the images are built.
- [ ] You have read [First deploy of this release: verify on the box](#first-deploy-of-this-release-verify-on-the-box) and done its "before" checks. No container image of this release has been built or run anywhere except CI, so that list is part of this checklist, not optional reading.
- [ ] You have a quiet hour. Building four images on one vCPU has not been timed; the site stays up during the build but is slow. Expect one to three minutes of downtime at the switch: this release changes every container's definition, so all of them, including the database, are recreated once.

**1. Get the code**

```bash
cd /opt/managevent && git pull
```

This changes files only; the running containers are untouched. Until step 2 is finished, `docker compose` commands in `infra/vps` refuse to run, because the new Compose file requires variables that `.env` does not have yet. That is expected, and it stops nothing that is running.

**2. Add the new required variables to `infra/vps/.env`**

`POSTGRES_PASSWORD`, `PII_ENCRYPTION_KEY` and `BETTER_AUTH_SECRET` already exist. **Do not regenerate them.** Add only what is new:

```bash
cd /opt/managevent
cp -p infra/vps/.env infra/vps/.env.before-release      # a copy to return to; delete it after go-live
# Generates all five secrets; keep ONLY the two new ones.
printf '\n' >> infra/vps/.env
docker run --rm -v "$PWD/scripts:/s:ro" node:22-alpine node /s/generate-deployment-secrets.mjs 2>/dev/null \
  | grep -E '^(GUEST_TOKEN_PEPPER|API_PROXY_SECRET)=' >> infra/vps/.env
nano infra/vps/.env        # add the lines below, then save
chmod 600 infra/vps/.env
```

| Variable                  | How to get the value                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GUEST_TOKEN_PEPPER`      | Generated above (64 hex characters). Changing it later breaks every guest link: store it with the other secrets                             |
| `API_PROXY_SECRET`        | Generated above (64 hex characters)                                                                                                         |
| `CONTACT_EMAIL`           | Optional first-run default for the public enquiries address. Empty: `appilico.au@gmail.com`. Staff change it later in the console           |
| `CONTACT_PHONE`           | Optional first-run default for the public phone number. Empty: no phone number is shown. Staff change it later in the console               |
| `LEAD_NOTIFICATION_EMAIL` | Optional. **Owner:** the planner inbox for new enquiries (needs Resend, step 8). Empty: the console's alert address, else the contact email |

`CONTACT_EMAIL` and `CONTACT_PHONE` are only first-run defaults. The public contact email and phone are staff settings stored in the database: sign in at `/admin`, open **Settings**, change them, and visitors see the new values within a minute (immediately on this server). No rebuild or redeploy is needed. Once settings are saved there, these two lines are ignored; they are also what the site shows if the API cannot be reached. A blank phone is allowed and hides every phone link.

Leave `AUTH_COOKIE_DOMAIN` as it is (`managevent.com.au` and `.managevent.com.au` behave the same). Then check that nothing is missing:

```bash
cd infra/vps && docker compose config --quiet && echo "environment is complete"
```

Copy the updated `.env` into the owner's password manager now.

**3. Take a backup you can hold in your hand, then deploy**

```bash
bash /opt/managevent/infra/vps/backup.sh --kind predeploy
ls -la /var/backups/managevent/predeploy/          # copy the newest file off the server with scp
bash /opt/managevent/infra/vps/deploy.sh --no-pull
```

The backup is not encrypted yet (that is set up in step 7), so treat the copy as personal information: keep it somewhere private and delete it once the release has settled.

It validates the configuration and the Caddyfile, builds the four images one at a time (the slow part on this server), backs up the database, applies the pending migrations, replaces the containers, and checks all three hostnames. The migration for this release is **`20261112000000_invitation_platform`** (new columns with defaults, one new table `WebhookEvent`, new indexes; nothing is dropped). `20261111000000_remove_persian` is applied first if this server has not had it yet. Confirm afterwards:

```bash
cd /opt/managevent/infra/vps
docker compose exec db psql -U managevent -d managevent -Atc \
  "select migration_name from _prisma_migrations where finished_at is not null order by finished_at desc limit 2"
```

If the script ends with `ROLLED BACK`, the previous images are running again; read its last lines and [Rollback](#rollback).

**4. Seed the sample invitations**

Six read-only sample invitations, one per template. Safe to run again: it updates them in place.

```bash
cd /opt/managevent/infra/vps
docker compose exec api pnpm --filter @managevent/api seed:demo
```

It runs inside the running `api` container on purpose, so it uses the same `GUEST_TOKEN_PEPPER` as the API. If it ends with `Killed` or exit code 137 (a second Node process did not fit in the container's 384 MB), run it in a container of its own, which gets the same environment: `docker compose run --rm api pnpm --filter @managevent/api seed:demo`. The same applies to `staff:create` in step 5. The catalogue seed (ceremonies, Perth placeholder venues, packages) is separate and only needed on an empty database: `docker compose run --rm seed`.

**5. Create the first staff account**

Staff must have two-factor authentication; the API treats a staff account without it as signed out. The tool enrols it for you.

```bash
docker compose exec api pnpm --filter @managevent/api staff:create -- \
  --email owner@example.com --name "Full Name" --role SUPER_ADMIN
```

It prints, **once**, a generated password, a TOTP URI and backup codes. Add the URI to an authenticator app immediately and store the password and backup codes in a password manager; then clear the terminal scrollback. Sign in at `https://www.managevent.com.au/admin`. For a planner use `--role PLANNER_STAFF`. `--promote` turns an existing account into staff and replaces its password and authenticator.

**6. Smoke tests** (from your own computer, not the server)

```bash
# API
curl -fsS https://api.managevent.com.au/health                        # {"status":"ok","service":"managevent-api",...}
curl -fsS https://api.managevent.com.au/v1/me                         # user null, plus the capabilities object
curl -fsS https://api.managevent.com.au/v1/public/demos | head -c 300 # the six sample invitations

# www: the site, the staff console, and the sign-in proxy to the API
curl -sS -o /dev/null -w '%{http_code}\n' https://www.managevent.com.au/                      # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://www.managevent.com.au/admin                 # 200, or a redirect to sign in
curl -sS -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' --data '{}' https://www.managevent.com.au/api/auth/sign-in/email  # 400: the proxy reached the API
curl -sS -o /dev/null -w '%{http_code}\n' https://www.managevent.com.au/api/auth/get-session  # 404: only the sign-in calls are forwarded

# invitation: the site, the sign-in proxy, and a real 404 for an unknown guest link
curl -sS -o /dev/null -w '%{http_code}\n' https://invitation.managevent.com.au/                     # 200
curl -sS -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' --data '{}' https://invitation.managevent.com.au/api/auth/sign-in/email  # 400: the proxy reached the API
curl -sS -o /dev/null -w '%{http_code}\n' https://invitation.managevent.com.au/api/auth/get-session # 404: only the sign-in calls are forwarded
curl -sS -o /dev/null -w '%{http_code}\n' https://invitation.managevent.com.au/i/unknown/unknown    # 404

# edge: security headers, body limit
curl -sSI https://www.managevent.com.au/ | grep -iE 'strict-transport-security|x-content-type-options|referrer-policy|permissions-policy'
head -c 3000000 /dev/zero | curl -sS -o /dev/null -w '%{http_code}\n' -X POST --data-binary @- https://api.managevent.com.au/v1/leads   # 413
```

Then, in a browser: open a sample invitation from `https://invitation.managevent.com.au/templates`, sign up as a host and create an invitation, sign in to `/admin` with the staff account, and submit the contact form on www and find the enquiry in `/admin`.

Check the API log once for the line that would mean the proxy secret is not reaching it (there must be no output):

```bash
docker compose logs api | grep -i "API_PROXY_SECRET is not set"
```

**7. Turn on backups** ([Backups and restore](#backups-and-restore)): create the age key pair, set `BACKUP_AGE_RECIPIENT` and a destination, install the timer, run one backup and one restore drill.

**8. Optional, owner: email with Resend**

Until this is done no email is sent and the product says so (no magic links, no password reset, no emailed invitations; enquiries are stored but nobody is alerted).

1. Create a Resend account and add the domain `managevent.com.au`. Resend processes mail outside Australia; that is disclosed in the privacy policy (ADR-0008).
2. Resend shows the exact DNS records for the domain: a DKIM `TXT` record (`resend._domainkey`), and an `MX` and an SPF `TXT` record on a sending subdomain (`send`). Add them at VentraIP **exactly as shown**; do not copy values from anywhere else. If the domain already has an SPF record at the same name, merge them: never publish two. Add a DMARC record `_dmarc` with `v=DMARC1; p=none` if there is none.
3. Wait until Resend reports the domain as verified.
4. Create an API key with sending access only. In `infra/vps/.env` set `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, and confirm `EMAIL_FROM_TRANSACTIONAL` uses the verified domain. Leave `EMAIL_FROM_INVITATIONS` empty unless a second domain is verified.
5. Apply and check: `cd /opt/managevent/infra/vps && docker compose up -d api worker`, then `curl -fsS https://api.managevent.com.au/v1/me` must show `"magicLink":true`. Submit one clearly labelled test enquiry and confirm both emails arrive.

**9. Optional, owner: payments with Stripe**

Until this is done the Premium upgrade is shown as unavailable.

1. In the Stripe dashboard (live mode) copy the secret key (`sk_live_...`).
2. Developers → Webhooks → add an endpoint: URL `https://api.managevent.com.au/v1/webhooks/stripe`, events **`checkout.session.completed`** and **`checkout.session.async_payment_succeeded`**. Copy its signing secret (`whsec_...`).
3. In `infra/vps/.env` set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (both, or neither), then `docker compose up -d api`.
4. Check: `curl -fsS https://api.managevent.com.au/v1/me` shows `"stripeCheckout":true`, and "Send test webhook" in the Stripe dashboard is answered with 200. Rehearse the whole flow with test keys (`sk_test_...` and a test-mode endpoint) before switching to live keys.

**10. Owner: point the apex domain at the server** ([DNS](#dns)), so `managevent.com.au` redirects to `www`.

**11. Owner: set up continuous deployment** ([Continuous deployment](#continuous-deployment)), so the next release does not build on the server.

**If something is wrong:** `bash /opt/managevent/infra/vps/deploy.sh --rollback` starts the images that were running before step 3. The migration is additive, so the previous images work with the new schema. See [Rollback](#rollback).

## First deploy of this release: verify on the box

**Nothing in this section has been run.** The machines this release was written and reviewed on have no Docker, so no image was built, no container was started, and Caddy, the scripts and the workflows were never executed against a real daemon or the server. The list below is what that leaves open, with the command that settles each point. Tick them off during the go-live; anything that fails before step 3 of the checklist costs nothing, because nothing running has been touched yet.

What _was_ checked without Docker, so you know where the evidence ends: the API starts and answers `/health`, `/v1/me` and `/v1/public/demos` with exactly the environment the Compose file gives it (optional providers empty) and the image's start command, but on a developer machine (Windows, Node 26), not in the Alpine image on Node 22; the marketing app builds and its staff console passes its browser tests against the real API and a real PostgreSQL; the scripts pass `bash -n`; the workflow and Compose files parse as YAML; the lockfile matches every workspace manifest; the two migrations were read and are additive. The author of the Compose files and the Caddyfile reports validating them with downloaded `docker compose` and `caddy` binaries of the newest releases, which are not necessarily the versions on the server.

**Before anything is replaced** (all read-only; run on the server after `git pull` and step 2)

| #   | Unverified                                                                                                                                                                                                              | How to settle it                                                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The four images build at all, run as uid 1000, find `pnpm` offline, and the API image migrates a database, starts and passes its healthcheck                                                                            | The CI jobs "Docker image (api, worker, marketing, invitation)" are green on the merged commit. They are the only place these Dockerfiles have ever been built. Do not deploy on a red or skipped run                                                                                                                  |
| 2   | The server's Docker can build these Dockerfiles. They need BuildKit (`RUN --mount=type=cache`); the previous ones did not                                                                                               | `docker buildx version`. If it is missing: `apt-get install -y docker-buildx`. A build that fails with "the --mount option requires BuildKit" is this, and it fails before anything is replaced. Note `docker compose version` in the go-live record: which version runs on the server is not known here               |
| 3   | The server's Docker can start a container with `init: true` (new in this release, on every app service). If it cannot, **nothing starts and a rollback does not help**, because the rollback uses the same Compose file | `docker run --rm --init caddy:2-alpine true && echo ok`. `deploy.sh` runs the same test in its preflight and stops before touching anything. `docker info --format '{{.InitBinary}}'` names the binary Docker looks for; on Ubuntu it normally comes with `docker.io` or the `tini` package. Fix that before deploying |
| 4   | The Caddyfile is valid for the Caddy version **already on the server**. `caddy:2-alpine` is a moving tag, and the new log filter (`ip_mask 24 48`, the `regexp` on the URI) needs a recent release                      | `docker run --rm caddy:2-alpine caddy version`, then the `caddy validate` command under [Updating](#updating). `deploy.sh` runs it in its preflight. If it fails: `docker pull caddy:2-alpine` (this does not touch the running container) and validate again. Do not edit the file blind                              |
| 5   | `.env` is complete and the two new secrets are long enough                                                                                                                                                              | `cd infra/vps && docker compose config --quiet`. `deploy.sh` also refuses a `GUEST_TOKEN_PEPPER` or `API_PROXY_SECRET` shorter than 32 characters                                                                                                                                                                      |
| 6   | There is room. Image sizes have not been measured; each of the four holds a full dependency install, and two generations are kept for rollback                                                                          | `df -h /` shows at least 15 GB free; `free -m` and `swapon --show` show the 5 GB swap file is on. After the deploy: `docker system df`                                                                                                                                                                                 |
| 7   | The database volume is the one the new Compose file names. The project name and the volume names did not change in the file, but the running stack has not been compared with it                                        | `docker volume ls` lists `managevent_db-data`, and `docker inspect $(docker compose ps -q db) --format '{{range .Mounts}}{{.Name}}{{end}}'` prints the same name. Note the row counts now: `docker compose exec db psql -U managevent -d managevent -Atc 'select count(*) from "Lead"'`                                |
| 8   | How long the build takes on one vCPU next to the live site, and whether the site stays responsive during it (a Next.js build is given 1,280 MB of heap on a 2 GB server)                                                | Watch `free -m` and the site while the first image builds. If the site suffers, stop (`Ctrl-C`: nothing has been replaced yet) and use [Continuous deployment](#continuous-deployment) instead, which builds nothing on the server                                                                                     |

**During the switch** (`deploy.sh` prints each step; these are the moments to watch)

| #   | Unverified                                                                                                                                                                                    | How to settle it                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | Recreating the `db` container keeps the data. The first `docker compose up -d db` replaces the container because its definition changed; the old API loses its connections for some seconds   | The pre-deploy backup in step 3 of the checklist is in your hand before this happens. Afterwards the row count from point 7 is unchanged                                                                                                                                   |
| 10  | `prisma migrate deploy` works as the unprivileged user in the Alpine image (engine binaries, OpenSSL 3)                                                                                       | The script prints the two migration names and "applying migrations" ends without an error. On failure it stops and **the running containers are not replaced**                                                                                                             |
| 11  | The API becomes healthy within the time Compose allows (60 seconds grace, then six checks 15 seconds apart). It starts through `tsx` on one vCPU with a 384 MB limit; that has not been timed | `docker compose ps api` turns `healthy`. If it does not, `docker compose up` fails and `deploy.sh` starts the previous images again by itself. Then read `docker compose logs --tail 100 api`; if it was only slow, raise `start_period` for `api` in `docker-compose.yml` |
| 12  | The automatic rollback itself. It has never run. It starts the pre-release images under the **new** Compose file and Caddyfile                                                                | If the script ends with `ROLLED BACK`, check all three hostnames by hand. If it ends with "the rollback ... is not healthy", go straight to `docker compose ps` and `docker compose logs --tail 100` for the service that is not up                                        |

**After the switch** (behaviour that only exists behind Caddy, in the real images)

| #   | Unverified                                                                                                                                                                         | How to settle it                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | Every healthcheck command exists in its image and passes: `wget` in the API and Caddy images, `node -e fetch(...)` in the two web images, Caddy's admin API on `127.0.0.1:2019`    | `docker compose ps` shows `healthy` for `db`, `api`, `marketing`, `invitation` and `caddy` after two minutes. A `caddy` that is `unhealthy` while the sites answer means the check is wrong, not Caddy: nothing depends on it, so report it and carry on                                                                                          |
| 14  | The web apps can write where they need to as the `node` user (Next.js writes under `.next/cache` at run time)                                                                      | `docker compose logs marketing invitation \| grep -iE 'EACCES\|permission denied\|read-only'` prints nothing after you have clicked through both sites                                                                                                                                                                                            |
| 15  | The worker starts and stays up (it has no healthcheck)                                                                                                                             | `docker compose logs --tail 20 worker` shows `Managevent worker started` with its job names, and `docker inspect $(docker compose ps -q worker) --format '{{.RestartCount}}'` prints `0`                                                                                                                                                          |
| 16  | Memory fits the limits in practice                                                                                                                                                 | `docker stats --no-stream` an hour later: no container sits at its limit. `dmesg \| grep -iE 'killed process\|out of memory'` prints nothing                                                                                                                                                                                                      |
| 17  | The client-address chain. Caddy must overwrite `X-Real-IP` and `X-Forwarded-For` and drop `X-Managevent-Proxy-Secret`, and the web apps must hand the visitor's address to the API | Submit one test enquiry on www with the marketing box ticked, from a phone on mobile data. Then `docker compose exec db psql -U managevent -d managevent -Atc 'select ip from "ConsentRecord" order by "createdAt" desc limit 1'` must print that phone's public address, not a `172.` Docker address. Remove the test enquiry in `/admin` (Lost) |
| 18  | The access log really is redacted                                                                                                                                                  | Open a sample invitation, then `docker compose logs --tail 20 caddy`: the guest path reads `/i/[redacted]`, no line has a query string or a `headers` object, and addresses end in `.0`                                                                                                                                                           |
| 19  | Caddy answers an oversized body with 413 (older releases answered 502)                                                                                                             | The last smoke test in step 6 of the checklist. Any refusal is acceptable; a 200 or 201 is not                                                                                                                                                                                                                                                    |
| 20  | Session cookies in production: `__Secure-managevent.session_token`, `Domain=.managevent.com.au`, `Secure`, `HttpOnly`, `SameSite=Lax`, set through the `www` sign-in proxy         | Sign in at `/admin` with the staff account and look at the cookie in the browser's developer tools. Then sign in on `invitation.` as a host in another browser profile and open `https://www.managevent.com.au/admin`: it must show "This area is for Managevent staff", never an enquiry                                                         |
| 21  | The contact details on www are the ones in the console's Settings page                                                                                                             | `curl -s https://www.managevent.com.au/contact \| grep -o 'mailto:[^"]*' \| sort -u` prints the address saved in **Settings** (the default `appilico.au@gmail.com` on a fresh install). Change it in the console, reload, and it must change here within a minute                                                                                 |
| 22  | No secret is inside an image                                                                                                                                                       | For each of the four images (`docker compose images` lists them): `docker run --rm --entrypoint sh <image> -c "find /app -maxdepth 4 -name '.env*' -not -path '*/node_modules/*'"` prints nothing, and `docker history --no-trunc <image>` shows only the `NEXT_PUBLIC_*` URLs as build arguments                                                 |
| 23  | Backups end to end: `age`, the upload, the systemd timer's `Australia/Perth` time zone, and `pg_restore` reading an archive that `pg_dump` wrote to a pipe                         | Step 7 of the checklist. The restore drill (`restore.sh --drill`) is the proof; until it has printed `DRILL PASSED` once, assume there is no backup. `systemd-analyze calendar '*-*-* 03:15:00 Australia/Perth'` shows the next run                                                                                                               |
| 24  | The GitHub Actions path: the `production` approval, GHCR pulls on the server with the run's token, `git merge --ff-only`, the switch from local to registry images                 | The first run of the Deploy workflow. Watch it to the end; `deploy.sh` rolls back by itself if the result is not healthy, and the manual path keeps working either way                                                                                                                                                                            |

A manual `bash infra/vps/deploy.sh --rollback` followed by a second one (which returns to the new images) is the only way to rehearse a rollback before it is needed. It costs two short interruptions; do it in a quiet hour if you intend to rely on it.

## Updating

There are two ways to ship a change. Both end in the same script, `infra/vps/deploy.sh`, which is safe to run against the live site: everything that can fail without touching running containers happens first (git, required secrets and their lengths, Caddyfile validation, a container start with `init`, image build or pull, backup, migrations); only then are containers replaced; then health is verified. If Compose cannot start the new containers, or the verification fails, the previous images are started again automatically.

**A. GitHub Actions (preferred).** Merge to `main`. When CI is green the Deploy workflow builds the images, waits for approval on the `production` environment, and rolls them out. Nothing is built on the server. See [Continuous deployment](#continuous-deployment).

**B. Manual, over SSH.** Builds on the server, one image at a time.

```bash
ssh root@139.180.163.128
bash /opt/managevent/infra/vps/deploy.sh
```

At the end it prints what changed: the commits, any new migrations, the infrastructure files that changed, and `docker compose ps`.

| Option        | Use it when                                                                |
| ------------- | -------------------------------------------------------------------------- |
| `--no-pull`   | You already ran `git pull`, or you are testing a change made on the server |
| `--no-backup` | A backup was taken minutes ago. Never for a release with migrations        |
| `--no-verify` | First provisioning, before DNS and certificates exist                      |
| `--no-prune`  | You want to keep older images on disk                                      |
| `--verify`    | Only run the health checks                                                 |

Things to know:

- **Never run a second build while one is running** on the 2 GB plan. `deploy.sh` takes a lock; plain `docker compose build` does not.
- **Changing only `.env`:** `cd infra/vps && docker compose up -d` recreates the services whose environment changed. Nothing else is needed, with one exception: the `NEXT_PUBLIC_*` URLs are built into the web images, so changing one of them needs a new image (run `deploy.sh`). The public contact email and phone are not in `.env` at all after the first save: staff edit them in the console.
- **Changing only the Caddyfile:** validate, then restart Caddy. A reload is not enough: the file is a single-file bind mount and a running container keeps the old copy.

  ```bash
  cd /opt/managevent/infra/vps
  docker run --rm --network none -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && docker compose restart caddy
  ```

- **Migrations are append-only and must be backward compatible** (add first, remove in a later release), because a rollback restarts the previous images against the new schema. `db:migrate` is `prisma migrate deploy`, never `db push`.
- **Plain Compose commands keep working.** `deploy.sh` writes the deployed tag to `IMAGE_TAG` in `.env`, so `docker compose ps`, `logs`, `up -d` and `run --rm migrate` all refer to the running images. To build by hand, add the override: `docker compose -f docker-compose.yml -f docker-compose.build.yml build api`.

## Rollback

```bash
bash /opt/managevent/infra/vps/deploy.sh --rollback
```

This starts the image set that was running before the last successful switch (recorded in `infra/vps/.deploy-state`) and verifies it. Running it a second time returns to the newer set. `deploy.sh` does the same by itself when Compose cannot start the new containers or its verification fails.

What a rollback does **not** do:

- **It does not undo migrations.** That is why they must be backward compatible. If a migration itself is the problem, fix it forward with a new migration; restoring a backup loses every write since the backup and is the last resort ([Restore](#restore)).
- **It does not revert the checkout.** The Compose file, Caddyfile and `.env` stay as they are. To also go back in code: `git -C /opt/managevent log --oneline -5`, check out the earlier commit, and `bash infra/vps/deploy.sh --no-pull`.
- **It cannot go back further than one step**, and only while the previous images are still on disk (`deploy.sh` keeps exactly the current and the previous set). Older versions are redeployed from their commit: Actions → Deploy → Run workflow → that commit's SHA.

## Continuous deployment

`.github/workflows/deploy.yml` builds the four images in GitHub Actions, pushes them to GHCR as `ghcr.io/<owner>/managevent-<app>:<commit>`, and runs `deploy.sh --image-tag <commit>` on the server over SSH. It starts by itself after the CI workflow succeeds for a push to `main`, or by hand (Actions → Deploy → Run workflow; optionally with an older commit of `main`). In both cases the rollout waits for an approval.

**One-time setup (owner):**

1. **Environment.** Repository → Settings → Environments → New environment `production`. Add yourself under "Required reviewers". Restrict "Deployment branches" to `main`.
2. **A deploy-only SSH key.** On your own computer: `ssh-keygen -t ed25519 -f managevent-deploy -C github-actions-deploy -N ""`. Append `managevent-deploy.pub` to `~/.ssh/authorized_keys` of the server user. Delete the local private key file after step 3.
3. **No repository variables** are needed. (Earlier versions built the public contact details into the marketing image; they are now edited in the staff console.)
4. **Environment secrets** (on the `production` environment, not repository-wide, so they are released only after approval):

   | Secret            | Value                                                                                                                                                                |
   | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `VPS_HOST`        | `139.180.163.128`                                                                                                                                                    |
   | `VPS_USER`        | The SSH user. It must be able to run `docker` and write `/opt/managevent` (today: `root`)                                                                            |
   | `VPS_SSH_KEY`     | The whole content of the private key file `managevent-deploy`                                                                                                        |
   | `VPS_KNOWN_HOSTS` | Output of `ssh-keyscan -t ed25519 139.180.163.128`. Compare the fingerprint with the server's own (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`) before saving |

5. **GHCR needs no secret.** Images are pushed with the run's `GITHUB_TOKEN`, and the server pulls them with the same short-lived token, which stops working when the run ends. The server is logged out of the registry at the end of every run.
6. **The server must be able to `git fetch`** the repository (it already can, since the manual path uses `git pull`), and `/opt/managevent` must be on `main` with no local edits to tracked files.

The first run switches the server from locally built images (`managevent-*`) to registry images; `deploy.sh --rollback` still works across that switch.

## Backups and restore

`infra/vps/backup.sh` dumps the whole database (application tables and the pg-boss queue) with `pg_dump --format=custom` (a compressed format), checks that the archive is readable, encrypts it with [age](https://age-encryption.org) to a public key, and keeps **7 nightly and 4 weekly** archives. With a destination configured it copies each new archive to a bucket. It exits non-zero on any failure. `deploy.sh` and `restore.sh --promote` call it first (`--kind predeploy`, the newest 5 are kept).

Each archive has two companions: `.sha256` (integrity) and `.meta` (time, size, latest migration, commit, and a fingerprint of the `PII_ENCRYPTION_KEY` in use; no personal data and no key material).

**Recovery objectives today:** up to 24 hours of data can be lost (the last nightly backup), and a full restore takes a few hours of hands-on work. There is no point-in-time recovery (ADR-0011).

### Set up (once)

```bash
# 1. Tools
apt-get install -y age rclone

# 2. Key pair. On the OWNER'S COMPUTER, not on the server:
age-keygen -o managevent-backup.key      # prints "Public key: age1..."
#    Store managevent-backup.key in the password manager. It is needed only to restore.
#    Put ONLY the public key on the server:  BACKUP_AGE_RECIPIENT=age1...  in infra/vps/.env

# 3. Destination (owner): a bucket in an AUSTRALIAN region (ADR-0008, OPEN_DECISIONS D-18), with
#    credentials that can write to that bucket only. Then either
#      rclone config            and  BACKUP_RCLONE_REMOTE=<remote>:<bucket>   in .env
#    or the aws cli             and  BACKUP_S3_URI=s3://<bucket>  (+ BACKUP_S3_ENDPOINT for a non-AWS store)
#    Set a lifecycle rule on the bucket that deletes objects after 35 days: the script only ever
#    adds to the bucket, it never deletes there.

# 4. Timer: every night at 03:15 Perth time
cp /opt/managevent/infra/vps/systemd/managevent-backup.{service,timer} /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now managevent-backup.timer
systemctl list-timers managevent-backup.timer

# 5. Prove it works
systemctl start managevent-backup.service && journalctl -u managevent-backup.service -n 30 --no-pager
ls -la /var/backups/managevent/daily/
```

Without step 2 archives are not encrypted and are never uploaded; without step 3 they exist only on the server, which protects against a bad deploy but not against losing the server. The script says so on every run.

Cron instead of systemd, if you prefer (`/etc/cron.d/managevent-backup`; 19:15 UTC is 03:15 in Perth):

```cron
15 19 * * * root /usr/bin/bash /opt/managevent/infra/vps/backup.sh >> /var/log/managevent-backup.log 2>&1
```

**Know when a backup is missing.** `systemctl --failed` lists a failed run, but nobody is watching the server at 03:15. Set `BACKUP_HEARTBEAT_URL` to a dead-man's-switch monitor (it is fetched after each successful nightly run) so that a missing backup sends an alert.

### The encryption key must outlive the backups

A database backup contains guest health and dietary fields encrypted with `PII_ENCRYPTION_KEY`. **A backup is only as recoverable as that key.**

- Keep `PII_ENCRYPTION_KEY` in the owner's password manager and in one offline copy. Never store it in the backup bucket or next to the age private key: someone who obtains an archive should need two separate things to read health data.
- If the key is ever replaced, keep the old one for as long as any backup made under it exists (at least 35 days: four weekly archives plus margin), and for as long as any `enc:v1` value in the live database was written with it (OPEN_DECISIONS D-13).
- Every archive's `.meta` records a short fingerprint of the key in use. `restore.sh` compares it with the key in `.env`, warns on a mismatch, and refuses to promote a backup whose key does not match.
- The same goes for the rest of `infra/vps/.env`: a restored database is of little use with a different `GUEST_TOKEN_PEPPER` (passes and unsubscribe links stop verifying) or `BETTER_AUTH_SECRET` (everyone is signed out). Back up the whole file, separately from the database archives.

### Restore drill (once a month, and after any change to the backup setup)

A backup that has never been restored is a hope, not a backup. The drill restores the newest nightly archive into a scratch database, checks it, and drops it. The live database is not touched.

```bash
# Bring the age private key to the server for the drill, and remove it afterwards.
scp managevent-backup.key root@139.180.163.128:/root/managevent-backup.key
ssh root@139.180.163.128
bash /opt/managevent/infra/vps/restore.sh --drill --identity /root/managevent-backup.key
shred -u /root/managevent-backup.key
```

Pass: the last line is `DRILL PASSED`. On the way it prints the checksum result, the number of tables, the latest migration (which must equal the one the backup recorded), row counts for the main tables, and whether the encryption key matches. Record the date and the result in the pull request or issue that tracks operations. To look inside the restored copy, add `--keep` and query the scratch database it names.

Twice a year do the full drill: restore the newest archive **from the bucket** onto a throwaway server following [Server lost](#server-lost), and check that a sample invitation opens.

### Restore

`restore.sh` never overwrites the live database: it always restores into a new database first.

```bash
# Look at an older state without touching production:
bash infra/vps/restore.sh --file /var/backups/managevent/daily/<archive> --identity <key> --into managevent_inspect

# Replace production with a backup (after a destructive mistake). Everything written since
# that backup is lost.
bash infra/vps/restore.sh --file /var/backups/managevent/daily/<archive> --identity <key> --promote
```

`--promote` asks for confirmation, takes a safety backup of the current database, stops the apps, renames the live database to `managevent_before_<time>` and the restored one to `managevent`, applies pending migrations and starts the apps. The previous database stays on the server until you drop it, so the swap itself can be undone.

### Server lost

1. Create a new server and follow [First-time provisioning](#first-time-provisioning) up to and including `.env`, using the `.env` from the password manager (the same `PII_ENCRYPTION_KEY`, `GUEST_TOKEN_PEPPER` and `BETTER_AUTH_SECRET`).
2. `bash /opt/managevent/infra/vps/deploy.sh --no-pull --no-verify` builds the images and starts the stack on an empty, migrated database. Do not seed it.
3. Fetch the newest archive from the bucket (with its `.sha256` and `.meta`) and the age private key onto the server.
4. `bash /opt/managevent/infra/vps/restore.sh --file <archive> --identity <key> --promote` swaps the restored database in and applies any pending migrations. It refuses if the archive was made under a different `PII_ENCRYPTION_KEY` than the one in `.env`.
5. Point DNS at the new address. When the certificates have been issued, `bash /opt/managevent/infra/vps/deploy.sh --verify`. Remove the age private key from the server.

## Secrets

- `infra/vps/.env` is the only place production secrets live on the server. It is `0600`, gitignored, and excluded from every image by `.dockerignore`. A copy belongs in the owner's password manager; update the copy whenever the file changes.
- Generate secrets with `node scripts/generate-deployment-secrets.mjs` (or the `docker run` form in the checklist, since the server has no Node.js). It prints `POSTGRES_PASSWORD`, `PII_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, `GUEST_TOKEN_PEPPER` and `API_PROXY_SECRET`; `--out <file>` writes them to a new `0600` file instead.
- What rotating each secret costs is in [`infra/ENVIRONMENTS.md`](infra/ENVIRONMENTS.md). In short: `API_PROXY_SECRET` is free to rotate; `BETTER_AUTH_SECRET` signs everyone out; `GUEST_TOKEN_PEPPER` breaks every guest link already sent; `PII_ENCRYPTION_KEY` must not be rotated without a re-encryption plan.
- Deployment credentials (`VPS_SSH_KEY` and friends) live only in the GitHub Environment `production`.
- Never paste a secret into a chat, an issue, a pull request or a commit. If one is exposed, rotate it at once ([`infra/INCIDENT_RUNBOOK.md`](infra/INCIDENT_RUNBOOK.md)).

## DNS

Managed at VentraIP (VIPcontrol → Domains → `managevent.com.au` → DNS). Full table and email records: [`infra/DOMAINS_AND_DNS.md`](infra/DOMAINS_AND_DNS.md).

| Type | Name         | Value             | State                                                          |
| ---- | ------------ | ----------------- | -------------------------------------------------------------- |
| `A`  | `api`        | `139.180.163.128` | Live                                                           |
| `A`  | `www`        | `139.180.163.128` | Live                                                           |
| `A`  | `invitation` | `139.180.163.128` | Live                                                           |
| `A`  | `@` (apex)   | `103.42.108.46`   | **Wrong: a parking page, not this server. Owner action below** |

**Apex redirect (owner).** The Caddyfile already redirects `managevent.com.au` to `https://www.managevent.com.au`, but the apex record still points at `103.42.108.46`, a parking page that is not this server. So today `https://managevent.com.au` does not reach us, and Caddy cannot obtain a certificate for it (it logs a failed attempt now and then, which is harmless). To fix it, change the apex `A` record to `139.180.163.128`, remove any `AAAA` record the parking service left on the apex, wait for the old TTL to pass, and check `curl -sSI https://managevent.com.au/` shows `301` with `location: https://www.managevent.com.au/`.

**No `AAAA` records for now.** In its default configuration, which this server uses as far as the repository shows, Docker does not carry IPv6 into containers. Even if the server has a public IPv6 address, connections arriving over it would reach Caddy through Docker's proxy and all appear to come from one internal address, which would put every IPv6 visitor in the same rate-limit bucket. Enable and test IPv6 in Docker first, then add the records.

## First-time provisioning

For a new server. The live one was set up this way.

```bash
# 1. Instance: Vultr, Sydney, Ubuntu 24.04, with your SSH public key. 4 GB recommended (Capacity).

# 2. Base system
apt-get update && apt-get install -y docker.io docker-compose-v2 docker-buildx tini git ufw curl age rclone
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
ufw default deny incoming && ufw allow 22,80,443/tcp && ufw --force enable

# 3. Code
git clone https://github.com/Sadramst/managevent.git /opt/managevent
cd /opt/managevent

# 4. Secrets. On a NEW system generate all five; on a rebuilt one restore .env from the password manager.
cp infra/vps/.env.example infra/vps/.env && chmod 600 infra/vps/.env
docker run --rm -v "$PWD/scripts:/s:ro" node:22-alpine node /s/generate-deployment-secrets.mjs
nano infra/vps/.env          # paste the five lines (CONTACT_EMAIL and CONTACT_PHONE are optional)
(cd infra/vps && docker compose config --quiet && echo "environment is complete")

# 5. DNS: point api, www and invitation at the server's address, then
bash infra/vps/deploy.sh --no-pull --no-verify     # build, migrate, start
(cd infra/vps && docker compose run --rm seed)     # catalogue, empty database only
bash infra/vps/deploy.sh --verify                  # once the certificates have been issued
```

Then continue with steps 4 to 11 of the [go-live checklist](#go-live-checklist-for-this-release) (sample invitations, staff account, backups, Resend, Stripe, apex, continuous deployment).

## Troubleshooting

**Where to look first**

```bash
cd /opt/managevent/infra/vps
docker compose ps                                   # state and health of every container
docker compose logs --tail 100 api                  # or worker, marketing, invitation, caddy, db
bash deploy.sh --verify                             # the same checks a deploy runs
free -m && df -h / && docker system df              # memory, disk, what Docker is using
```

**Compose says a required variable is missing.** That is the `${VAR:?}` guard: the message names the variable. Add it to `infra/vps/.env` ([ENVIRONMENTS](infra/ENVIRONMENTS.md)). Nothing was started or stopped.

**502 from a hostname right after a deploy.** The container behind it is still starting. Caddy holds a request for up to 10 seconds, and the API needs up to a minute on one vCPU because it runs through `tsx`. `docker compose ps` shows `health: starting`; it should turn `healthy`. If it does not, read that service's log.

**The web apps load but every sign-in or form fails.** The web apps cannot reach the API: check `docker compose ps api`, and that `API_URL` is `http://api:4000` (`docker compose exec marketing printenv API_URL`).

**Sign-in answers 403.** The browser's origin is not trusted. `AUTH_TRUSTED_ORIGINS` should be empty and the `NEXT_PUBLIC_*_URL` values correct; the API then trusts exactly `https://www.managevent.com.au` and `https://invitation.managevent.com.au`.

**Signed in on one site but not the other.** `AUTH_COOKIE_DOMAIN` is empty or wrong, or `BETTER_AUTH_URL` is not `https`.

**Everyone is rate limited at once (429), or the API logs "API_PROXY_SECRET is not set".** The secret is missing in the API or differs between `api`, `marketing` and `invitation`. They all read the same line of `.env`; after fixing it, `docker compose up -d api marketing invitation`.

**413 on a request that should be allowed.** Caddy's body limits are 2 MB on `api` and `www`, 6 MB on `invitation` (`request_body` in the Caddyfile).

**A Caddyfile change has no effect.** Restart Caddy (`docker compose restart caddy`); see [Updating](#updating).

**A certificate will not issue although DNS is correct.** ACME CAs cache a negative answer for the zone's SOA minimum (3600 seconds here), so a validation that ran before the record existed can keep failing for an hour. Check the record through DNS-over-HTTPS, `curl 'https://dns.google/resolve?name=api.managevent.com.au&type=A'`; if it is right, wait out the hour and `docker compose restart caddy`. `invitation` is pinned to ZeroSSL in the Caddyfile for this reason; do not remove that `tls` block without re-checking issuance.

**The worker is running but no email arrives.** There is one real Resend adapter and no mock: it sends as soon as `RESEND_API_KEY` is in the environment of both `api` and `worker`. Without the key nothing is sent and nothing is reported as sent. Check the key, that the sender's domain is verified in Resend, and that `GUEST_TOKEN_PEPPER` is the same line for both services.

**The server is slow or a container was killed.** `dmesg | grep -i -E 'killed process|out of memory'` and `free -m`. This is the 2 GB limit ([Capacity](#capacity)). Do not build on the server while it is under load.

**The disk is filling up.** `docker system df`. `deploy.sh` removes old images and build cache older than two weeks; to reclaim more, `docker builder prune -f`. Logs are capped per container. Check `/var/backups/managevent` as well.

**`git pull` fails in `deploy.sh`.** Someone edited a tracked file on the server. `git -C /opt/managevent status`, move the change into a commit in the repository, restore the file, and run again.

## Known gaps

| Gap                                                       | Impact                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| One server, no failover, no point-in-time recovery        | Up to 24 hours of data and a few hours of downtime if the server is lost (ADR-0011)                      |
| No staging environment                                    | The first real run of a change is production (OPEN_DECISIONS D-19)                                       |
| 2 GB plan                                                 | Runs on swap under load; building on the server squeezes the live site (OPEN_DECISIONS D-17)             |
| Off-server backups need a bucket the owner has to create  | Until then backups protect against a bad deploy, not against losing the server (OPEN_DECISIONS D-18)     |
| Apex DNS points at a parking page                         | `managevent.com.au` without `www` does not reach the site                                                |
| Email and payments never exercised against live providers | Resend and Stripe paths are covered by tests with local transports only; rehearse each once (steps 8, 9) |
| No uptime or error monitoring                             | An outage is noticed by a person. An external uptime check on the three hostnames is the cheapest fix    |
| Rate limits are in memory, per API process                | They reset when the API restarts. Fine for one instance; revisit before running two                      |
| ACME contact address                                      | `admin@managevent.com.au` in the Caddyfile: confirm the mailbox exists, or expiry warnings go nowhere    |
