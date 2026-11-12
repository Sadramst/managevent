# Local Development Guide (`infra/LOCAL_DEV.md`)

This guide covers everything needed to run the Managevent monorepo locally on macOS, Linux, or Windows.

## 1. Prerequisites

- **Node.js 22 LTS or newer** (`.nvmrc` specifies `22`)
- **pnpm 10** via Corepack (`corepack enable`)
- **PostgreSQL 16** on `localhost:5432`, from one of:
  - **No Docker (works on Windows):** `pnpm db:local`, see §3. Nothing to install beyond `pnpm install`.
  - **Docker:** `docker compose up -d` (`docker-compose.yml`, `postgres:16-alpine`).
  - Your own PostgreSQL 16+ with user `postgres`, password `postgres`, database `managevent`.

All three use the same connection string, so `.env` is identical:
`postgresql://postgres:postgres@localhost:5432/managevent`.

## 2. First-time setup

From the repository root:

```bash
# 1. Enable pnpm via Corepack
corepack enable

# 2. Install dependencies (also downloads the PostgreSQL 16 binaries used by `pnpm db:local`)
pnpm install

# 3. Copy .env.example to .env (never commit .env), then fill in the three local secrets
cp .env.example .env
node scripts/generate-deployment-secrets.mjs   # prints PII_ENCRYPTION_KEY, BETTER_AUTH_SECRET, GUEST_TOKEN_PEPPER

# 4. Start PostgreSQL 16 (database: managevent, port: 5432). Pick one:
pnpm db:local:detach      # no Docker: runs in the background
docker compose up -d      # Docker

# 5. Apply Prisma migrations and seed the Perth placeholder data
pnpm db:migrate
pnpm db:drift-check
pnpm db:seed
```

Keep `APP_ENV=local` in `.env`. The database URLs in `.env.example` already point at the local database.

## 3. PostgreSQL without Docker (`pnpm db:local`)

`scripts/dev-db.mjs` runs the real PostgreSQL 16 server binaries that ship with the
`embedded-postgres` npm package (a root devDependency). It is a normal PostgreSQL server, not an
emulator. The cluster lives in the gitignored `.local/pg` directory and the server log is
`.local/pg.log`.

| Command                | What it does                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:local`        | Creates the cluster and the `managevent` database if missing, starts PostgreSQL and stays in the foreground. Ctrl+C stops it cleanly.          |
| `pnpm db:local:detach` | Same, but starts PostgreSQL in the background and returns. It keeps running after the terminal closes, until `pnpm db:local:stop` or a reboot. |
| `pnpm db:local:stop`   | Fast, clean shutdown (also ends a foreground `pnpm db:local`).                                                                                 |
| `pnpm db:local:status` | Prints the server version and URL. Exit code 0 when running, 3 when stopped.                                                                   |
| `pnpm db:local:reset`  | Drops and recreates the `managevent` database (empty). Run `pnpm db:migrate` and `pnpm db:seed` afterwards.                                    |

Notes:

- Starting twice is safe: the second `pnpm db:local` reports that PostgreSQL is already running and exits 0.
- Settings match `docker-compose.yml`: port `5432`, user `postgres`, password `postgres`, timezone `Australia/Perth`. The cluster is created with `UTF8` encoding and the `C` locale, because Windows locale names are often rejected by `initdb`.
- **Windows: use a normal terminal, not "Run as administrator".** PostgreSQL refuses to run with administrator rights; the script says so if that is the cause of a failure.
- If port `5432` is taken by something else (a Docker container, a PostgreSQL Windows service), the script stops with a message. Stop the other server first.
- To start from nothing, run `pnpm db:local:stop` and delete `.local/pg`.
- Local development only. Never use real personal data in it.

## 4. Environment variables (`scripts/with-env.mjs`)

Nothing in the repo reads `.env` by itself: there is no dotenv, the apps read `process.env`, and Prisma only looks for `.env` next to its own schema. `scripts/with-env.mjs` loads the root `.env` and then runs a command, so you never have to export variables by hand.

These root scripts already go through it: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `pnpm db:migrate`, `pnpm db:drift-check`, `pnpm db:seed`.

For anything else, prefix the command with `pnpm with-env`:

```bash
pnpm with-env pnpm --filter @managevent/api dev
pnpm with-env pnpm --filter @managevent/db test
pnpm with-env pnpm turbo run typecheck lint test --continue
pnpm with-env pnpm --filter @managevent/db exec prisma studio
```

Rules of the wrapper:

- Variables already set in your shell (or in CI) win over `.env`.
- Empty values in `.env` are skipped.
- `NODE_ENV` is never taken from `.env`. Next.js, Vitest and tsx set it per command, and forcing `development` breaks `next build` and test runs.
- Without a `.env` file (CI) the command runs unchanged.

Turborepo passes the variables listed under `globalEnv` in `turbo.json` to tasks. If a task needs a new variable, add it there.

## 5. Running services locally

```bash
# Start the Hono API server on http://localhost:4000
pnpm with-env pnpm --filter @managevent/api dev

# Start the pg-boss background worker
pnpm with-env pnpm --filter @managevent/worker dev
```

Verify the API health endpoint and lead creation:

```bash
curl http://localhost:4000/health

curl -X POST http://localhost:4000/v1/leads \
  -H "Content-Type: application/json" \
  -d '{"source":"BUILDER","name":"Sara Ahmadi","email":"sara@example.com","preferredLanguage":"en"}'
```

## 6. Quality checks (run before every PR)

The database must be running for the `@managevent/db`, `@managevent/api`, `@managevent/worker` and `@managevent/api-client` tests.

```bash
pnpm validate:content
pnpm db:drift-check
pnpm --filter @managevent/api-client generate:check
pnpm format:check
pnpm with-env pnpm turbo run lint typecheck test build
```

`@managevent/db#build` only type-checks. The Prisma client is generated by the `@managevent/db#db:generate` task, which every `build`, `typecheck` and `test` task depends on in `turbo.json`. Generating it a second time inside `build` raced with the first on Windows (the Prisma engine file was locked).

On Windows, stop the API and worker dev servers before `pnpm install` or `pnpm db:generate`: a running process keeps the Prisma engine file locked.

## 7. Security and privacy rules in local dev

- **Never use real personal data** in local seeds, fixtures, or tests.
- **Stripe, Resend, Twilio, R2 and Gemini** run in mock or test mode locally (`sk_test_...`).
- **Never commit `.env`**, salts, or API keys. `.env` and `.local/` are gitignored.
