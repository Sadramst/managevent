# Infrastructure

Production is one Vultr VPS in Sydney running Docker Compose and Caddy ([ADR-0011](../docs/architecture/adr/0011-production-on-single-sydney-vps.md)). There is no Vercel, Fly.io or Supabase, and no staging environment. **The runbook is the root [`DEPLOYMENT.md`](../DEPLOYMENT.md)**; the files here support it. This branch has not been deployed yet (ROADMAP OPS-01).

| File                                         | Contents                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`../DEPLOYMENT.md`](../DEPLOYMENT.md)       | What runs where, go-live checklist, updating, rollback, backups, secrets, troubleshooting |
| [`ENVIRONMENTS.md`](ENVIRONMENTS.md)         | Every environment variable: which service reads it and what breaks without it             |
| [`DOMAINS_AND_DNS.md`](DOMAINS_AND_DNS.md)   | DNS records, email records, reserved hostnames                                            |
| [`INCIDENT_RUNBOOK.md`](INCIDENT_RUNBOOK.md) | Outages, and the Notifiable Data Breaches procedure                                       |
| [`LOCAL_DEV.md`](LOCAL_DEV.md)               | Running the monorepo on a developer machine (no Docker needed)                            |
| [`vps/`](vps/README.md)                      | The production stack: Compose files, Caddyfile, deploy, backup and restore scripts        |

There is no infrastructure-as-code for the server itself: it is provisioned by hand from "First-time provisioning" in `DEPLOYMENT.md`. Everything that runs on it is defined in `infra/vps/`. Mobile (EAS) and Windows (Tauri) releases do not exist yet (MOB-07, WIN-01).

**Reading enquiries in production:** use the staff console at `https://www.managevent.com.au/admin` (staff sign-in with TOTP; changes are audited). Do not query the `Lead` table by hand except during an incident, and then treat the output as personal information.
