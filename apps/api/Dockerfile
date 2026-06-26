FROM node:24-alpine
RUN corepack enable pnpm

# Native tooling for YouTube ingestion: ffmpeg (audio extraction/segmentation),
# python3 (yt-dlp runtime), and the pinned yt-dlp binary itself.
ARG YT_DLP_VERSION=2025.06.09
RUN apk add --no-cache ffmpeg python3 \
  && wget -O /usr/local/bin/yt-dlp \
     "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/yt-dlp" \
  && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --filter @ragbot/api --prod --frozen-lockfile

COPY apps/api/src ./apps/api/src
COPY apps/api/knexfile.js ./apps/api/knexfile.js
COPY apps/api/database ./apps/api/database

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
