# RAGBot

A workspace-based RAG (Retrieval-Augmented Generation) chatbot platform. Users upload documents into datasets, configure AI agents, and chat with their data — all isolated by workspace with role-based access control.

## What's inside

A pnpm + Turborepo monorepo of 4 apps:

| App         | Stack                                                     | Purpose                           |
| ----------- | --------------------------------------------------------- | --------------------------------- |
| `apps/api`  | Express 5, PostgreSQL + pgvector, Knex.js, OpenRouter API | REST API with auth, RAG pipeline  |
| `apps/app`  | Vue 3, Pinia, Ant Design Vue, Vite                        | Single-page app consuming the API |
| `apps/web`  | Astro 6, `@astrojs/sitemap`                               | Static marketing/landing site     |
| `apps/docs` | VitePress                                                 | Static documentation site         |

## Architecture at a glance

```
Workspace (tenant boundary)
  ├── Roles & Permissions (RBAC)
  ├── Members (invited via email)
  ├── Datasets (knowledge bases)
  │     └── Files → Chunks → Vector Embeddings
  ├── Agents (configurable system prompt + model)
  │     └── Conversations (chat sessions)
  │           └── Messages + Citations
  └── Audit Logs (immutable trail)
```

- **Multi-tenancy**: Shared PostgreSQL database, tenant-scoped via `workspace_id` columns with composite foreign keys enforcing isolation at the DB level
- **RBAC**: 4 system roles (owner / admin / editor / viewer) + custom roles, 31 granular permissions across 8 resources
- **Auth**: Dual-token JWT via httpOnly cookies, Argon2 password hashing, account lockout after 5 failed attempts, listable/revocable sessions with instant access-token revocation (Redis denylist)
- **RAG pipeline**: File upload → parsing (LlamaIndex) → chunking (LangChain) → embedding (OpenRouter) → vector search (pgvector HNSW). Sources can be uploaded files, scraped web pages, or YouTube videos (captions via yt-dlp, else audio transcription via OpenRouter Whisper)
- **AI chat**: ReAct loop with OpenRouter, SSE streaming, citation tracking back to source chunks

## Prerequisites

- Node.js `>=24.0.0`
- Corepack (bundled with Node 24+)
- PostgreSQL with `pgvector` extension (for the API)
- Redis service — any Redis-compatible provider — for the BullMQ job queue

For production deployment:

- Docker Engine `>=24`
- Docker Compose `>=2.20`

## Install

```bash
corepack pnpm install
```

## Environment setup

### API (`apps/api`)

```bash
cp apps/api/.env.example apps/api/.env
```

Required variables:

```bash
DATABASE_URL=postgresql://user:pass@localhost/dbname
REDIS_URL=rediss://default:<password>@<host>:6380
ACCESS_TOKEN_SECRET=<at-least-32-characters>
REFRESH_TOKEN_SECRET=<at-least-32-characters>
JWT_ISSUER=https://api.example.com
JWT_AUDIENCE=https://api.example.com
OPENROUTER_API_KEY=<key>
BREVO_API_KEY=<key>
EMAIL_FROM_ADDRESS=noreply@example.com
APP_URL=http://localhost:8080
S3_BUCKET=<bucket>
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<key>
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
LLAMAINDEX_API_KEY=<key>
FIRECRAWL_API_KEY=<key>
```

Optional (with defaults):

