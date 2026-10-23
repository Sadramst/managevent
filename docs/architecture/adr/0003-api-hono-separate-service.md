# ADR-0003: A separate API service (Hono) and worker in Sydney

- **Status:** Accepted
- **Context:** Mobile, desktop and five web apps all need one authorisation layer, plus webhooks, long-running jobs (reminders, payouts, media, AI) and scheduled tasks.
- **Decision:**
  - `apps/api` is built with Hono on Node 22, uses Zod validators from `packages/validators`, and generates OpenAPI from them. Routes are versioned under `/v1`.
  - `apps/worker` uses **pg-boss**, a Postgres-backed queue, so no extra data store or region is needed.
  - Both run as containers in Sydney. The default host is Fly.io `syd`. The alternative is AWS ECS Fargate in `ap-southeast-2` (see OPEN_DECISIONS D-01).
- **Consequences:**
  - Web apps never import Prisma.
  - `packages/api-client` is the typed client.
  - The worker is idempotent, and every job carries a dedupe key.
