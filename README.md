# RAG Chatbot

A workspace-based RAG (Retrieval-Augmented Generation) chatbot platform. Users upload documents into datasets, configure AI agents, and chat with their data — all isolated by workspace with role-based access control.

## What's inside

| App        | Stack                                                            | Purpose                            |
| ---------- | ---------------------------------------------------------------- | ---------------------------------- |
| `apps/api` | Express 5, PostgreSQL + pgvector, Knex.js, OpenRouter API       | REST API with auth, RAG pipeline   |
| `apps/app` | Vue 3, Pinia, Ant Design Vue, Vite                              | Single-page app consuming the API  |

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
- **RBAC**: 4 system roles (owner / admin / editor / viewer) + custom roles, 30 granular permissions across 8 resources
- **Auth**: Dual-token JWT via httpOnly cookies, Argon2 password hashing, account lockout after 5 failed attempts
- **RAG pipeline**: File upload → parsing (LlamaIndex) → chunking (LangChain) → embedding (OpenRouter) → vector search (pgvector HNSW)
- **AI chat**: ReAct loop with OpenRouter, SSE streaming, citation tracking back to source chunks

## Prerequisites

- Node.js `>=24.0.0`
- Corepack (bundled with Node 24+)
- PostgreSQL with `pgvector` extension (for the API)

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
ACCESS_TOKEN_SECRET=<at-least-32-characters>
REFRESH_TOKEN_SECRET=<at-least-32-characters>
JWT_ISSUER=https://api.example.com
JWT_AUDIENCE=https://api.example.com
OPENROUTER_API_KEY=<key>
BREVO_API_KEY=<key>
BREVO_TEMPLATE_VERIFY_EMAIL=<template-id>
BREVO_TEMPLATE_RESET_PASSWORD=<template-id>
BREVO_TEMPLATE_WORKSPACE_INVITATION=<template-id>
EMAIL_FROM_ADDRESS=noreply@example.com
APP_URL=http://localhost:8080
S3_BUCKET=<bucket>
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<key>
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
LLAMAINDEX_API_KEY=<key>
LLAMAINDEX_WEBHOOK_SECRET=<at-least-16-chars>
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
DEFAULT_CHAT_MODEL=openai/gpt-4.1
S3_REGION=auto
EMAIL_FROM_NAME=RAG Chatbot
```

### App (`apps/app`)

```bash
cp apps/app/.env.example apps/app/.env
```

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

## Database setup

Requires PostgreSQL with the `pgvector` extension installed. Run migrations and (optional) seed data:

```bash
cd apps/api
corepack pnpm migrate        # runs knex migrate:latest
corepack pnpm seed           # seeds permissions + 2 test users
```

This creates 15 tables across 8 migrations:

```
001_extensions_and_types   → pgcrypto + vector extensions, 5 ENUM types
002_core_tenancy           → workspaces, users, email_tokens, refresh_tokens
003_roles_and_permissions  → permissions, roles, role_permissions, workspace_members
004_rag_pipeline            → datasets, dataset_files, document_chunks (with HNSW vector index)
005_agents                  → agents (configurable system prompt + model)
006_conversations_and_messages → conversations, conversation_datasets, messages, message_citations
007_functions               → trigger_set_updated_at(), search_chunks() function
008_audit_logs              → audit_logs (immutable, append-only)
```

## Development

```bash
# Start both apps
corepack pnpm dev

