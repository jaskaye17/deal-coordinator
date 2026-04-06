FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/gateway/package.json ./apps/gateway/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/gateway/node_modules ./apps/gateway/node_modules
COPY --from=deps /app/packages/ ./packages/
COPY . .
RUN pnpm --filter @deal-coordinator/shared build && \
    pnpm --filter @deal-coordinator/config build && \
    pnpm --filter @deal-coordinator/gateway build

FROM node:22-alpine AS runner
WORKDIR /app/apps/gateway
COPY --from=builder /app/apps/gateway/dist ./dist
COPY --from=builder /app/apps/gateway/node_modules ./node_modules
COPY --from=builder /app/packages /app/packages
EXPOSE 3003
CMD ["node", "dist/main.js"]
