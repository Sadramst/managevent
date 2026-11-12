# Production deploy runbook

This page moved. The runbook is the root [`DEPLOYMENT.md`](../DEPLOYMENT.md). The Fly.io, Vercel and Supabase instructions that used to be here described a setup that was never provisioned ([ADR-0011](../docs/architecture/adr/0011-production-on-single-sydney-vps.md)).

| You want to                                | Go to                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Ship this release                          | [Go-live checklist](../DEPLOYMENT.md#go-live-checklist-for-this-release) |
| Deploy a change                            | [Updating](../DEPLOYMENT.md#updating)                                    |
| Go back to the previous version            | [Rollback](../DEPLOYMENT.md#rollback)                                    |
| Set up deploys from GitHub Actions         | [Continuous deployment](../DEPLOYMENT.md#continuous-deployment)          |
| Back up, run a restore drill, or restore   | [Backups and restore](../DEPLOYMENT.md#backups-and-restore)              |
| Know what a variable does                  | [`ENVIRONMENTS.md`](ENVIRONMENTS.md)                                     |
| Change DNS, or set up email records        | [`DOMAINS_AND_DNS.md`](DOMAINS_AND_DNS.md)                               |
| Respond to an outage or a suspected breach | [`INCIDENT_RUNBOOK.md`](INCIDENT_RUNBOOK.md)                             |

## Looking at enquiries

Use the staff console (`https://www.managevent.com.au/admin`). It is the supported way to read enquiries: it requires a staff sign-in with two-factor authentication, and changes are audited. Do not query the `Lead` table by hand except during an incident, and then treat the output as personal information.
