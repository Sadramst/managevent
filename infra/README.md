# Infrastructure

Production is one Vultr VPS in Sydney running Docker Compose ([ADR-0011](../docs/architecture/adr/0011-production-on-single-sydney-vps.md)). **Start with the root [`DEPLOYMENT.md`](../DEPLOYMENT.md)**: it is the single runbook, and the files here support it.

| File                                         | Contents                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`../DEPLOYMENT.md`](../DEPLOYMENT.md)       | What is live, go-live checklist, update, rollback, backups, secrets, troubleshooting      |
| [`ENVIRONMENTS.md`](ENVIRONMENTS.md)         | Every environment variable: which service reads it and what breaks without it             |
| [`DOMAINS_AND_DNS.md`](DOMAINS_AND_DNS.md)   | DNS records, email records, reserved hostnames                                            |
| [`INCIDENT_RUNBOOK.md`](INCIDENT_RUNBOOK.md) | Outages, and the Notifiable Data Breaches procedure                                       |
| [`LOCAL_DEV.md`](LOCAL_DEV.md)               | Running the monorepo on a developer machine                                               |
| [`vps/`](vps/README.md)                      | The production stack itself: Compose files, Caddyfile, deploy, backup and restore scripts |
| `DEPLOYMENT.md`, `DEPLOY_RUNBOOK.md`         | Short pointers to the root `DEPLOYMENT.md`, kept so that old links still land somewhere   |

There is no infrastructure-as-code for the server itself: it is provisioned by hand from the commands in `DEPLOYMENT.md` ("First-time provisioning"). Everything that runs on it is defined in `infra/vps/`.