```bash
NODE_ENV=development
PORT=3000
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ALLOWED_ORIGINS=http://localhost:8080
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_GENERAL_MAX=100
LOG_LEVEL=info
LOG_TO_FILE=true
DEFAULT_EMBEDDINGS_MODEL=openai/text-embedding-3-small
DEFAULT_CHAT_MODEL=openai/gpt-5.4-mini
LLAMAINDEX_PARSE_TIER=cost_effective  # fast | cost_effective | agentic | agentic_plus
WHISPER_MODEL=openai/whisper-large-v3-turbo  # YouTube audio transcription model
OPENROUTER_TRANSCRIBE_TIMEOUT_MS=120000      # Whisper request timeout
YTDLP_PATH=yt-dlp                            # yt-dlp binary (installed in the API image)
FFMPEG_PATH=ffmpeg                           # ffmpeg binary (installed in the API image)
YOUTUBE_AUDIO_SEGMENT_SECONDS=600            # split long audio into N-second chunks
YOUTUBE_WORKER_CONCURRENCY=1                 # parallel YouTube transcription jobs
YOUTUBE_DOWNLOAD_TIMEOUT_MS=600000           # yt-dlp download + ffmpeg segmentation timeout
YOUTUBE_MAX_DURATION_SECONDS=7200            # reject audio+Whisper for videos longer than this
YOUTUBE_MAX_FILESIZE=150M                    # yt-dlp --max-filesize cap (binary units)
S3_REGION=auto
EMAIL_FROM_NAME=RAGBot
IP_GEOLOCATION_ENABLED=false           # resolve session IPs to "City, CC" on the sessions list
IPGEOLOCATION_API_KEY=                 # required only when IP_GEOLOCATION_ENABLED=true (ipgeolocation.io)
IPGEOLOCATION_TIMEOUT_MS=5000
```

### App (`apps/app`)

```bash
cp apps/app/.env.example apps/app/.env
```

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

### Web (`apps/web`)

```bash
cp apps/web/.env.example apps/web/.env
```

```sh
PUBLIC_SITE_URL=http://localhost:4321   # canonical/OG/sitemap/robots base URL
PUBLIC_APP_URL=http://localhost:8080    # CTA "Sign up free" → ${PUBLIC_APP_URL}/signup
PUBLIC_DOCS_URL=http://localhost:4173   # nav/footer docs links → ${PUBLIC_DOCS_URL}/
```

## Database setup

Requires PostgreSQL with the `pgvector` extension installed. Run migrations and (optional) seed data:

```bash
cd apps/api
corepack pnpm migrate        # runs knex migrate:latest
corepack pnpm seed           # seeds permissions (+ 2 dev test users; skipped when NODE_ENV=production)
```

## Development

```bash
# Start all apps
corepack pnpm dev

# Start individually
corepack pnpm dev:api   # http://localhost:3000
corepack pnpm dev:app   # http://localhost:8080
corepack pnpm dev:web   # http://localhost:4321  (apps/web Astro dev server)
corepack pnpm dev:docs  # http://localhost:4173  (apps/docs VitePress dev server)
```

## Scripts

| Command       | Description                                          |
| ------------- | ---------------------------------------------------- |
| `pnpm dev`    | Start all apps in watch mode                         |
| `pnpm build`  | Build all apps                                       |
| `pnpm lint`   | Lint all apps                                        |
| `pnpm test`   | Run all tests (API integration + app unit/component) |
| `pnpm format` | Format all apps with Prettier                        |

Append `:api`, `:app`, `:web`, or `:docs` to target a single workspace (e.g. `pnpm build:web` for `apps/web` only).

## Current API endpoints

### Health (public, not rate-limited)

| Method | Path      | Description                                     |
| ------ | --------- | ----------------------------------------------- |
| GET    | `/health` | Health check — `{ status, database }` (DB ping) |

### Authentication

| Method | Path                            | Auth          | Description                                              |
| ------ | ------------------------------- | ------------- | -------------------------------------------------------- |
| POST   | `/api/auth/signup`              | —             | Register — sends verification email                      |
| POST   | `/api/auth/verify-email`        | —             | Verify email via token from email link                   |
| POST   | `/api/auth/resend-verification` | —             | Resend verification email (always returns 200)           |
| POST   | `/api/auth/signin`              | —             | Sign in — requires verified email, sets httpOnly cookies |
| POST   | `/api/auth/forgot-password`     | —             | Request password reset email (always returns 200)        |
| POST   | `/api/auth/reset-password`      | —             | Reset password via token, revokes all sessions           |
| GET    | `/api/auth/me`                  | Access Token  | Return current user                                      |
| PUT    | `/api/auth/profile`             | Access Token  | Update `full_name` and `timezone`                        |
| DELETE | `/api/auth/profile`             | Access Token  | Delete account (soft delete, clears cookies)             |
| PUT    | `/api/auth/password`            | Access Token  | Change password                                          |
| POST   | `/api/auth/refresh`             | Refresh Token | Rotate tokens via httpOnly cookie                        |
| POST   | `/api/auth/logout`              | Refresh Token | Revoke refresh token, clear cookies                      |
| GET    | `/api/auth/sessions`            | Access Token  | List active sessions                                     |
| DELETE | `/api/auth/sessions`            | Access Token  | Revoke all sessions except the current one               |
| DELETE | `/api/auth/sessions/:id`        | Access Token  | Revoke a single session by id                            |

