# ADR-0001: Turborepo + pnpm monorepo

- **Status:** Accepted. Current state (2026-11-13): of the nine apps, `api`, `worker`, `marketing` and `invitation` are built; `admin` is a small helper package used by the staff console in `apps/marketing`; `portal`, `vendors`, `mobile` and `desktop-win` are placeholders (ROADMAP PRT, VEN, MOB, WIN). CI runs lint, typecheck, test and build through Turbo; no remote cache is configured.
- **Context:** We have 9 deployables across web, mobile and desktop. They share types, validation, i18n, design tokens and business rules (GST, pricing, logistics), and several AI agents build them in parallel.
- **Decision:** One repository using pnpm workspaces and Turborepo. Workspaces are named `@managevent/<name>`. Internal packages are consumed as TypeScript source ("just-in-time" packages) unless the package needs a build step (for example `db` with Prisma generate, or `ui` CSS).
- **Consequences:**
  - Contract changes are atomic across apps.
  - CI runs `turbo run lint typecheck test build`, with remote caching added later.
  - Expo needs `node-linker` care. See `apps/mobile/AGENTS.md`.