# Start individually
corepack pnpm dev:api   # http://localhost:3000
corepack pnpm dev:app   # http://localhost:8080
```

## Scripts

| Command       | Description                        |
| ------------- | ---------------------------------- |
| `pnpm dev`    | Start both apps in watch mode      |
| `pnpm build`  | Build both apps                    |
| `pnpm lint`   | Lint both apps                     |
| `pnpm test`   | Run all tests (API only currently) |
| `pnpm format` | Format both apps with Prettier     |

Append `:api` or `:app` to target a single workspace (e.g. `pnpm test:api`).

## Current API endpoints

### Authentication (public)

| Method | Path                | Description                                           |
| ------ | ------------------- | ----------------------------------------------------- |
| POST   | `/api/auth/signup`  | Register — returns `{ id, username, email }`          |
| POST   | `/api/auth/signin`  | Login — sets httpOnly auth cookies, returns user info |
| GET    | `/api/auth/me`      | Current user (requires access token)                  |
| POST   | `/api/auth/refresh` | Rotate tokens via httpOnly cookie                     |
| POST   | `/api/auth/logout`  | Revoke refresh token, clear cookies                   |

### Permissions (authenticated)

| Method | Path              | Description              |
| ------ | ----------------- | ------------------------ |
| GET    | `/api/permissions` | Permission reference list |

### Health check (public, not rate-limited)

```
GET /health    # { status, uptime, database } (production omits uptime/database)
```

### Response format

```json
{
  "message": "Success",
  "data": { ... },
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

### Authentication cookies

The API uses httpOnly cookies (not headers) for token management:

- `access_token` — httpOnly cookie, short-lived (default 15 min), scoped to `/api`
- `refresh_token` — httpOnly cookie, long-lived (default 7 days), scoped to `/api/auth`

Tokens are set by the server on signin/refresh and never exposed to JavaScript. Both use `Secure` (production), `SameSite=Strict`.

## Feature roadmap

| Feature | Description                              | Status        |
| ------- | ---------------------------------------- | ------------- |
| F1      | Database schema + infrastructure         | **Complete**  |
| F2      | Email-based authentication (Brevo)       | Planned       |
| F3      | Workspaces + RBAC + members              | Planned       |
| F4      | Datasets + file upload + RAG pipeline    | Planned       |
| F5      | Agent management                         | Planned       |
| F6      | Conversations (CRUD + dataset linking)   | Planned       |
| F7      | Chat (ReAct loop + SSE streaming)        | Planned       |

Detailed plans live in `plans/` and design specs in `docs/superpowers/specs/`.

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

The test suite uses real PostgreSQL (no mocks). Vitest runs migrations once before the session, and `cleanAllTables()` truncates between tests. Currently passing: health (5), http-error (3), pagination (9), request-id (4), sanitize (6) — 27 tests total. Auth and permissions integration tests need rewriting for the new schema.

## Deployment

Production deployment uses Docker Compose with nginx as the sole entry point. Two containers run on the host VM; PostgreSQL remains an external service.

### How it works

```
nginx (ports 80/443)
  ├── / → serves Vue static files (built into the image)
  ├── /api → proxies to Express container
  └── /health → proxies to Express container

api (internal only)
  └── connects to external PostgreSQL via DATABASE_URL
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

App available at `http://localhost`.

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
# Copy or symlink your certs — nginx expects these exact filenames:
# certs/fullchain.pem
# certs/privkey.pem
# Typical symlink approach (if using certbot on the host):
ln -s /etc/letsencrypt/live/<domain>/fullchain.pem certs/fullchain.pem
ln -s /etc/letsencrypt/live/<domain>/privkey.pem certs/privkey.pem
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

### Useful commands

```bash
docker compose logs -f              # tail logs from both containers
docker compose logs -f api          # API logs only
docker compose ps                   # container status

# Manual database migration (run before deploying schema changes)
docker compose run --rm api sh -c "node_modules/.bin/knex migrate:latest"

# Manual seed
docker compose run --rm api sh -c "node_modules/.bin/knex seed:run"
```

### Environment variables

| Variable               | Required | Description                                                                         |
| ---------------------- | -------- | ----------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`    | No       | Build-time API base URL. Defaults to `/api` (same-origin, recommended).             |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                                                        |
| `ACCESS_TOKEN_SECRET`  | Yes      | JWT secret, min 32 chars                                                            |
| `REFRESH_TOKEN_SECRET` | Yes      | JWT secret, min 32 chars, must differ from access secret                            |
| `JWT_ISSUER`           | Yes      | e.g. `https://yourdomain.com`                                                       |
| `JWT_AUDIENCE`         | Yes      | e.g. `https://yourdomain.com`                                                       |
| `OPENROUTER_API_KEY`   | Yes      | API key for OpenRouter (LLM + embedding inference)                                  |
| `BREVO_API_KEY`        | Yes      | API key for Brevo (transactional email)                                             |
| `S3_BUCKET`            | Yes      | Cloudflare R2 bucket name for file storage                                          |
| `S3_ACCESS_KEY`        | Yes      | R2 access key                                                                       |
| `S3_SECRET_KEY`        | Yes      | R2 secret key                                                                       |
| `S3_ENDPOINT`          | Yes      | R2 endpoint URL                                                                     |
| `LLAMAINDEX_API_KEY`   | Yes      | API key for LlamaIndex (document parsing)                                           |
| `FIRECRAWL_API_KEY`    | Yes      | API key for Firecrawl (URL scraping)                                                |
| `CORS_ALLOWED_ORIGINS` | No       | Defaults to `http://localhost:8080`. Set to `https://yourdomain.com` in production. |

See `apps/api/.env.example` for the full list with defaults.

---

## Project structure

```
rag-chatbot/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.js              # Express app (middleware stack + routes)
│   │   │   ├── index.js            # Entry point (env validation, server start, graceful shutdown)
│   │   │   ├── config/
│   │   │   │   └── database.js     # Knex instance
│   │   │   ├── controllers/
│   │   │   │   ├── authentication.js
│   │   │   │   ├── permissions.js
│   │   │   │   └── roles.js
│   │   │   ├── models/
│   │   │   │   ├── permissions.js
│   │   │   │   ├── refresh-tokens.js
│   │   │   │   ├── roles.js
│   │   │   │   └── users.js
│   │   │   ├── routes/
│   │   │   │   ├── authentication.js
│   │   │   │   ├── health.js
│   │   │   │   ├── index.js
│   │   │   │   └── permissions.js
│   │   │   ├── middlewares/
│   │   │   │   ├── authorization.js   # requireAccessToken, requireRefreshToken
│   │   │   │   ├── error.js           # errorHandler, notFoundHandler
│   │   │   │   ├── logger.js          # httpLogger (Morgan), requestLogger (Winston)
│   │   │   │   ├── rate-limit.js      # authLimiter, generalLimiter
│   │   │   │   └── request-id.js
│   │   │   └── utils/
│   │   │       ├── argon2.js
│   │   │       ├── constant.js
│   │   │       ├── cookies.js
│   │   │       ├── http-error.js
│   │   │       ├── jwt.js
│   │   │       ├── logger.js
│   │   │       ├── pagination.js
│   │   │       ├── response.js
│   │   │       ├── sanitize.js
│   │   │       └── validate-env.js
│   │   ├── database/
│   │   │   ├── migrations/         # 8 Knex migrations (workspace-based RAG schema)
│   │   │   └── seeds/
│   │   │       ├── 01_permissions.js  # 30 permissions across 8 resources
│   │   │       └── 02_test_users.js   # 2 test users (alice, bob)
│   │   └── tests/
│   │       ├── helpers.js          # createTestUser, createTestWorkspace, getAuthHeaders, cleanAllTables
│   │       ├── global-setup.js
│   │       ├── global-teardown.js
│   │       ├── integration/        # auth, health, permissions
│   │       └── unit/               # http-error, pagination, request-id, sanitize
│   │
│   └── app/
│       └── src/
│           ├── api/                # HTTP service layer (fetch-based)
│           │   ├── auth.js
│           │   ├── invitations.js
│           │   ├── permissions.js
│           │   └── roles.js
│           ├── stores/             # Pinia stores
│           │   ├── auth.js
│           │   ├── invitations.js
│           │   ├── members.js
│           │   └── roles.js
│           ├── composables/        # Bridge: stores -> components
│           │   ├── useAuth.js
│           │   ├── useInvitations.js
│           │   ├── useMembers.js
│           │   ├── usePermissions.js
│           │   └── useRoles.js
│           ├── views/              # Routed page components
│           │   ├── auth/           # LoginView, SignupView
│           │   └── invitations/    # MyInvitationsView
│           ├── components/         # Reusable UI components
│           │   ├── AppLayout.vue
│           │   ├── AppSidebar.vue
│           │   ├── InviteFormModal.vue
│           │   ├── InvitationsTable.vue
│           │   ├── MembersTable.vue
│           │   └── RoleFormModal.vue
│           ├── router/             # Vue Router + auth guards
│           └── utils/              # Fetch client, localStorage helpers
│
├── plans/                          # Feature implementation plans (F1–F7)
├── docs/superpowers/specs/         # Design specifications
├── nginx/                          # nginx configs (production + local)
├── package.json                    # Monorepo root
├── pnpm-workspace.yaml
└── turbo.json
```

## Code style

Both apps use the same conventions:

- **Formatter**: Prettier — no semicolons, 2-space indent, 100-char width
- **Linter**: Oxlint (API), Oxlint + ESLint (app)
- **Modules**: ES modules (`"type": "module"`)
- **File naming**: kebab-case

Run before committing:

```bash
corepack pnpm lint
corepack pnpm format
```