### Permissions

| Method | Path               | Auth         | Description               |
| ------ | ------------------ | ------------ | ------------------------- |
| GET    | `/api/permissions` | Access Token | Permission reference list |

### Invitations

| Method | Path                      | Auth         | Description                         |
| ------ | ------------------------- | ------------ | ----------------------------------- |
| GET    | `/api/invitations/:token` | —            | Preview invitation details (public) |
| POST   | `/api/invitations/accept` | Access Token | Accept a workspace invitation       |

### Workspaces

| Method | Path                  | Auth         | Permission         |
| ------ | --------------------- | ------------ | ------------------ |
| GET    | `/api/workspaces`     | Access Token | —                  |
| POST   | `/api/workspaces`     | Access Token | —                  |
| GET    | `/api/workspaces/:id` | Access Token | `workspace:read`   |
| PUT    | `/api/workspaces/:id` | Access Token | `workspace:update` |
| DELETE | `/api/workspaces/:id` | Access Token | `workspace:delete` |

### Roles

| Method | Path                             | Permission    |
| ------ | -------------------------------- | ------------- |
| GET    | `/api/workspaces/:id/roles`      | `role:read`   |
| POST   | `/api/workspaces/:id/roles`      | `role:create` |
| GET    | `/api/workspaces/:id/roles/:rid` | `role:read`   |
| PUT    | `/api/workspaces/:id/roles/:rid` | `role:update` |
| DELETE | `/api/workspaces/:id/roles/:rid` | `role:delete` |

### Members

| Method | Path                                    | Permission           |
| ------ | --------------------------------------- | -------------------- |
| GET    | `/api/workspaces/:id/members`           | `member:read`        |
| GET    | `/api/workspaces/:id/members/:mid`      | `member:read`        |
| POST   | `/api/workspaces/:id/members/invite`    | `member:invite`      |
| PUT    | `/api/workspaces/:id/members/:mid/role` | `member:manage_role` |
| DELETE | `/api/workspaces/:id/members/:mid`      | `member:remove`      |

### Audit Logs

| Method | Path                             | Permission   |
| ------ | -------------------------------- | ------------ |
| GET    | `/api/workspaces/:id/audit-logs` | `audit:read` |

### Datasets

| Method | Path                                              | Permission            |
| ------ | ------------------------------------------------- | --------------------- |
| GET    | `/api/workspaces/:id/datasets`                    | `dataset:read`        |
| POST   | `/api/workspaces/:id/datasets`                    | `dataset:create`      |
| GET    | `/api/workspaces/:id/datasets/:did`               | `dataset:read`        |
| PUT    | `/api/workspaces/:id/datasets/:did`               | `dataset:update`      |
| DELETE | `/api/workspaces/:id/datasets/:did`               | `dataset:delete`      |
| GET    | `/api/workspaces/:id/datasets/:did/questions`     | `file:read`           |
| POST   | `/api/workspaces/:id/datasets/:did/conversations` | `conversation:create` |

### Dataset Files

