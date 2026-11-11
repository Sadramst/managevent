# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/prisma ./packages/db/prisma
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/logistics/package.json ./packages/logistics/package.json
COPY packages/payments/package.json ./packages/payments/package.json
COPY packages/validators/package.json ./packages/validators/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS runner
WORKDIR /app
COPY . .
RUN pnpm --filter @managevent/db db:generate

ENV NODE_ENV=production

# No HTTP port: this is a pg-boss consumer, not a web service.
CMD ["pnpm", "--filter", "@managevent/worker", "start"]
