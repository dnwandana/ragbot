# CLAUDE.md

RAG Chatbot API — workspace-based multi-tenant Express.js REST API with PostgreSQL + pgvector, JWT authentication, RBAC, and a planned RAG pipeline. ES Modules (`"type": "module"`), Node.js v24+ (pinned in `.nvmrc`).

## Commands

```bash
npm run dev              # Development server with nodemon
npm start                # Production server
npm test                 # Run tests (Vitest)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run lint             # Oxlint (linter)
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier check
npm run format:fix       # Prettier fix
npm run migrate          # Run latest migrations
npm run migrate:make <n> # Create migration
npm run migrate:rollback # Rollback last migration
npm run seed             # Run all seeds
npm run seed:make <n>    # Create seed file
```

No pre-commit hooks. Run `npm run lint:fix && npm run format:fix` before committing.

## Architecture

### MVC Pattern

- **Models** (`src/models/`): Knex.js queries only — no business logic
- **Controllers** (`src/controllers/`): Business logic, Joi validation, coordinates models
- **Routes** (`src/routes/`): Route definitions + param validation middleware, aggregated in `routes/index.js`
- **Middleware** (`src/middlewares/`): Authorization (JWT), permission guards (`requirePermission`)

### Middleware Order (critical — in `src/app.js`)

