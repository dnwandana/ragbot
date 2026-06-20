# Stage 1: build Astro static site
FROM node:24-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --filter @ragbot/web --frozen-lockfile
COPY apps/web ./apps/web
ARG PUBLIC_SITE_URL
ARG PUBLIC_APP_URL
ARG PUBLIC_DOCS_URL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL
ENV PUBLIC_DOCS_URL=$PUBLIC_DOCS_URL
RUN pnpm --filter @ragbot/web build

# Stage 2: serve static dist with nginx
FROM nginx:1.30-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
