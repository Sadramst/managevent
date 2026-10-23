# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/prisma ./packages/db/prisma
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/payments/package.json ./packages/payments/package.json
COPY packages/pricing/package.json ./packages/pricing/package.json
COPY packages/logistics/package.json ./packages/logistics/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/validators/package.json ./packages/validators/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS runner
WORKDIR /app
COPY . .
RUN pnpm --filter @managevent/db db:generate

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["pnpm", "--filter", "@managevent/api", "start"]