| Method | Path                                                     | Permission       |
| ------ | -------------------------------------------------------- | ---------------- |
| GET    | `/api/workspaces/:id/datasets/:did/files`                | `file:read`      |
| GET    | `/api/workspaces/:id/datasets/:did/files/:fid`           | `file:read`      |
| POST   | `/api/workspaces/:id/datasets/:did/files/upload`         | `file:upload`    |
| POST   | `/api/workspaces/:id/datasets/:did/files/scrape-url`     | `file:upload`    |
| POST   | `/api/workspaces/:id/datasets/:did/files/youtube`        | `file:upload`    |
| PUT    | `/api/workspaces/:id/datasets/:did/files/:fid`           | `file:update`    |
| DELETE | `/api/workspaces/:id/datasets/:did/files/:fid`           | `file:delete`    |
| POST   | `/api/workspaces/:id/datasets/:did/files/:fid/reprocess` | `file:reprocess` |
| GET    | `/api/workspaces/:id/datasets/:did/files/:fid/questions` | `file:read`      |
| GET    | `/api/workspaces/:id/datasets/:did/files/:fid/chunks`    | `file:read`      |

### Agents

| Method | Path                              | Permission     |
| ------ | --------------------------------- | -------------- |
| GET    | `/api/workspaces/:id/agents`      | `agent:read`   |
| POST   | `/api/workspaces/:id/agents`      | `agent:create` |
| GET    | `/api/workspaces/:id/agents/:aid` | `agent:read`   |
| PUT    | `/api/workspaces/:id/agents/:aid` | `agent:update` |
| DELETE | `/api/workspaces/:id/agents/:aid` | `agent:delete` |

### Conversations

| Method | Path                                              | Permission            |
| ------ | ------------------------------------------------- | --------------------- |
| GET    | `/api/workspaces/:id/conversations`               | `conversation:read`   |
| POST   | `/api/workspaces/:id/conversations`               | `conversation:create` |
| GET    | `/api/workspaces/:id/conversations/:cid`          | `conversation:read`   |
| PUT    | `/api/workspaces/:id/conversations/:cid`          | `conversation:update` |
| DELETE | `/api/workspaces/:id/conversations/:cid`          | `conversation:delete` |
| POST   | `/api/workspaces/:id/conversations/:cid/messages` | `conversation:chat`   |

### Health check (public, not rate-limited)

```
GET /health    # { status, uptime, database } (production omits uptime/database)
```

### Response format

```json
{
  "message": "Success",
  "data": { ... },
  "pagination": {
    "current_page": 1,
    "items_per_page": 10,
    "total_items": 42,
    "total_pages": 5,
    "has_next_page": true,
    "has_previous_page": false,
    "next_page": 2,
    "previous_page": null
  }
}
```

### Authentication cookies

The API uses httpOnly cookies (not headers) for token management:

- `access_token` — httpOnly cookie, short-lived (default 15 min), scoped to `/api`
- `refresh_token` — httpOnly cookie, long-lived (default 7 days), scoped to `/api/auth`

Tokens are set by the server on signin/refresh and never exposed to JavaScript. Both use `Secure` (production), `SameSite=Strict`.

## Testing

```bash
corepack pnpm test:api
```

Tests require a PostgreSQL test database with pgvector. Copy and configure:

```bash
cp apps/api/.env.example apps/api/.env.test
# Set DATABASE_URL to a separate test database
# Update PORT (e.g. 3001), LOG_LEVEL=error, LOG_TO_FILE=false
```

The test suite uses real PostgreSQL (no mocks). Vitest runs migrations once before the session, and `cleanAllTables()` truncates between tests. Auth tests mock the Brevo email service; the BullMQ queue, session denylist, and rate limiter are mocked so no Redis is required locally (the real denylist is unit-tested with `ioredis` mocked). Run `corepack pnpm test:api` for the live passing count. Integration groups: agents, agents-default-conflict, auth, chat, conversations, dataset-file-chunks, dataset-file-questions, dataset-questions, dataset-files, datasets, file-processing, health, members, permissions, roles, workspaces. Unit groups: allowed-models, consume-stream, email-render, file-processing-worker, http-error, ip-geolocation, llamaindex-poll, pagination, redis, request-id, sanitize, session-denylist, ssrf, test-users-seed, url-slug, validate-env. Session management (in `tests/`): sessions, session-revocation, jwt-sid, refresh-tokens-model.

