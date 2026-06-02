# RAG Chatbot

A workspace-based RAG (Retrieval-Augmented Generation) chatbot platform. Users upload documents into datasets, configure AI agents, and chat with their data — all isolated by workspace with role-based access control.

## What's inside

| App        | Stack                                                     | Purpose                           |
| ---------- | --------------------------------------------------------- | --------------------------------- |
| `apps/api` | Express 5, PostgreSQL + pgvector, Knex.js, OpenRouter API | REST API with auth, RAG pipeline  |
| `apps/app` | Vue 3, Pinia, Ant Design Vue, Vite                        | Single-page app consuming the API |
| `apps/web` | Astro 6, `@astrojs/sitemap`                               | Static marketing/landing site     |

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
DEFAULT_CHAT_MODEL=openai/gpt-4.1
LLAMAINDEX_PARSE_TIER=cost_effective  # fast | cost_effective | agentic | agentic_plus
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

### Web (`apps/web`)

```bash
cp apps/web/.env.example apps/web/.env
```

```bash
PUBLIC_SITE_URL=http://localhost:4321   # canonical/OG/sitemap/robots base URL
PUBLIC_APP_URL=http://localhost:8080    # CTA "Sign up free" → ${PUBLIC_APP_URL}/signup
```

## Database setup

Requires PostgreSQL with the `pgvector` extension installed. Run migrations and (optional) seed data:

```bash
cd apps/api
corepack pnpm migrate        # runs knex migrate:latest
corepack pnpm seed           # seeds permissions + 2 test users
```

## Development

```bash
# Start all apps
corepack pnpm dev

# Start individually
corepack pnpm dev:api   # http://localhost:3000
corepack pnpm dev:app   # http://localhost:8080
corepack pnpm dev:web   # http://localhost:4321  (apps/web Astro dev server)
```

## Scripts

| Command       | Description                        |
| ------------- | ---------------------------------- |
| `pnpm dev`    | Start all apps in watch mode       |
| `pnpm build`  | Build all apps                     |
| `pnpm lint`   | Lint all apps                      |
| `pnpm test`   | Run all tests (API only currently) |
| `pnpm format` | Format all apps with Prettier      |

Append `:api`, `:app`, or `:web` to target a single workspace (e.g. `pnpm build:web` for `apps/web` only).

## Current API endpoints

### Health (public, not rate-limited)

| Method | Path      | Description                                        |
| ------ | --------- | -------------------------------------------------- |
| GET    | `/health` | Health check — `{ status, database }` (DB ping)   |

### Authentication

| Method | Path                            | Auth          | Description                                              |
| ------ | ------------------------------- | ------------- | -------------------------------------------------------- |
| POST   | `/api/auth/signup`              | —             | Register — sends verification email                     |
| POST   | `/api/auth/verify-email`        | —             | Verify email via token from email link                   |
| POST   | `/api/auth/resend-verification` | —             | Resend verification email (always returns 200)           |
| POST   | `/api/auth/signin`              | —             | Sign in — requires verified email, sets httpOnly cookies |
| POST   | `/api/auth/forgot-password`     | —             | Request password reset email (always returns 200)        |
| POST   | `/api/auth/reset-password`      | —             | Reset password via token, revokes all sessions           |
| GET    | `/api/auth/me`                  | Access Token  | Return current user                                      |
| PUT    | `/api/auth/profile`             | Access Token  | Update `full_name` and/or `email`                        |
| DELETE | `/api/auth/profile`             | Access Token  | Delete account (soft delete, clears cookies)             |
| PUT    | `/api/auth/password`            | Access Token  | Change password                                          |
| POST   | `/api/auth/refresh`             | Refresh Token | Rotate tokens via httpOnly cookie                        |
| POST   | `/api/auth/logout`              | Refresh Token | Revoke refresh token, clear cookies                      |

### Permissions

| Method | Path               | Auth         | Description               |
| ------ | ------------------ | ------------ | ------------------------- |
| GET    | `/api/permissions` | Access Token | Permission reference list |

### Invitations

| Method | Path                           | Auth         | Description                          |
| ------ | ------------------------------ | ------------ | ------------------------------------ |
| GET    | `/api/invitations/:token`      | —            | Preview invitation details (public)  |
| POST   | `/api/invitations/accept`      | Access Token | Accept a workspace invitation        |

### Workspaces

| Method | Path                    | Auth         | Permission         |
| ------ | ----------------------- | ------------ | ------------------ |
| GET    | `/api/workspaces`       | Access Token | —                  |
| POST   | `/api/workspaces`       | Access Token | —                  |
| GET    | `/api/workspaces/:id`   | Access Token | `workspace:read`   |
| PUT    | `/api/workspaces/:id`   | Access Token | `workspace:update` |
| DELETE | `/api/workspaces/:id`   | Access Token | `workspace:delete` |

