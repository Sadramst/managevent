# scripts/

Repo-level Node scripts. Run them from the repo root through the root `package.json` scripts where one exists.

| Script                            | Run with                                                                                 | Purpose                                                                                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `with-env.mjs`                    | `pnpm with-env <command>`                                                                | Run a command with the root `.env` loaded. Nothing else reads `.env`; `pnpm dev`, `build`, `test`, `db:migrate` and `db:seed` go through it. Shell and CI variables win; `NODE_ENV` is never taken from `.env`. |
| `dev-db.mjs`                      | `pnpm db:local`, `db:local:detach`, `db:local:stop`, `db:local:status`, `db:local:reset` | Local PostgreSQL 16 without Docker on port 5432 (`postgres`/`postgres`, database `managevent`), stored in `.local/pg` (ADR-0012). Local development only.                                                       |
| `validate-content.mjs`            | `pnpm validate:content`                                                                  | Structural checks of `content/` against `content/schemas` (CI runs it). See [`content/README.md`](../content/README.md).                                                                                        |
| `generate-deployment-secrets.mjs` | `node scripts/generate-deployment-secrets.mjs [--out <file>]`                            | Print `POSTGRES_PASSWORD`, `PII_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, `GUEST_TOKEN_PEPPER` and `API_PROXY_SECRET` as `KEY=value`, or write them to a new `0600` file. New values on every run.                 |

Local setup that uses them: [`infra/LOCAL_DEV.md`](../infra/LOCAL_DEV.md). Production secrets: [`DEPLOYMENT.md`](../DEPLOYMENT.md).

**Planned scripts** (not written yet):

| Script                    | ROADMAP item | Purpose                                                                    |
| ------------------------- | ------------ | -------------------------------------------------------------------------- |
| SEO thin-content guard    | MKT-10       | Fail CI when an indexable city page is below the agreed word count.        |
| Legacy anniversary import | INV-14       | Create the Appilico anniversary event and its `LegacySlug` rows, run once. |
