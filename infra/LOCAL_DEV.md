# Local Development Guide (`infra/LOCAL_DEV.md`)

This guide covers everything needed to run the Managevent monorepo locally on macOS, Linux, or Windows.

## 1. Prerequisites

- **Node.js 22 LTS** (`.nvmrc` specifies `22`)
- **pnpm 10** via Corepack (`corepack enable`)
- **Docker** (for `docker-compose.yml` running PostgreSQL 16 on port `5432`, or a local PostgreSQL 16+ instance)

## 2. First-time setup

From the repository root:

```bash
# 1. Enable pnpm via Corepack
corepack enable

# 2. Copy .env.example to .env (never commit .env)
cp .env.example .env

# 3. Start PostgreSQL 16 (database: managevent, port: 5432)
docker compose up -d

# 4. Install dependencies, apply Prisma migrations, and seed Perth placeholder data
pnpm install
pnpm db:migrate
pnpm db:seed
```

## 3. Running services locally

```bash
# Start the Hono API server on http://localhost:4000
pnpm --filter @managevent/api dev

# Start the pg-boss background worker
pnpm --filter @managevent/worker dev
```

Verify the API health endpoint and lead creation:

```bash
curl http://localhost:4000/health

curl -X POST http://localhost:4000/v1/leads \
  -H "Content-Type: application/json" \
  -d '{"source":"BUILDER","name":"Sara Ahmadi","email":"sara@example.com","preferredLanguage":"fa"}'
```

## 4. Quality checks (run before every PR)

```bash
pnpm validate:content
pnpm db:drift-check
pnpm --filter @managevent/api-client generate:check
pnpm format:check
pnpm turbo run lint typecheck test build
```

## 5. Security and privacy rules in local dev

- **Never use real personal data** in local seeds, fixtures, or tests.
- **Stripe, Resend, Twilio, R2 and Gemini** run in mock or test mode locally (`sk_test_...`).
- **Never commit `.env`**, salts, or API keys.