### Roles

| Method | Path                              | Permission    |
| ------ | --------------------------------- | ------------- |
| GET    | `/api/workspaces/:id/roles`       | `role:read`   |
| POST   | `/api/workspaces/:id/roles`       | `role:create` |
| GET    | `/api/workspaces/:id/roles/:rid`  | `role:read`   |
| PUT    | `/api/workspaces/:id/roles/:rid`  | `role:update` |
| DELETE | `/api/workspaces/:id/roles/:rid`  | `role:delete` |

### Members

| Method | Path                                         | Permission          |
| ------ | -------------------------------------------- | ------------------- |
| GET    | `/api/workspaces/:id/members`                | `member:read`       |
| GET    | `/api/workspaces/:id/members/:mid`           | `member:read`       |
| POST   | `/api/workspaces/:id/members/invite`         | `member:invite`     |
| PUT    | `/api/workspaces/:id/members/:mid/role`      | `member:manage_role`|
| DELETE | `/api/workspaces/:id/members/:mid`           | `member:remove`     |

### Audit Logs

| Method | Path                               | Permission    |
| ------ | ---------------------------------- | ------------- |
| GET    | `/api/workspaces/:id/audit-logs`   | `audit:read`  |

### Datasets

| Method | Path                                               | Permission           |
| ------ | -------------------------------------------------- | -------------------- |
| GET    | `/api/workspaces/:id/datasets`                     | `dataset:read`       |
| POST   | `/api/workspaces/:id/datasets`                     | `dataset:create`     |
| GET    | `/api/workspaces/:id/datasets/:did`                | `dataset:read`       |
| PUT    | `/api/workspaces/:id/datasets/:did`                | `dataset:update`     |
| DELETE | `/api/workspaces/:id/datasets/:did`                | `dataset:delete`     |
| POST   | `/api/workspaces/:id/datasets/:did/conversations`  | `conversation:create`|

### Dataset Files

| Method | Path                                                         | Permission       |
| ------ | ------------------------------------------------------------ | ---------------- |
| GET    | `/api/workspaces/:id/datasets/:did/files`                    | `file:read`      |
| GET    | `/api/workspaces/:id/datasets/:did/files/:fid`               | `file:read`      |
| POST   | `/api/workspaces/:id/datasets/:did/files/upload`             | `file:upload`    |
| POST   | `/api/workspaces/:id/datasets/:did/files/scrape-url`         | `file:upload`    |
| PUT    | `/api/workspaces/:id/datasets/:did/files/:fid`               | `file:update`    |
| DELETE | `/api/workspaces/:id/datasets/:did/files/:fid`               | `file:delete`    |
| POST   | `/api/workspaces/:id/datasets/:did/files/:fid/reprocess`     | `file:reprocess` |

### Agents

| Method | Path                                 | Permission      |
| ------ | ------------------------------------ | --------------- |
| GET    | `/api/workspaces/:id/agents`         | `agent:read`    |
| POST   | `/api/workspaces/:id/agents`         | `agent:create`  |
| GET    | `/api/workspaces/:id/agents/:aid`    | `agent:read`    |
| PUT    | `/api/workspaces/:id/agents/:aid`    | `agent:update`  |
| DELETE | `/api/workspaces/:id/agents/:aid`    | `agent:delete`  |

### Conversations

| Method | Path                                                         | Permission              |
| ------ | ------------------------------------------------------------ | ----------------------- |
| GET    | `/api/workspaces/:id/conversations`                          | `conversation:read`     |
| POST   | `/api/workspaces/:id/conversations`                          | `conversation:create`   |
| GET    | `/api/workspaces/:id/conversations/:cid`                     | `conversation:read`     |
| PUT    | `/api/workspaces/:id/conversations/:cid`                     | `conversation:update`   |
| DELETE | `/api/workspaces/:id/conversations/:cid`                     | `conversation:delete`   |
| POST   | `/api/workspaces/:id/conversations/:cid/messages`            | `conversation:chat`     |

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

The test suite uses real PostgreSQL (no mocks). Vitest runs migrations once before the session, and `cleanAllTables()` truncates between tests. Auth tests mock the Brevo email service; queue tests mock BullMQ so no Redis is required locally. Currently passing: 162 tests (health, auth, workspaces, webhooks, datasets, agents, conversations, chat, http-error, pagination, request-id, sanitize, redis, permissions), 0 skipped.

## Deployment

Production deployment uses Docker Compose with nginx as the sole entry point. Two containers run on the host VM; PostgreSQL remains an external service.

### How it works