The frontend app (`apps/app`) has its own Vitest suite (`corepack pnpm --filter app test`, jsdom environment): unit tests for API wrappers and composables, plus component-render tests via `@vue/test-utils`. No database or network is required — API modules and composables are mocked.

## Deployment

Production deployment uses Docker Compose with nginx as the sole entry point. Five containers run on the host VM — the nginx edge plus one container each for `web`, `app`, `api`, and `docs`; PostgreSQL remains an external service.

### How it works

```
nginx edge (ports 80/443) — name-based virtual hosts (pure reverse proxy)
  ├── example.com      → proxies to the web container (Astro static site)
  ├── app.example.com  → proxies to the app container (Vue SPA static)
  ├── docs.example.com → proxies to the docs container (VitePress static site)
  └── api.example.com  → proxies to the api container (adds /api upstream,
                          rewrites Set-Cookie paths, /health at root)

api (internal only)
  ├── connects to external PostgreSQL via DATABASE_URL
  └── connects to external Redis via REDIS_URL
```

### Local Docker

Test the production images locally over HTTP (no SSL required).

**1. Configure environment**

```bash
cp .env.example .env.local
# Edit .env.local — fill in DATABASE_URL, JWT secrets, and all service keys.
# Set these local values:
#   NODE_ENV=development        ← required: keeps cookies non-Secure so browsers accept them over HTTP
#   JWT_ISSUER=http://localhost
#   JWT_AUDIENCE=http://localhost
#   CORS_ALLOWED_ORIGINS=http://localhost
```

**2. Build and start**

```bash
docker compose -f docker-compose.local.yml up --build -d
```

**3. Run migrations**

```bash
docker compose -f docker-compose.local.yml run --rm api sh -c "node_modules/.bin/knex migrate:latest"
```

App available at `http://localhost`. Marketing site at `http://localhost:4321`. Docs at `http://localhost:4173`.

**Useful commands**

```bash
docker compose -f docker-compose.local.yml logs -f        # tail all logs
docker compose -f docker-compose.local.yml logs -f api    # API logs only
docker compose -f docker-compose.local.yml ps             # container status
docker compose -f docker-compose.local.yml down           # stop and remove containers
```

### First deploy

**1. Place Let's Encrypt certificates**

```bash
mkdir certs
# Use ONE cert covering both the apex and wildcard:
#   certbot certonly ... -d example.com -d *.example.com
# nginx expects these exact filenames (DOMAIN from your .env):
# certs/<DOMAIN>.fullchain.pem
# certs/<DOMAIN>.privkey.pem
# Typical symlink approach (if using certbot on the host):
ln -s /etc/letsencrypt/live/<domain>/fullchain.pem "certs/<DOMAIN>.fullchain.pem"
ln -s /etc/letsencrypt/live/<domain>/privkey.pem "certs/<DOMAIN>.privkey.pem"
```

**2. Configure environment**

```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT secrets, service keys, and your domain
```

**3. Build and start**

```bash
docker compose build
docker compose up -d
```

### Re-deploy after code changes

```bash
docker compose build
docker compose up -d
```

> **yt-dlp upkeep:** YouTube ingestion uses a pinned `yt-dlp` (`YT_DLP_VERSION` in `apps/api/Dockerfile`) for reproducible builds. YouTube periodically changes its site in ways that break older yt-dlp releases, so bump `YT_DLP_VERSION` and rebuild the API image if YouTube imports start failing extraction.

### Useful commands

```bash
docker compose logs -f              # tail logs from all containers
docker compose logs -f api          # API logs only
docker compose ps                   # container status

# Manual database migration (run before deploying schema changes)
docker compose run --rm api sh -c "node_modules/.bin/knex migrate:latest"

# Manual seed
docker compose run --rm api sh -c "node_modules/.bin/knex seed:run"
```

### Environment variables

