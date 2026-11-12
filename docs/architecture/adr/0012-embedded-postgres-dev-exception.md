# ADR-0012: `embedded-postgres` (beta-tagged) is allowed for local development only

- **Status:** Accepted on 2026-11-12.
- **Rule this is an exception to:** root `AGENTS.md` §3, "Do not use RC or beta versions unless an ADR allows it."

## Context

Developers and coding agents on Windows machines without Docker could not run the test suites, because the API, worker and database tests need a real PostgreSQL 16. `scripts/dev-db.mjs` (`pnpm db:local`) solves that by starting the PostgreSQL server binaries that ship inside the `embedded-postgres` npm package, against a cluster in the gitignored `.local/pg` folder.

The package is pinned in the root `package.json` as `embedded-postgres@16.15.0-beta.19`. The version carries a `-beta` suffix because of how the package is published: the number before the suffix is the PostgreSQL version it bundles (16.15), and the pinned release has no non-beta counterpart to choose instead. What runs is the ordinary PostgreSQL 16 server, not an emulator and not a pre-release of PostgreSQL.

## Decision

`embedded-postgres` may be used at a beta-tagged version, under all of these conditions:

1. **Root `devDependencies` only**, pinned to an exact version. No app or package may depend on it.
2. **Imported by `scripts/dev-db.mjs` only.** Application code, tests and other scripts reach the database through `DATABASE_URL` and cannot tell which PostgreSQL is behind it.
3. **Never started outside a developer machine.** CI uses the `postgres:16-alpine` service container. Production uses the `postgres:16-alpine` container in `infra/vps/docker-compose.yml` (ADR-0011).
4. **Same major version as production** (16). Bump it together with the production image.
5. **No real personal data** in the local cluster, as for any local database.

## Consequences

- Local development works without Docker on Windows, macOS and Linux. Docker (`docker-compose.yml` in the repository root) and a self-installed PostgreSQL remain supported and use the same connection string.
- **The package is present in the production images, unused.** A filtered `pnpm install` still installs the root project's `devDependencies`, so `node_modules/embedded-postgres` and its Linux binaries end up in each image. Nothing imports or starts them there, and pnpm does not run the package's install script (it is not in `pnpm.onlyBuiltDependencies`). The cost is image size, not behaviour. Removing it from the images means moving the dependency out of the root manifest, which is the lockfile owner's change to make.
- A beta tag means the wrapper's JavaScript API can change between releases. Only `scripts/dev-db.mjs` would need to follow.

## Revisit when

- the package publishes a stable (non-beta) release for PostgreSQL 16 or later: pin that and close this exception;
- production moves to a new PostgreSQL major version;
- the local cluster ever behaves differently from the `postgres:16-alpine` image in a way that hides or invents a bug.
