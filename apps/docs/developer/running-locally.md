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
- **Python** `>= 3.12` — optional, only to run the `sandbox/` code executor or its tests outside Docker

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

Two optional variables pick the OpenRouter models. `DEFAULT_CHAT_MODEL` (default `openai/gpt-5.4-mini`) is the model for new agents, and `UTILITY_MODEL` (default `openai/gpt-5.4-nano`) is the cheap model for short tasks such as conversation titles. Agents can use `openai/gpt-5.4`, `openai/gpt-5.4-mini`, or `openai/gpt-5.4-nano`.

The code interpreter is **off by default** (`SANDBOX_ENABLED=false`). Leave it off unless you work on [data analysis](/concepts/data-analysis); the rest of the product runs without it. To turn it on, start the sandbox (below) and set `SANDBOX_ENABLED=true`, `SANDBOX_URL`, and `SANDBOX_API_TOKEN`. The API refuses to start when the flag is on and either of the other two is missing.

::: tip Local cookies need development mode
Set `NODE_ENV=development` locally. The API only marks auth cookies `Secure` in production, and browsers reject `Secure` cookies over plain HTTP — so a production config won't let you log in over `http://localhost`.
:::

## Run the database migrations

Migrations don't run automatically:

```bash
corepack pnpm --filter @ragbot/api migrate
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

## Run the sandbox (optional)

The code executor is a Python service in `sandbox/`, outside the pnpm workspace. Run it alone with a virtual environment:

```bash
cd sandbox
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
SANDBOX_API_TOKEN=local-dev-sandbox-token .venv/bin/uvicorn app.main:app --port 8000
```

Then point the API at it with `SANDBOX_URL=http://127.0.0.1:8000` and the same `SANDBOX_API_TOKEN`. Check it with `curl http://127.0.0.1:8000/health`, which answers `{"status":"ok"}`.

::: warning A bare process has no isolation
The container supplies the read-only filesystem, the dropped capabilities, the memory and process limits, and the internal-only network. A uvicorn process on your machine has none of them, so model-written code runs with your user's permissions. Use this mode for the HTTP contract and the UI only. Test the real isolation with the Docker stack in [Deployment](/developer/deployment#the-sandbox-container).
:::

## Other useful commands

```bash
corepack pnpm build        # build every app
corepack pnpm lint         # lint all
corepack pnpm test:api     # API test suite (Vitest + Supertest against real PostgreSQL)
(cd sandbox && .venv/bin/python -m pytest -q)   # sandbox test suite; run from sandbox/
```

The API test suite never calls a real sandbox. `tests/setup.js` mocks the sandbox client, so the suite passes with the sandbox off and no Python installed.

## Running in containers

To run the whole stack in Docker — locally or in production — see [Deployment](/developer/deployment).
