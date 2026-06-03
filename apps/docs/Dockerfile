# Stage 1: build VitePress static site
FROM node:24-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/docs/package.json ./apps/docs/
RUN pnpm install --filter @fullstack/docs --frozen-lockfile
COPY apps/docs ./apps/docs
RUN pnpm --filter @fullstack/docs build

# Stage 2: serve static dist with nginx
FROM nginx:1.30-alpine
COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/docs/.vitepress/dist /usr/share/nginx/html
EXPOSE 80
