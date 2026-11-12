# Local development

Running the monorepo on a developer machine (Windows, macOS or Linux). No Docker is needed. The short version is the Quick start in the root [`README.md`](../README.md); this page explains each step. Every variable is described in [`ENVIRONMENTS.md`](ENVIRONMENTS.md).

## 1. Prerequisites

- **Node.js 22.12 or later.** CI uses Node 22 from `.nvmrc`; `engines` requires `>=22.12`.
- **pnpm 10** through Corepack (`corepack enable`).
- **PostgreSQL 16 on `localhost:5432`**, from one of:
  - **No Docker (works on Windows):** `pnpm db:local:detach`, see §3. Nothing to install beyond `pnpm install`.
  - **Docker:** `docker compose up -d` (root `docker-compose.yml`, `postgres:16-alpine`).
  - Your own PostgreSQL 16 with user `postgres`, password `postgres`, database `managevent`.

All three use the same connection string, already in `.env.example`: `postgresql://postgres:postgres@localhost:5432/managevent`.

## 2. First-time setup

From the repository root:

```bash
corepack enable
pnpm install                                   # also fetches the PostgreSQL 16 binaries for db:local

cp .env.example .env                           # never commit .env
node scripts/generate-deployment-secrets.mjs   # prints KEY=value lines. Copy PII_ENCRYPTION_KEY, BETTER_AUTH_SECRET,
                                               # GUEST_TOKEN_PEPPER and API_PROXY_SECRET into .env. Do NOT copy
                                               # POSTGRES_PASSWORD: the local database uses postgres/postgres.

pnpm db:local:detach                           # or: docker compose up -d
pnpm db:migrate                                # apply Prisma migrations
pnpm db:seed                                   # Perth catalogue placeholders from content/
pnpm with-env pnpm --filter @managevent/api seed:demo   # the six read-only sample invitations
```

Keep `APP_ENV=local` in `.env`. Leave `STRIPE_*` and `RESEND_API_KEY` empty unless you are testing those providers: without them the API reports payments and email as not configured (`503`) and the UI does not offer them. Nothing is mocked.

## 3. PostgreSQL without Docker (`pnpm db:local`)

`scripts/dev-db.mjs` runs the real PostgreSQL 16 server binaries that ship with the `embedded-postgres` npm package, a root devDependency allowed for local use only by [ADR-0012](../docs/architecture/adr/0012-embedded-postgres-dev-exception.md). The cluster lives in the gitignored `.local/pg` folder and the server log is `.local/pg.log`.

| Command                | What it does                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:local`        | Creates the cluster and the `managevent` database if missing, starts PostgreSQL in the foreground. Ctrl+C stops it cleanly. |
| `pnpm db:local:detach` | The same, in the background. It keeps running after the terminal closes, until `pnpm db:local:stop` or a reboot.            |
| `pnpm db:local:stop`   | Fast, clean shutdown (also ends a foreground `pnpm db:local`).                                                              |
| `pnpm db:local:status` | Prints the server version and URL. Exit code 0 when running, 3 when stopped.                                                |
| `pnpm db:local:reset`  | Drops and recreates the `managevent` database (empty). Run `pnpm db:migrate` and `pnpm db:seed` afterwards.                 |

- Starting twice is safe: the second start reports that PostgreSQL is already running and exits 0.
- Settings match `docker-compose.yml`: port `5432`, user `postgres`, password `postgres`, time zone `Australia/Perth`, `UTF8` encoding with the `C` locale (Windows locale names are often rejected by `initdb`).
- **Windows: use a normal terminal, not "Run as administrator".** PostgreSQL refuses to run with administrator rights.
- If port `5432` is taken (a Docker container, a PostgreSQL Windows service), the script stops with a message. Stop the other server first.
- To start from nothing: `pnpm db:local:stop`, then delete `.local/pg`.
- Never put real personal data in it.

## 4. Environment variables (`pnpm with-env`)

Nothing in the repository reads `.env` by itself: there is no dotenv, the apps read `process.env`, and Prisma only looks for `.env` next to its own schema. `scripts/with-env.mjs` loads the root `.env` and then runs a command.

These root scripts already go through it: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `pnpm db:migrate`, `pnpm db:drift-check`, `pnpm db:seed`. For anything else, prefix the command with `pnpm with-env`:

```bash
pnpm with-env pnpm --filter @managevent/db test
pnpm with-env pnpm --filter @managevent/db exec prisma studio
```

Rules of the wrapper:

- Variables already set in your shell (or in CI) win over `.env`.
- Empty values in `.env` are skipped.
- `NODE_ENV` is never taken from `.env`: Next.js, Vitest and tsx set it per command, and forcing `development` breaks `next build` and test runs.
- Without a `.env` file (CI) the command runs unchanged.

Turborepo passes only the variables listed under `globalEnv` in `turbo.json` to tasks. If a task needs a new variable, add it there.

## 5. Running the apps

Each in its own terminal (or all at once with `pnpm dev`):

```bash
pnpm with-env pnpm --filter @managevent/api dev          # API         http://localhost:4000
pnpm with-env pnpm --filter @managevent/worker dev       # worker      (no port)
pnpm with-env pnpm --filter @managevent/marketing dev    # www, /admin http://localhost:3100
pnpm with-env pnpm --filter @managevent/invitation dev   # invitation  http://localhost:3001
```

- Check the API: `curl http://localhost:4000/health`.
- Sign up as a host at `http://localhost:3001/sign-up`; the sample invitations are linked from the invitation home page.
- To use the staff console at `http://localhost:3100/admin`, create a staff account (password plus TOTP) with `staff:create`; the command and its options are in [`apps/api/README.md`](../apps/api/README.md).
- The browser talks to the API only through each web app's same-origin `/api/auth` proxy; every other call is made server-side.

## 6. Quality checks (before every pull request)

PostgreSQL must be running: the `db`, `api`, `worker` and `api-client` tests use it.

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # the gate
pnpm validate:content
pnpm db:drift-check
pnpm --filter @managevent/api-client generate:check
pnpm exec prettier --check <the files you changed>
pnpm test:e2e                                            # Playwright; set-up in each web app's README
```

Run Prettier on the files you changed only, never repository-wide. CI (`.github/workflows/ci.yml`) runs the gate plus content validation, drift check, OpenAPI client freshness, `pnpm format:check`, the marketing Playwright suite, the Docker image builds, the Compose and Caddyfile checks and a secret scan.

`@managevent/db#build` only type-checks. The Prisma client is generated by the `@managevent/db#db:generate` task, which every `build`, `typecheck` and `test` task depends on in `turbo.json`. On Windows, stop the API and worker dev servers before `pnpm install` or `pnpm db:generate`: a running process keeps the Prisma engine file locked.

## 7. Privacy rules for local work

- **Never use real personal data** in seeds, fixtures or tests.
- **Never commit `.env`**, salts or keys. `.env` and `.local/` are gitignored.
- Use Stripe test keys (`sk_test_...`) only, and only when you are testing payments.
