# ADR-0004: PostgreSQL + Prisma in Sydney

- **Status:** Accepted; Step 2 founder approval confirmed Supabase Sydney on 2026-10-23.
- **Decision:**
  - PostgreSQL 16+ in `ap-southeast-2`.
  - **Supabase Sydney** (`ap-southeast-2`) is the production provider. `DATABASE_URL` and `DIRECT_URL` both use its **session-mode pooler**, not the transaction pooler: migrations and pg-boss require session semantics.
  - **Prisma 6.x is pinned** (currently `prisma` and `@prisma/client` at `6.19.3`). Keep CLI and client versions aligned. This preserves the tested schema datasource configuration, migration commands and generated-client encryption extension. Prisma 7 changes datasource configuration and requires a driver-adapter/client migration; that coordinated change is deferred, not a reason to weaken tests or replace database environment variables. Revisit the pin as a dedicated, tested upgrade.
  - Migrations are append-only and run by CI on deploy.
- **Rules:**
  - Do not use Supabase Auth or Supabase Storage. Auth is Better Auth and storage is R2. This keeps the provider swappable.
  - If Supabase Realtime is used, it is used only for broadcast. Row data is still fetched through the API.