| Variable                   | Required | Description                                                                                         |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `DOMAIN`                   | Yes      | Registrable domain for the prod stack. Compose derives `app.<DOMAIN>` and `api.<DOMAIN>`.           |
| `VITE_API_BASE_URL`        | No       | Build-time API base URL. In the prod stack it is derived from `DOMAIN` (`https://api.<DOMAIN>`).    |
| `DATABASE_URL`             | Yes      | PostgreSQL connection string                                                                        |
| `REDIS_URL`                | Yes      | Redis connection string (`redis://localhost:6379` or `redis://:pass@host:6379`)                     |
| `ACCESS_TOKEN_SECRET`      | Yes      | JWT secret, min 32 chars                                                                            |
| `REFRESH_TOKEN_SECRET`     | Yes      | JWT secret, min 32 chars, must differ from access secret                                            |
| `JWT_ISSUER`               | Yes      | API origin that issues tokens, e.g. `https://api.<DOMAIN>`                                          |
| `JWT_AUDIENCE`             | Yes      | SPA origin the tokens are for, e.g. `https://app.<DOMAIN>`                                          |
| `OPENROUTER_API_KEY`       | Yes      | API key for OpenRouter (LLM + embedding inference)                                                  |
| `BREVO_API_KEY`            | Yes      | API key for Brevo (transactional email)                                                             |
| `S3_BUCKET`                | Yes      | Cloudflare R2 bucket name for file storage                                                          |
| `S3_ACCESS_KEY`            | Yes      | R2 access key                                                                                       |
| `S3_SECRET_KEY`            | Yes      | R2 secret key                                                                                       |
| `S3_ENDPOINT`              | Yes      | R2 endpoint URL                                                                                     |
| `LLAMAINDEX_API_KEY`       | Yes      | API key for LlamaIndex (document parsing)                                                           |
| `FIRECRAWL_API_KEY`        | Yes      | API key for Firecrawl (URL scraping)                                                                |
| `IP_GEOLOCATION_ENABLED`   | No       | Set `true` to resolve session IPs to a "City, CC" label on the sessions list. Default `false`.      |
| `IPGEOLOCATION_API_KEY`    | Cond.    | Required only when `IP_GEOLOCATION_ENABLED=true` — ipgeolocation.io API key.                        |
| `IPGEOLOCATION_TIMEOUT_MS` | No       | Geolocation lookup timeout. Defaults to 5000.                                                       |
| `LLAMAINDEX_PARSE_TIER`    | No       | LlamaParse tier: `fast`, `cost_effective`, `agentic`, `agentic_plus`. Defaults to `cost_effective`. |
| `CORS_ALLOWED_ORIGINS`     | No       | Defaults to `http://localhost:8080`. Set to `https://app.<DOMAIN>` in production (SPA origin).      |

See `apps/api/.env.example` for the full list with defaults.

---

## Project structure

