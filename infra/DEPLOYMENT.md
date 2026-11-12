# Deployment

This page moved. The single description of how Managevent is deployed is the root [`DEPLOYMENT.md`](../DEPLOYMENT.md).

Production is **one Vultr VPS in Sydney** running Docker Compose ([ADR-0011](../docs/architecture/adr/0011-production-on-single-sydney-vps.md)). The earlier plan on this page (one Vercel project per web app, the API and worker on Fly.io, PostgreSQL on Supabase) was never provisioned and has been removed, together with `fly.toml`, `vercel.json` and the `deploy-fly` CI job.

Mobile (EAS) and Windows (Tauri) releases are not built yet. Their release process will be documented with those apps.
