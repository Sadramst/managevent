# Deployment

- **Web apps:** one Vercel project each, with root directory `apps/<name>`, the build command `turbo run build --filter=@managevent/<name>`, and functions in `syd1`. Ignored build step: `npx turbo-ignore`.
- **API and worker:** Docker images built in GitHub Actions, deployed to Fly.io `syd` (D-01). Migrations run as a release command: `prisma migrate deploy`.
- **Mobile:** EAS Build (profiles: development, preview, production), EAS Submit, and EAS Update channels per environment.
- **Windows:** `tauri build` on a `windows-latest` runner, code-signed MSI or MSIX, and an update manifest hosted on R2 (public) with signature verification.
- **Promotion:** merge to `main` deploys to staging. A tagged release (`v*`) deploys to production with manual approval in GitHub Environments.
