# ── Node.js API Server Dockerfile ─────────────────────────────────────────────

FROM node:24-slim AS deps
WORKDIR /workspace

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all package.json files to allow pnpm to resolve the workspace
COPY lib/db/package.json lib/db/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/replit-auth-web/package.json lib/replit-auth-web/
COPY artifacts/api-server/package.json artifacts/api-server/

RUN pnpm install --frozen-lockfile


# ── Build stage ────────────────────────────────────────────────────────────────
FROM deps AS build
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
RUN pnpm --filter @workspace/api-server run build


# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:24-slim AS runtime
WORKDIR /app

RUN useradd -m appuser
COPY --from=build --chown=appuser /workspace/artifacts/api-server/dist ./dist
COPY --from=build --chown=appuser /workspace/node_modules ./node_modules

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/healthz', r => r.statusCode===200 ? process.exit(0) : process.exit(1))"

CMD ["node", "dist/index.js"]
