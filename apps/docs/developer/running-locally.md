---
title: Running locally
---

# Running locally

<p class="lede">Bring the whole stack up on your machine. These are developer instructions for the RAGBot monorepo — end users don't need any of this.</p>

## Prerequisites

- **Node.js** `>= 24` with **Corepack** (bundled with Node 24+)
- **PostgreSQL** with the **pgvector** extension (for the API)
- **Redis** (any Redis-compatible service) for the background job queue
- API keys for the external services the pipeline uses: **OpenRouter** (embeddings + chat), **Brevo** (email), **S3/R2** (file storage), **LlamaIndex** (PDF/Word parsing), **Firecrawl** (URL scraping)

## Get the code

```bash
git clone https://github.com/dnwandana/ragbot.git
cd ragbot
```

## Install

```bash
corepack pnpm install
```

## Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

Fill in the required variables — database and Redis URLs, two distinct JWT secrets (≥32 chars each), and the external API keys above. The API **validates its environment at startup and exits** if anything required is missing, so a misconfigured `.env` fails fast with a clear message.

The browser app reads one variable, `VITE_API_BASE_URL` (defaults to `http://localhost:3000/api`).

::: tip Local cookies need development mode
Set `NODE_ENV=development` locally. The API only marks auth cookies `Secure` in production, and browsers reject `Secure` cookies over plain HTTP — so a production config won't let you log in over `http://localhost`.
:::

## Run the database migrations

Migrations don't run automatically:

```bash
corepack pnpm --filter @fullstack/api migrate
```

There are also seeds for the 31 permissions and a couple of test users.

## Start the apps

```bash
corepack pnpm dev          # all apps via Turborepo
# — or individually —
corepack pnpm dev:api      # API on :3000
corepack pnpm dev:app      # SPA on :8080
corepack pnpm dev:web      # marketing site on :4321
corepack pnpm dev:docs     # these docs on :4173
```

Open the app at `http://localhost:8080`.

## Other useful commands

```bash
corepack pnpm build        # build every app
corepack pnpm lint         # lint all
corepack pnpm test:api     # API test suite (Vitest + Supertest against real PostgreSQL)
```

## Running in containers

To run the whole stack in Docker — locally or in production — see [Deployment](/developer/deployment).
