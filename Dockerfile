# syntax=docker/dockerfile:1@sha256:87999aa3d42bdc6bea60565083ee17e86d1f3339802f543c0d03998580f9cb89

FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS base

FROM base AS package-manager
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm && corepack prepare pnpm@10.33.0 --activate

FROM package-manager AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=codebuff-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

FROM deps AS production-deps
RUN --mount=type=cache,id=codebuff-pnpm-store,target=/pnpm/store,sharing=locked \
    CI=true pnpm --config.store-dir=/pnpm/store prune --prod

FROM deps AS builder
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=production-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.build/migrate/migrate ./migrate
COPY --from=builder --chown=nextjs:nodejs /app/.build/migrate/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/scripts/bootstrap-auth-user.mjs ./scripts/bootstrap-auth-user.mjs
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