1. Request ID (`requestId` — must be first so all downstream middleware can use `req.id`)
2. Security (helmet with strict CSP, cors with explicit origins)
3. Body parsing (express.json + express.urlencoded, both 100kb limit)
4. HPP (HTTP Parameter Pollution protection)
5. Cookie parsing (cookie-parser — populates `req.cookies` for auth token access)
6. Health check (`/health` — before rate limiting so load balancers aren't throttled)
7. Rate limiting (generalLimiter — global, configurable via `RATE_LIMIT_GENERAL_MAX`)
8. Logging (Morgan httpLogger + custom requestLogger)
9. Routes (`/api`):
   - `/api/auth/*` — auth routes (authLimiter)
   - `requireAccessToken` — routes below require auth
   - `/api/permissions` — permission reference
10. 404 handler (notFoundHandler)
11. Error handler (errorHandler) — **must be last**

`trust proxy` is set to `1` so rate limiting works correctly behind reverse proxies.

### App Extraction (`src/app.js` vs `src/index.js`)

`src/app.js` configures Express (middleware, routes) and exports the app without calling `listen()`. `src/index.js` is the thin entry point: loads env, validates it, dynamically imports `app.js`, then starts the server. This split enables Supertest to import the app directly without binding to a port.

### Request ID Tracking

`src/middlewares/request-id.js` runs first in the middleware chain. Accepts an incoming `X-Request-Id` header (validated as UUID) or generates a UUID via `crypto.randomUUID()`. Stores on `req.id`, echoes in the response `X-Request-Id` header. All logs (Morgan, requestLogger, errorHandler, notFoundHandler) include `requestId: req.id`.

### Health Check

`GET /health` — mounted before rate limiting so load balancers aren't throttled. Returns DB connectivity status (`SELECT 1`), uptime, and timestamp. Uses `apiResponse()` wrapper. Returns 200 when healthy, 503 when DB is unreachable.

### Request Context Flow

Authorization middleware sets `req.user = { id }` from decoded JWT. `requirePermission(name)` checks `req.permissions.includes(name)`.

**Planned (not yet implemented)**:
- `resolveWorkspace` middleware: validates workspace_id, verifies membership, loads permissions → sets `req.workspace` and `req.permissions`
- Permission resolution per workspace scope

**Current request properties**:

```
req.id          // Request ID (from requestId middleware)
req.user        // { id } from JWT
req.permissions // [] (not yet populated — no resolveWorkspace middleware)
```

### Authentication Flow

- POST `/api/auth/signup` → creates user (currently username-based, email-based auth planned in F2), returns `{ id, username, email }` (no tokens)
- POST `/api/auth/signin` → stores refresh token hash in DB, sets `access_token` and `refresh_token` as httpOnly cookies, returns `{ id, username }`
- POST `/api/auth/refresh` → **token rotation**: revokes old refresh token, stores new hash, sets new `access_token` and `refresh_token` cookies
- POST `/api/auth/logout` → revokes the refresh token in DB, clears cookies. Idempotent (succeeds even if token already revoked).

Token cookies: `access_token` and `refresh_token` (httpOnly cookies set by server). JWT algorithm pinned to HS256 with explicit verification.

Validation: username 3–30 chars, alphanumeric + `.` `_` `-` only. Password 8–72 chars (72 is Argon2's input limit). Email optional, max 255 chars, unique if provided. Auth routes are rate-limited via `authLimiter` (default 10 req/15min, cap at 50).

### Refresh Token Architecture

**Table**: `refresh_tokens` — UUID PK, `user_id` FK CASCADE, `token_hash` (64-char SHA-256), `expires_at`, `revoked_at` (nullable). Index on `user_id` and unique on `token_hash`.

**Lifecycle**:

- **Signin**: Controller generates refresh token, hashes with SHA-256 (`refresh-tokens.hashToken`), stores hash in DB, sets tokens as httpOnly cookies.
- **Refresh**: Controller finds active token by hash (`findActiveByHash`), revokes old token (`revokeById`), creates new token hash, sets new token cookies via rotation. Prevents reuse — if a revoked token is used again, it's rejected.
- **Logout**: Controller revokes token by ID (`revokeById`), clears cookies. Idempotent — no error if token missing or already revoked.
- **Model functions**: `hashToken`, `create`, `findActiveByHash`, `revokeById`, `revokeAllForUser` (unused), `purgeOld` (unused — no cron job yet).

### Multi-Tenancy Architecture

**Model**: Shared database, tenant isolation via `workspace_id` columns. Flat workspace model (no org/project nesting).

**Isolation**: Composite foreign keys like `(id, workspace_id)` prevent cross-tenant references at the DB level. Partial unique indexes (`WHERE deleted_at IS NULL`) enforce uniqueness among active rows only.

**RBAC**: 30 permissions across 8 resources (workspace, role, member, audit, dataset, file, agent, conversation). 4 system roles per workspace (owner, admin, editor, viewer) with custom role support.

**System Roles**:
| Role   | Description                                |
| ------ | ------------------------------------------ |
| owner  | All 30 permissions                          |
| admin  | All except workspace:delete, role:delete    |
| editor | Read + create/update on datasets, files, agents, conversations; no member/role management |
| viewer | Read-only on all resources                  |

### Error Handling

Controllers throw `HttpError(status, message)` → caught by `next(error)` → centralized `errorHandler` logs full context (requestId, stack, IP, userId, method, URL) but only returns `{ message }` to client. Controllers should **not** log errors themselves — the centralized handler is the single logging point. Stack traces are only logged outside production. `notFoundHandler` logs 404s with user-agent tracking.

### Environment Validation

`src/utils/validate-env.js` runs at the very top of `src/index.js`, **before** Express initializes. Validates all required env vars with Joi (`abortEarly: false` to report all errors at once). JWT secrets must be ≥32 characters and must be distinct from each other. `RATE_LIMIT_AUTH_MAX` is capped at 50. Fails with `process.exit(1)` — not HttpError (Express doesn't exist yet).

### Pagination & Search

`src/utils/pagination.js` exports three functions:

- `validatePaginationQuery(query, sortableColumns)` — validates page, limit, sort_by, sort_order, search
- `buildPaginationMeta(page, limit, totalItems)` — pagination metadata object
- `executePaginatedQuery(countFn, findFn, conditions, params, searchableColumns)` — runs count + data fetch in parallel

Search input is sanitized via `escapeIlike()` from `src/utils/sanitize.js` — escapes `%`, `_`, and `\` so they are treated as literals in PostgreSQL ILIKE patterns.

## Complete Endpoint Table

### Public (no authentication)

| Method | Path                | Controller                          | Auth                | Rate Limit          |
| ------ | ------------------- | ----------------------------------- | ------------------- | ------------------- |
| GET    | `/health`           | Inline handler                      | No                  | No (before limiter) |
| POST   | `/api/auth/signup`  | `authentication.signup`             | No                  | authLimiter         |
| POST   | `/api/auth/signin`  | `authentication.signin`             | No                  | authLimiter         |
| GET    | `/api/auth/me`      | `authentication.getMe`              | requireAccessToken  | authLimiter         |
| POST   | `/api/auth/refresh` | `authentication.refreshAccessToken` | requireRefreshToken | authLimiter         |
| POST   | `/api/auth/logout`  | `authentication.logout`             | requireRefreshToken | authLimiter         |

### Authenticated (requireAccessToken)

| Method | Path              | Controller               | Permission |
| ------ | ----------------- | ------------------------ | ---------- |
| GET    | `/api/permissions` | `permissions.getPermissions` | —        |

### Planned Endpoints (not yet implemented)

```
# F2 — Email auth
POST   /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

# F3 — Workspaces + RBAC
POST   /api/workspaces
GET    /api/workspaces
GET    /api/workspaces/:workspace_id
PUT    /api/workspaces/:workspace_id
DELETE /api/workspaces/:workspace_id
GET    /api/workspaces/:workspace_id/members
POST   /api/workspaces/:workspace_id/members/invite
PUT    /api/workspaces/:workspace_id/members/:user_id
DELETE /api/workspaces/:workspace_id/members/:user_id
POST   /api/workspaces/:workspace_id/roles
GET    /api/workspaces/:workspace_id/roles
GET    /api/workspaces/:workspace_id/roles/:role_id
PUT    /api/workspaces/:workspace_id/roles/:role_id
DELETE /api/workspaces/:workspace_id/roles/:role_id

# F4 — Datasets + Files
POST   /api/workspaces/:workspace_id/datasets
GET    /api/workspaces/:workspace_id/datasets
GET    /api/workspaces/:workspace_id/datasets/:dataset_id
PUT    /api/workspaces/:workspace_id/datasets/:dataset_id
DELETE /api/workspaces/:workspace_id/datasets/:dataset_id
POST   /api/workspaces/:workspace_id/datasets/:dataset_id/files
GET    /api/workspaces/:workspace_id/datasets/:dataset_id/files
POST   /api/workspaces/:workspace_id/datasets/:dataset_id/files/:file_id/reprocess
DELETE /api/workspaces/:workspace_id/datasets/:dataset_id/files/:file_id

# F5 — Agents
POST   /api/workspaces/:workspace_id/agents
GET    /api/workspaces/:workspace_id/agents
GET    /api/workspaces/:workspace_id/agents/:agent_id
PUT    /api/workspaces/:workspace_id/agents/:agent_id
DELETE /api/workspaces/:workspace_id/agents/:agent_id

# F6 — Conversations
POST   /api/workspaces/:workspace_id/conversations
GET    /api/workspaces/:workspace_id/conversations
GET    /api/workspaces/:workspace_id/conversations/:conversation_id
PUT    /api/workspaces/:workspace_id/conversations/:conversation_id
DELETE /api/workspaces/:workspace_id/conversations/:conversation_id
POST   /api/workspaces/:workspace_id/conversations/:conversation_id/datasets

# F7 — Chat (ReAct + SSE)
POST   /api/workspaces/:workspace_id/conversations/:conversation_id/messages
GET    /api/workspaces/:workspace_id/conversations/:conversation_id/messages
```

## Model Catalog

| File                | Exports                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `users.js`          | `create`, `findOne`, `findOneWithPassword`, `incrementFailedAttempts`                       |
| `refresh-tokens.js` | `hashToken`, `create`, `findActiveByHash`, `revokeById`, `revokeAllForUser`, `purgeOld`     |
| `roles.js`          | `create`, `findOne`, `findMany`, `update`, `remove`, `findPermissionsByRoleId`, `setPermissions` |
| `permissions.js`    | `findAll`, `findOne`, `findByIds`                                                           |

## Controller Catalog

| File                | Exports                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `authentication.js` | `signup`, `signin`, `getMe`, `refreshAccessToken`, `logout`      |
| `permissions.js`    | `getPermissions`                                                 |
| `roles.js`          | `createRole`, `getRoles`, `getRole`, `updateRole`, `deleteRole`  |

## Middleware Catalog

| File                    | Exports                                     |
| ----------------------- | ------------------------------------------- |
| `request-id.js`         | `requestId`                                 |
| `authorization.js`      | `requireAccessToken`, `requireRefreshToken` |
| `require-permission.js` | `requirePermission`                         |
| `rate-limit.js`         | `authLimiter`, `generalLimiter`             |
| `logger.js`             | `httpLogger`, `requestLogger`               |
| `error.js`              | `errorHandler`, `notFoundHandler`           |

**Note**: `cookie-parser` is also loaded as middleware (NPM package, not a custom file) to populate `req.cookies` for reading auth tokens from httpOnly cookies.

## Utility Catalog

| File              | Exports                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `argon2.js`       | `hashPassword`, `verifyPassword`                                                         |
| `jwt.js`          | `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `verifyRefreshToken` |
| `cookies.js`      | `setAccessTokenCookie`, `setRefreshTokenCookie`, `clearAuthCookies`                      |
| `http-error.js`   | `HttpError` (default)                                                                    |
| `response.js`     | `apiResponse` (default)                                                                  |
| `pagination.js`   | `validatePaginationQuery`, `buildPaginationMeta`, `executePaginatedQuery`                |
| `sanitize.js`     | `escapeIlike`                                                                            |
| `constant.js`     | `HTTP_STATUS_CODE`, `HTTP_STATUS_MESSAGE`                                                |
| `logger.js`       | `logger` (default, Winston instance)                                                     |
| `validate-env.js` | `validateEnv` (default)                                                                  |

## Code Style

- **Formatter**: Prettier — no semicolons, 2-space indent, 100 char width
- **Linter**: Oxlint — correctness (error), suspicious (warn)
- **File naming**: kebab-case (`http-error.js`, `validate-env.js`)
- **UUIDs**: Use `crypto.randomUUID()` from `node:crypto` (not uuid package)
- **Imports**: ES modules only. Models use named exports. Controllers imported as namespace (`import * as controller`)
- **Responses**: Always use `apiResponse({ message, data, pagination })` from `src/utils/response.js`. Pass resource directly as `data` (object for single, array for list, `null` for delete/error). For paginated lists, pass the array as `data` and metadata as `pagination`.

## Environment Variables

Required: `DATABASE_URL`, `ACCESS_TOKEN_SECRET` (≥32 chars), `REFRESH_TOKEN_SECRET` (≥32 chars, must differ), `JWT_ISSUER`, `JWT_AUDIENCE`, `OPENROUTER_API_KEY`, `BREVO_API_KEY`, `BREVO_TEMPLATE_VERIFY_EMAIL`, `BREVO_TEMPLATE_RESET_PASSWORD`, `BREVO_TEMPLATE_WORKSPACE_INVITATION`, `EMAIL_FROM_ADDRESS`, `APP_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`, `LLAMAINDEX_API_KEY`, `LLAMAINDEX_WEBHOOK_SECRET` (≥16 chars), `FIRECRAWL_API_KEY`

Optional with defaults: `NODE_ENV` (development), `PORT` (3000), `ACCESS_TOKEN_EXPIRES_IN` (15m), `REFRESH_TOKEN_EXPIRES_IN` (7d), `LOG_LEVEL` (info), `LOG_TO_FILE` (true), `CORS_ALLOWED_ORIGINS` (http://localhost:8080), `RATE_LIMIT_AUTH_MAX` (10, capped at 50), `RATE_LIMIT_GENERAL_MAX` (100), `DEFAULT_EMBEDDINGS_MODEL` (openai/text-embedding-3-small), `DEFAULT_CHAT_MODEL` (openai/gpt-4.1), `S3_REGION` (auto), `EMAIL_FROM_NAME` ("RAG Chatbot")

## Database

- **Config**: `knexfile.js` — loads `.env.test` when `NODE_ENV=test`, connection pool min 2, max 10
- **Migrations**: `database/migrations/` — 8 migration files using raw SQL:
  - 001: Extensions (pgcrypto, vector) + 5 ENUM types
  - 002: Core tenancy (workspaces, users, email_tokens, refresh_tokens)
  - 003: Roles & permissions (permissions, roles, role_permissions, workspace_members)
  - 004: RAG pipeline (datasets, dataset_files, document_chunks with HNSW vector index)
  - 005: Agents (configurable system prompt + model)
  - 006: Conversations & messages (conversations, conversation_datasets, messages, message_citations)
  - 007: Functions (trigger_set_updated_at on 9 tables, search_chunks SQL function)
  - 008: Audit logs (append-only, immutable)
- **Seeds**: `database/seeds/` — 2 seed files:
  - 01: 30 permissions across 8 resources (workspace, role, member, audit, dataset, file, agent, conversation)
  - 02: 2 test users (alice@example.com, bob@example.com, password: "Password123!")
- 15 tables total, workspace-scoped via `workspace_id` with composite FKs
- Soft delete pattern on 8 tables via `deleted_at` column with partial unique indexes
- pgvector `vector(1536)` column for OpenAI embeddings with HNSW index

## Testing

- **Runner**: Vitest with `globals: true` (no explicit `describe`/`it` imports needed)
- **HTTP**: Supertest for integration tests against the Express app
- **Database**: Real PostgreSQL test database (configured in `.env.test`)
- **Config**: `vitest.config.js` — `fileParallelism: false` (integration tests share DB state), 10s timeout
- **Setup**: `tests/global-setup.js` — creates Knex client, runs migrations, seeds permissions, destroys client
- **Helpers**: `tests/helpers.js`:
  - `getApp()`, `request()` — app bootstrapping
  - `createTestUser(overrides)` — inserts user with Argon2-hashed password, returns `{ id, email, full_name, plainPassword }`
  - `getAuthHeaders(userId)` — generates JWT tokens, stores refresh hash in DB, returns Cookie header
  - `createTestWorkspace(userId)` — creates workspace + 4 system roles + permissions + adds creator as owner + creates system agent
  - `addWorkspaceMember(workspaceId, userId, roleId)` — adds member with active status
  - `cleanAllTables()` — truncates all 15 tables in dependency order
  - `seedPermissions()` — seeds 30 RAG permissions
- **Current test status**:
  - Passing (27): health (5), http-error (3), pagination (9), request-id (4), sanitize (6)
  - Broken (need rewrite for new schema): auth.test.js (20), permissions.test.js (7)

## Adding a New Resource

1. Migration: `npm run migrate:make create_<resource>_table` — include `workspace_id` FK for tenant scoping
2. Model: `src/models/<resource>.js` — CRUD with workspace-scoped conditions
3. Controller: `src/controllers/<resource>.js` — Use `req.workspace.id` for scoping, Joi validation inline
4. Routes: `src/routes/<resource>.js` — Use `Router({ mergeParams: true })` for nested routes, apply `requirePermission()` guards
5. Wire up in `src/routes/index.js`
6. Add permissions to `database/seeds/01_permissions.js`