```
ragbot/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.js              # Express app (middleware stack + routes)
│   │   │   ├── index.js            # Entry point (env validation, server start, graceful shutdown)
│   │   │   ├── config/
│   │   │   │   └── database.js     # Knex instance
│   │   │   ├── controllers/        # 11: authentication, workspaces, roles, members,
│   │   │   │   │                    #     datasets, dataset-files, agents, conversations,
│   │   │   │   │                    #     chat, audit-logs, permissions
│   │   │   ├── emails/
│   │   │   │   ├── render.js             # Template loader with {{var}} substitution
│   │   │   │   └── templates/            # verify-email, reset-password, workspace-invitation HTML
│   │   │   ├── models/             # 17 (Knex queries only): users, email/refresh-tokens,
│   │   │   │   │                    #     roles, permissions, workspaces, workspace-members,
│   │   │   │   │                    #     datasets, dataset-files/-chunks/-questions, agents,
│   │   │   │   │                    #     conversations(+datasets/messages/citations), audit-logs
│   │   │   ├── services/           # 9: email (Brevo), openrouter (LLM + streaming),
│   │   │   │   │                    #     rag, firecrawl, llamaindex, question-generator,
│   │   │   │   │                    #     storage (S3/R2), text-splitter, ip-geolocation
│   │   │   ├── routes/             # per-resource routers aggregated in index.js
│   │   │   ├── middlewares/        # 7: request-id, authorization, resolve-workspace,
│   │   │   │   │                    #     require-permission, rate-limit, logger, error
│   │   │   ├── queues/             # file-processing (BullMQ queue + addProcessingJob)
│   │   │   ├── workers/            # file-processing (split → embed → store → questions)
│   │   │   └── utils/              # 16: argon2, jwt, cookies, http-error, response,
│   │   │                            #     pagination, sanitize, constant, logger, redis,
│   │   │                            #     allowed-models, audit, system-agent, url-slug, validate-env,
│   │   │                            #     session-denylist
│   │   ├── database/
│   │   │   ├── migrations/         # 10 Knex migrations (18-table workspace-based RAG schema)
│   │   │   └── seeds/
│   │   │       ├── 01_permissions.js  # 31 permissions across 8 resources
│   │   │       └── 02_test_users.js   # 2 test users (alice, bob)
│   │   ├── openapi.json            # OpenAPI 3 REST reference
│   │   └── tests/
│   │       ├── helpers.js          # createTestUser, createTestWorkspace, getAuthHeaders, cleanAllTables
│   │       ├── global-setup.js
│   │       ├── setup.js            # mocks BullMQ queue + session denylist + rate limiter
│   │       ├── integration/        # 16 files (agents, auth, chat, conversations, datasets, …)
│   │       ├── unit/               # 16 files (allowed-models, ip-geolocation, session-denylist, ssrf, …)
│   │       └── *.test.js           # session mgmt: sessions, session-revocation, jwt-sid, refresh-tokens-model
│   │
│   └── app/
│       └── src/
│           ├── api/                # 14 fetch-based service modules: auth, chat,
│           │                        #   conversations, datasets, datasetFiles, agents,
│           │                        #   workspaces, members, invitations, roles,
│           │                        #   permissions, auditLogs, account, profile
│           ├── stores/             # 11 Pinia stores (auth, chat, conversations,
│           │                        #   datasets, datasetFiles, agents, workspaces,
│           │                        #   members, invitations, roles, auditLogs)
│           ├── composables/        # 18 composables bridging stores → components
│           ├── views/              # auth/, workspaces/, settings/, datasets/, agents/,
│           │                        #   conversations/ (incl. ChatView), audit-logs/,
│           │                        #   onboarding/ (step wizard), invitations/
│           ├── components/         # shell + agents/, audit/, chat/, datasets/,
│           │                        #   onboarding/, roles/ subgroups
│           ├── config/             # antd-theme.js (Ant Design tokens)
│           ├── constants/          # models.js (agent model picker catalog)
│           ├── router/             # Vue Router + auth guards
│           └── utils/              # http (fetch client), storage, time, files,
│                                    #   pagination, permissionCatalog
│   │
│   ├── web/                        # Astro 6 static marketing site
│   │   ├── astro.config.mjs        # output: 'static' + sitemap
│   │   ├── public/scripts/app.js   # vanilla-JS interactions (nav, reveal, hero chat, theme)
│   │   └── src/
│   │       ├── pages/              # index.astro, 404.astro, robots.txt.js
│   │       ├── layouts/            # BaseLayout.astro (SEO + anti-flash theme)
│   │       ├── components/         # Nav, Hero, HowItWorks, Benefits, Footer, …
│   │       ├── icons/              # static .astro SVG components
│   │       └── styles/             # colors_and_type.css, marketing.css
│   │
│   └── docs/                        # VitePress static documentation site (apps/docs)
│
├── plans/                          # Feature implementation plans (F1–F7)
├── docs/superpowers/specs/         # Design specifications
├── nginx/                          # nginx configs (production + local)
├── package.json                    # Monorepo root
├── pnpm-workspace.yaml
└── turbo.json
```

## Code style

All apps use the same conventions:

- **Formatter**: Prettier — no semicolons, 2-space indent, 100-char width
- **Linter**: Oxlint (API), Oxlint + ESLint (app), ESLint + `eslint-plugin-astro` (web)
- **Modules**: ES modules (`"type": "module"`)
- **File naming**: kebab-case

Run before committing:

```bash
corepack pnpm lint
corepack pnpm format
```