```
nginx (ports 80/443)
  ├── / → serves Vue static files (built into the image)
  ├── /api → proxies to Express container
  └── /health → proxies to Express container

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

| Variable                    | Required | Description                                                                                         |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`         | No       | Build-time API base URL. Defaults to `/api` (same-origin, recommended).                             |
| `DATABASE_URL`              | Yes      | PostgreSQL connection string                                                                        |
| `REDIS_URL`                 | Yes      | Redis connection string (`redis://localhost:6379` or `redis://:pass@host:6379`)                     |
| `ACCESS_TOKEN_SECRET`       | Yes      | JWT secret, min 32 chars                                                                            |
| `REFRESH_TOKEN_SECRET`      | Yes      | JWT secret, min 32 chars, must differ from access secret                                            |
| `JWT_ISSUER`                | Yes      | e.g. `https://yourdomain.com`                                                                       |
| `JWT_AUDIENCE`              | Yes      | e.g. `https://yourdomain.com`                                                                       |
| `OPENROUTER_API_KEY`        | Yes      | API key for OpenRouter (LLM + embedding inference)                                                  |
| `BREVO_API_KEY`             | Yes      | API key for Brevo (transactional email)                                                             |
| `S3_BUCKET`                 | Yes      | Cloudflare R2 bucket name for file storage                                                          |
| `S3_ACCESS_KEY`             | Yes      | R2 access key                                                                                       |
| `S3_SECRET_KEY`             | Yes      | R2 secret key                                                                                       |
| `S3_ENDPOINT`               | Yes      | R2 endpoint URL                                                                                     |
| `LLAMAINDEX_API_KEY`        | Yes      | API key for LlamaIndex (document parsing)                                                           |
| `FIRECRAWL_API_KEY`         | Yes      | API key for Firecrawl (URL scraping)                                                                |
| `LLAMAINDEX_PARSE_TIER`     | No       | LlamaParse tier: `fast`, `cost_effective`, `agentic`, `agentic_plus`. Defaults to `cost_effective`. |
| `CORS_ALLOWED_ORIGINS`      | No       | Defaults to `http://localhost:8080`. Set to `https://yourdomain.com` in production.                 |

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
│   │   │   │   ├── chat.js
│   │   │   │   ├── permissions.js
│   │   │   │   └── roles.js
│   │   │   ├── emails/
│   │   │   │   ├── render.js             # Template loader with {{var}} substitution
│   │   │   │   └── templates/            # verify-email, reset-password, workspace-invitation HTML
│   │   │   ├── models/
│   │   │   │   ├── email-tokens.js
│   │   │   │   ├── permissions.js
│   │   │   │   ├── refresh-tokens.js
│   │   │   │   ├── roles.js
│   │   │   │   └── users.js
│   │   │   ├── services/
│   │   │   │   ├── email.js             # Brevo transactional email via inline HTML
│   │   │   │   ├── openrouter.js        # LLM inference + streaming chat completions
│   │   │   │   └── rag.js               # RAG pipeline: embed, search, build context
│   │   │   ├── routes/
│   │   │   │   ├── authentication.js
│   │   │   │   ├── conversations.js    # Conversation CRUD + chat messages route
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
│           │   ├── chat.js             # SSE chat via native fetch
│           │   ├── invitations.js
│           │   ├── permissions.js
│           │   └── roles.js
│           ├── stores/             # Pinia stores
│           │   ├── auth.js
│           │   ├── chat.js             # Chat streaming state
│           │   ├── invitations.js
│           │   ├── members.js
│           │   └── roles.js
│           ├── composables/        # Bridge: stores -> components
│           │   ├── useAuth.js
│           │   ├── useChat.js          # Chat sendMessage + abort
│           │   ├── useInvitations.js
│           │   ├── useMembers.js
│           │   ├── usePermissions.js
│           │   └── useRoles.js
│           ├── views/              # Routed page components
│           │   ├── auth/           # LoginView, SignupView, VerifyEmailView, ForgotPasswordView, ResetPasswordView
│           │   ├── conversations/  # ConversationsListView, ChatView
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
│   │
│   └── web/                        # Astro 6 static marketing site
│       ├── astro.config.mjs        # output: 'static' + sitemap
│       ├── public/scripts/app.js   # vanilla-JS interactions (nav, reveal, hero chat, theme)
│       └── src/
│           ├── pages/              # index.astro, 404.astro, robots.txt.js
│           ├── layouts/            # BaseLayout.astro (SEO + anti-flash theme)
│           ├── components/         # Nav, Hero, HowItWorks, Benefits, Footer, …
│           ├── icons/              # static .astro SVG components
│           └── styles/             # colors_and_type.css, marketing.css
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
