# syntax=docker/dockerfile:1
#
# Managevent invitations (Next.js, invitation.managevent.com.au).
# The build context is the repository root:
#   docker build -f apps/invitation/Dockerfile -t managevent-invitation:local .
#
# next.config.ts does not use `output: "standalone"`, so the image keeps the workspace and
# node_modules and starts the app with `next start`.

FROM node:22-alpine AS base
# openssl: Prisma's engines link against it (the Prisma client is generated at install).
# ca-certificates: outbound TLS.
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
# or browser-test dependencies). devDependencies are kept on purpose: the build needs
# TypeScript and Tailwind. NODE_ENV is therefore set only after the install.
# The pnpm store is a BuildKit cache mount: it survives between builds on the same machine and
# never ends up in the image.
RUN --mount=type=cache,id=managevent-pnpm-store,target=/pnpm/store,uid=1000,gid=1000,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter "@managevent/invitation..."

FROM deps AS runner
COPY --chown=node:node . .
# Regenerates the Prisma client from the schema that was just copied.
RUN pnpm --filter @managevent/db db:generate

# NEXT_PUBLIC_* values are compiled into the browser bundle by `next build`, so they must be
# known here; setting them only on the running container changes server-side code and nothing
# else. The defaults are the production URLs. Override with --build-arg for another environment.
ARG NEXT_PUBLIC_API_URL=https://api.managevent.com.au
ARG NEXT_PUBLIC_MARKETING_URL=https://www.managevent.com.au
ARG NEXT_PUBLIC_INVITATION_URL=https://invitation.managevent.com.au
ARG NEXT_PUBLIC_ADMIN_URL=https://www.managevent.com.au/admin
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MARKETING_URL=$NEXT_PUBLIC_MARKETING_URL
ENV NEXT_PUBLIC_INVITATION_URL=$NEXT_PUBLIC_INVITATION_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The build needs about 1.3 GB of heap. On the 2 GB VPS build one image at a time
# (infra/vps/deploy.sh does), or let GitHub Actions build it (.github/workflows/deploy.yml).
ENV NODE_OPTIONS="--max-old-space-size=1280"
RUN pnpm --filter @managevent/invitation build

ENV NODE_OPTIONS="--max-old-space-size=384"
ENV PORT=3001
EXPOSE 3001

# Started with node directly rather than through pnpm: one process instead of three, and
# SIGTERM reaches the server. The working directory matters: the app resolves files relative
# to it. Liveness: any HTTP answer on port 3001 (see the healthcheck in docker-compose.yml).
WORKDIR /app/apps/invitation
CMD ["node", "node_modules/next/dist/bin/next", "start", "--port", "3001"]
