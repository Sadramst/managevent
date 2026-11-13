# syntax=docker/dockerfile:1
#
# Managevent worker (pg-boss consumer on Node 22, run through tsx: there is no compile step).
# The build context is the repository root:
#   docker build -f apps/worker/Dockerfile -t managevent-worker:local .

FROM node:25-alpine AS base
# openssl: Prisma's engines link against it. ca-certificates: outbound TLS (Resend).
# corepack provides the pnpm version pinned in the root package.json ("packageManager").
# /app and the pnpm store belong to the unprivileged `node` user (uid 1000), which installs,
# builds and runs everything below: nothing in this image runs as root after this layer.
RUN apk add --no-cache openssl ca-certificates \
 && corepack enable \
 && mkdir -p /app /pnpm/store \
 && chown node:node /app /pnpm/store
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app

# Collects only the files that decide what `pnpm install` does: every workspace manifest, the
# lockfile, the pnpm settings and the Prisma schema (packages/db generates its client in a
# postinstall script). The next stage copies this folder, and Docker keys that copy on file
# contents, so the install layer is reused whenever none of these files changed.
FROM base AS manifests
WORKDIR /src
COPY . .
RUN set -eu; mkdir -p /out/packages/db/prisma; \
    cp package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /out/; \
    for manifest in apps/*/package.json packages/*/package.json; do \
      mkdir -p "/out/$(dirname "$manifest")"; \
      cp "$manifest" "/out/$manifest"; \
    done; \
    cp packages/db/prisma/schema.prisma /out/packages/db/prisma/schema.prisma

FROM base AS deps
WORKDIR /app
USER node
COPY --chown=node:node --from=manifests /out/ ./
# Installs this app and the workspace packages it depends on, nothing else (no mobile, desktop
# or browser-test dependencies). devDependencies are kept on purpose: tsx is a devDependency
# and is needed at run time. NODE_ENV is therefore set only later.
# The pnpm store is a BuildKit cache mount: it survives between builds on the same machine and
# never ends up in the image.
RUN --mount=type=cache,id=managevent-pnpm-store,target=/pnpm/store,uid=1000,gid=1000,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter "@managevent/worker..."

FROM deps AS runner
COPY --chown=node:node . .
# Regenerates the Prisma client from the schema that was just copied (cheap, and independent
# of whether the install layer above came from cache).
RUN pnpm --filter @managevent/db db:generate

ENV NODE_ENV=production

# No HTTP port and no health endpoint: this is a pg-boss consumer, not a web service. It exits
# non-zero when it cannot start, and the restart policy brings it back.
# Started with node directly (tsx as a loader) rather than through pnpm: one process instead of
# three, and SIGTERM reaches the worker.
WORKDIR /app/apps/worker
CMD ["node", "--import", "tsx", "src/index.ts"]
