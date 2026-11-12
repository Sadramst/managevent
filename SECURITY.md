# Security Policy

## Reporting a vulnerability

Email **security@managevent.com.au** (placeholder: create this mailbox before launch). Do not open public issues for security problems.

## Ground rules

- This repository must stay **private**. Never commit secrets, salts, API keys, certificates, signing keys, `.env` files or real guest data.
- **Where secrets live.** Production: `infra/vps/.env` on the Sydney server (mode `0600`, gitignored, excluded from every image), with a copy in the owner's password manager. Deployment: the GitHub Environment `production` (SSH key and host details for the Deploy workflow). CI: test-only placeholders in the workflow file. There is no other secret store. The list of variables, and what rotating each one costs, is in [`infra/ENVIRONMENTS.md`](infra/ENVIRONMENTS.md).
- If a secret is committed or pasted somewhere by mistake, **rotate it immediately**. Rewriting git history is not enough. The steps for each secret are in [`infra/INCIDENT_RUNBOOK.md`](infra/INCIDENT_RUNBOOK.md).
- Data breaches involving personal information may be notifiable under the Notifiable Data Breaches scheme. See [`infra/INCIDENT_RUNBOOK.md`](infra/INCIDENT_RUNBOOK.md) and `docs/compliance/PRIVACY.md` §Breach response.

## How production is protected

The full description is in [`DEPLOYMENT.md`](DEPLOYMENT.md); the decision record is [ADR-0011](docs/architecture/adr/0011-production-on-single-sydney-vps.md).

- **Network.** One server in Sydney. The firewall allows 22, 80 and 443. Only Caddy publishes ports; PostgreSQL and the application ports are reachable from the Docker network only.
- **Transport.** Caddy terminates TLS with automatically renewed certificates and sends HSTS on every hostname.
- **Client address.** Rate limits, sign-in lockouts and audit rows use an address the caller cannot choose: Caddy overwrites every header our code would accept, and the API believes a forwarded address only with a secret shared between our own containers (`DEPLOYMENT.md`, "Client address trust model").
- **Containers.** The four application images run as an unprivileged user with `no-new-privileges`. Images contain no secrets and no data.
- **Staff access.** The staff console is `www.managevent.com.au/admin`. It has no separate network gate: access is a staff role plus two-factor authentication, enforced by the API on every request. Staff accounts are created only with the `staff:create` tool on the server.
- **Logs.** Application logs carry no request bodies and redact guest tokens. Caddy's access log replaces guest-link paths and query strings, drops headers and truncates addresses. Every container log is size-capped.
- **Backups.** Nightly, encrypted with age to a public key whose private half is not on the server, kept in Australia. Guest health fields are additionally encrypted in the database with `PII_ENCRYPTION_KEY`.
- **Deployments.** Images are built in GitHub Actions from `main` after CI passes, and rolled out only after an approval on the `production` environment. Workflows use least-privilege `permissions`, and the server's registry login lasts for one run.

## Known limits

- SSH (port 22) is open to the internet. Confirm that password login is disabled on the server (`PasswordAuthentication no`). Restricting port 22 to known addresses, or putting it behind a VPN, is recommended and is the owner's call.
- There is no web application firewall, no intrusion detection and no uptime monitoring yet.
- One server holds both the database and the encryption key for its health fields; see ADR-0011 for the accepted risks.
