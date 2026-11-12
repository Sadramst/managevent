# ADR-0011: Production runs on one Sydney VPS with Docker Compose

- **Status:** Accepted on 2026-11-12. It records the system that is live and replaces the hosting choices below. The founder owns D-01 and D-02 and countersigns this ADR in the pull request that introduces it.
- **Supersedes:** OPEN_DECISIONS **D-01** (Fly.io `syd` for the API and worker) and **D-02** (Supabase Sydney), both resolved on 2026-10-23; the hosting clauses of **ADR-0002** (one Vercel project per web app), **ADR-0003** (Fly.io as the default container host) and **ADR-0004** (Supabase as the PostgreSQL provider). Everything else in those ADRs stands: five separate Next.js apps, a separate Hono API and pg-boss worker, PostgreSQL 16 with Prisma 6, append-only migrations.
- **Amends:** the register in **ADR-0008** (see "Data residency" below).

## Context

The plan was Vercel for the web apps, Fly.io for the API and worker, and Supabase for PostgreSQL. None of it was ever provisioned. What went live instead is a single virtual server, and for a while the documents described both.

- Vercel, Fly.io and Supabase each need an account, a card and an interactive owner login. The VPS existed and was already in Sydney.
- Personal information must stay in Australia (Privacy Act, ADR-0008). A server in Sydney that holds the database, the queue and the applications satisfies that without a managed provider.
- The product is pre-revenue. Three providers plus a registry is more moving parts than one operator can watch.

Hostinger was looked at and rejected: it has no Australian VPS region.

## Decision

1. **One server.** Vultr, region `syd` (Sydney), Ubuntu 24.04, plan `vc2-1c-2gb` (1 vCPU, 2 GB RAM, 55 GB SSD) with a swap file. The repository is checked out at `/opt/managevent`.
2. **One Compose project** (`infra/vps/docker-compose.yml`): PostgreSQL 16, the API, the worker, the marketing app (which also serves the staff console at `/admin`), the invitation app and Caddy. Only Caddy publishes ports (80 and 443). PostgreSQL and the application ports are reachable from the Docker network only.
3. **Caddy terminates TLS** and is the only edge. There is no CDN and no load balancer in front of it; the client-address trust model in `DEPLOYMENT.md` depends on that.
4. **PostgreSQL is self-managed** in a container with a named volume. pg-boss uses the same database, so there is still no second data store.
5. **Images are built in GitHub Actions and pulled from GHCR** (`.github/workflows/deploy.yml`), behind an approval on the GitHub Environment `production`. Building on the server (`infra/vps/deploy.sh` without arguments) stays supported as the manual path, one image at a time.
6. **Backups are ours to run**: a nightly `pg_dump`, encrypted with age to a public key, kept 7 daily and 4 weekly, copied to an S3-compatible bucket in Australia (`infra/vps/backup.sh`, `restore.sh`).
7. **There is no staging environment and there are no per-pull-request previews.** CI builds all four images and runs the test suites; the first place a change runs for real is production. Stripe test keys and the six read-only sample invitations are the pre-release checks available today.

## Consequences

**Accepted risks**

- **Single point of failure.** One disk, one machine, one availability zone. Losing the server loses the service until it is rebuilt from the repository, the `.env` and the newest backup.
- **Recovery objectives are modest.** Recovery point: up to 24 hours of data (the last nightly backup), because there is no point-in-time recovery. Recovery time: a few hours of hands-on work. Both are written down in `DEPLOYMENT.md` and rehearsed with the restore drill.
- **We are the database administrators.** Upgrades, disk space, vacuum and backup verification are our job, not a provider's.
- **Deploys are not zero-downtime.** Replacing a container interrupts it for the seconds it takes to start (the API takes longest because it runs through `tsx`).
- **2 GB is tight.** The container memory limits add up to more than the RAM; the swap file absorbs peaks. See "Capacity".

**What gets easier**

- One place to look, one bill, one set of logs.
- Data residency is simple to state: everything we store is on one server in Sydney, plus encrypted backups in an Australian bucket.
- No provider lock-in. The stack is plain containers and can move to any host that runs Docker.

## Capacity

The 2 GB plan runs the stack, but with no headroom:

- Memory limits: db 512 MB + api 384 MB + worker 320 MB + marketing 448 MB + invitation 448 MB + caddy 128 MB = **2,240 MB**, on a machine with about 1.9 GB usable. The limits are ceilings, not reservations, and typical use is lower, but a busy hour pushes the server into swap.
- A Next.js production build needs about 1.3 GB of heap (`NODE_OPTIONS=--max-old-space-size=1280` in the Dockerfiles). Building on the server therefore competes with the running site for the same 2 GB, which is why builds there are capped and run strictly one at a time. Building in GitHub Actions removes that pressure but not the steady-state squeeze.

**Recommendation: move to the 4 GB plan (`vc2-2c-4gb`, 2 vCPU).** The exact reason is the sum above: the limits we consider safe for each service already exceed the RAM of the 2 GB plan, so normal operation depends on swap, and the manual build path cannot run alongside the live site without risking an out-of-memory stall. 4 GB covers the limits with room for the page cache PostgreSQL relies on, and the second vCPU stops one slow request or a backup from starving everything else. The plan size is the founder's call (cost); nothing in the repository needs to change for it.

## Data residency (amends ADR-0008)

| Service                             | Data                                       | Location                     | Status                                                                   |
| ----------------------------------- | ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------ |
| Vultr VPS (replaces Supabase, Neon) | All core data, the job queue, request logs | Sydney                       | OK                                                                       |
| Vultr VPS (replaces Vercel)         | Request processing for the web apps        | Sydney                       | OK. No edge cache exists, so nothing personalised is cached off the box. |
| Backup bucket (S3-compatible)       | Encrypted database archives                | Must be an Australian region | OK once provisioned in AU. Archives are encrypted before upload.         |
| GitHub Container Registry           | Container images (code and dependencies)   | Global                       | No personal data. Never bake secrets or data into an image.              |
| Let's Encrypt and ZeroSSL           | Hostnames, for certificate issuance        | Global                       | No personal data.                                                        |

Stripe, Resend, Twilio, R2, Gemini and Xero are unchanged from ADR-0008.

## Rejected for now

- **Fly.io + Supabase + Vercel (the original plan).** Still a reasonable target. Rejected today because it was never provisioned and the running system works. Nothing here prevents it later.
- **Managed PostgreSQL next to the VPS.** Would buy point-in-time recovery and failover. Worth revisiting first when a trigger below is met, because it removes the largest risk without moving the applications.
- **Kubernetes or Nomad on the VPS.** No benefit on one node.

## Revisit when

- the first paying customer's event is on the platform (the recovery objectives above stop being acceptable);
- a restore drill fails, or a backup is missed two nights running;
- the server swaps continuously on the plan in use, or a deploy needs more than a few minutes of downtime;
- a second engineer needs a staging environment to work safely.

## Where the details live

`DEPLOYMENT.md` (the runbook), `infra/ENVIRONMENTS.md` (every variable), `infra/vps/` (Compose files, Caddyfile, scripts), `.github/workflows/deploy.yml` (continuous deployment).
