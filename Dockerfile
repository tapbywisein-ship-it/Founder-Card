# syntax=docker/dockerfile:1
# Single combined image: nginx serves the built Vite SPA on :80 and reverse-
# proxies /api (and /og, /health) to the Node/Express backend on 127.0.0.1:3000.
# supervisord runs both processes. No secrets are baked in — runtime env is
# injected by docker-compose / App Service.
#
# Backend stages use Debian slim (not Alpine): Prisma's query engine links
# against OpenSSL 3 there natively, avoiding the musl/libssl.so.1.1 mismatch.

# ---- Stage 1: build frontend (Vite -> static files) ----
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY Frontend/package*.json ./
RUN npm ci
COPY Frontend/ ./
# Vite inlines VITE_* at build time. The Supabase anon key is a publishable key,
# safe to embed in the client bundle. Same-origin API path -> nginx proxies /api.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=/api/v1
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# ---- Stage 2: build backend (TypeScript -> dist, generate Prisma client) ----
FROM node:20-slim AS backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /be
COPY Backend/package*.json ./
RUN npm ci
COPY Backend/ ./
RUN npx prisma generate && npm run build

# ---- Stage 3: runtime (nginx + node + supervisor on Debian) ----
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Backend runtime artifacts (node_modules already contains the generated Prisma client)
WORKDIR /app/backend
COPY --from=backend /be/dist ./dist
COPY --from=backend /be/node_modules ./node_modules
COPY --from=backend /be/package.json ./package.json
COPY --from=backend /be/prisma ./prisma

# Frontend static assets
COPY --from=frontend /fe/dist /usr/share/nginx/html

# Process + web server config
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/security-headers.conf /etc/nginx/security-headers.conf
COPY deploy/supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
