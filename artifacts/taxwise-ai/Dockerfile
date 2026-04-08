# ── React Frontend Dockerfile (Nginx) ─────────────────────────────────────────

FROM node:24-slim AS deps
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/replit-auth-web/package.json lib/replit-auth-web/
COPY artifacts/taxwise-ai/package.json artifacts/taxwise-ai/

RUN pnpm install --frozen-lockfile


# ── Build stage ────────────────────────────────────────────────────────────────
FROM deps AS build
COPY lib/ lib/
COPY artifacts/taxwise-ai/ artifacts/taxwise-ai/

# Build the api-client-react library first (project reference)
RUN pnpm --filter @workspace/api-client-react run build

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm --filter @workspace/taxwise-ai run build


# ── Runtime: Nginx ────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=build /workspace/artifacts/taxwise-ai/dist /usr/share/nginx/html

# Nginx config — SPA routing (all paths → index.html) + API proxy
COPY artifacts/taxwise-ai/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
