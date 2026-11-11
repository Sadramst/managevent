# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache openssl ca-certificates
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS runner
WORKDIR /app
RUN pnpm --filter @managevent/db db:generate

ENV NODE_ENV=production

# No HTTP port: this is a pg-boss consumer, not a web service.
CMD ["pnpm", "--filter", "@managevent/worker", "start"]

