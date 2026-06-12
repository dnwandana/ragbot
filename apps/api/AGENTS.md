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

`src/app.js` configures Express (middleware, routes) and exports the app without calling `listen()`. `src/index.js` is the thin entry point: loads env, validates it, dynamically imports `app.js`, starts the server, then starts the BullMQ worker. This split enables Supertest to import the app directly without binding to a port or starting Redis connections.

### Async File Processing (BullMQ)

Dataset file processing uses a persistent BullMQ job queue backed by Redis. All three trigger points (file upload via LlamaIndex polling, URL scraping, reprocess) push the same minimal job payload:

```js
{ datasetFileId: string, datasetId: string }
```

No content is stored in Redis — the worker re-fetches markdown from the source on every run, making jobs idempotent and safe to retry.

**Queue** (`src/queues/file-processing.js`): `fileProcessingQueue` (BullMQ Queue, named `'file-processing'`), `addProcessingJob({ datasetFileId, datasetId })`. Jobs retry 3× with exponential backoff (5 s base).

**Worker** (`src/workers/file-processing.js`): `startWorker()` — creates a BullMQ Worker (concurrency 2). The processor resolves the markdown source from DB metadata (`llamaindex_job_id` → LlamaIndex, `source_url` → Firecrawl), then runs the pipeline: split → embed → delete old chunks → bulk insert → generate questions → mark `completed`. On final failure (after all retries), sets `status = 'failed'`. Worker is started in `src/index.js` and closed gracefully on SIGTERM/SIGINT before the DB connection.

**Test mocking**: `tests/setup.js` mocks `src/queues/file-processing.js` with no-op stubs so tests don't require a running Redis instance.

### Request ID Tracking

`src/middlewares/request-id.js` runs first in the middleware chain. Accepts an incoming `X-Request-Id` header (validated as UUID) or generates a UUID via `crypto.randomUUID()`. Stores on `req.id`, echoes in the response `X-Request-Id` header. All logs (Morgan, requestLogger, errorHandler, notFoundHandler) include `requestId: req.id`.

### Health Check

`GET /health` — mounted before rate limiting so load balancers aren't throttled. Returns DB connectivity status (`SELECT 1`), uptime, and timestamp. Uses `apiResponse()` wrapper. Returns 200 when healthy, 503 when DB is unreachable.

### Request Context Flow

Authorization middleware sets `req.user = { id }` from decoded JWT. `requirePermission(name)` checks `req.permissions.includes(name)`.

**`resolveWorkspace` (wired)** — `src/middlewares/resolve-workspace.js` is mounted in `src/routes/workspaces.js` via `router.use("/:workspace_id", resolveWorkspace)`, so it runs for every workspace-scoped route. It validates `req.params.workspace_id` is a well-formed UUID (400 if not), loads the workspace excluding soft-deleted rows (404 if missing), then loads the authenticated user's permission names via their active `workspace_members` role chain (403 if no membership). On success it sets `req.workspace` (the workspace record) and `req.permissions` (the resolved permission names array consumed by `requirePermission`).

**Current request properties**:

```
req.id          // Request ID (from requestId middleware)
req.user        // { id } from JWT
req.workspace   // workspace record (set by resolveWorkspace on workspace-scoped routes)
req.permissions // [] of permission names (populated by resolveWorkspace)
```

### Authentication Flow

- POST `/api/auth/signup` → creates user with email + full_name, sends verification email via Brevo, returns `{ id, email, full_name }` (no tokens)
- POST `/api/auth/verify-email` → validates token from email, sets `email_verified = true`
- POST `/api/auth/resend-verification` → resends verification email (always returns 200 to prevent enumeration)
- POST `/api/auth/signin` → requires verified email, stores refresh token hash in DB, sets `access_token` and `refresh_token` as httpOnly cookies, returns `{ id, email, full_name }`
- POST `/api/auth/forgot-password` → sends reset password email (always returns 200 to prevent enumeration)
- POST `/api/auth/reset-password` → validates reset token, updates password, revokes all refresh tokens for the user
- POST `/api/auth/refresh` → **token rotation**: revokes old refresh token, stores new hash, sets new `access_token` and `refresh_token` cookies
- POST `/api/auth/logout` → revokes the refresh token in DB, clears cookies. Idempotent (succeeds even if token already revoked).

Token cookies: `access_token` and `refresh_token` (httpOnly cookies set by server). JWT algorithm pinned to HS256 with explicit verification.

Validation: email (required, lowercase, valid format), password 8–72 chars (72 is Argon2's input limit), full_name 1–100 chars. Email tokens use SHA-256 hashing with configurable expiration (verify: 24h, reset: 1h). Auth routes are rate-limited via `authLimiter` (default 10 req/15min, cap at 50).

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

**RBAC**: 31 permissions across 8 resources (workspace, role, member, audit, dataset, file, agent, conversation). 4 system roles per workspace (owner, admin, editor, viewer) with custom role support.

**System Roles**:
| Role | Description |
| ------ | ------------------------------------------ |
| owner | All 31 permissions |
| admin | All except workspace:delete, role:delete |
| editor | Read + create/update on datasets, files, agents, conversations; no member/role management |
| viewer | Read-only on all resources |

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

### Chat (ReAct Loop + SSE Streaming)

The chat feature uses a server-side ReAct (Reason-Act-Observe) loop with dual-mode response:

- **SSE mode** (default): Client sends `Accept: text/event-stream` → server streams `token`, `thought`, `observation`, `citation`, and `done` events as the ReAct loop iterates
- **JSON mode**: Client sends normal request → server runs the full loop and returns the complete response as JSON

**RAG Service** (`src/services/rag.js`): `searchChunks` — embeds the query via OpenRouter, calls `search_chunks()` SQL function for cosine similarity search, returns ranked document chunks. `buildSystemMessage` — constructs the agent's system prompt with injected context from search results.

**OpenRouter Streaming** (`src/services/openrouter.js`): `chatCompletionStream` — streams chat completion tokens from OpenRouter API using server-sent events, yielding tokens as they arrive for real-time response delivery.

## Complete Endpoint Table

### Public (no authentication)

| Method | Path                            | Controller                          | Auth                | Rate Limit          |
| ------ | ------------------------------- | ----------------------------------- | ------------------- | ------------------- |
| GET    | `/health`                       | Inline handler                      | No                  | No (before limiter) |
| POST   | `/api/auth/signup`              | `authentication.signup`             | No                  | authLimiter         |
| POST   | `/api/auth/verify-email`        | `authentication.verifyEmail`        | No                  | authLimiter         |
| POST   | `/api/auth/resend-verification` | `authentication.resendVerification` | No                  | authLimiter         |
| POST   | `/api/auth/signin`              | `authentication.signin`             | No                  | authLimiter         |
| POST   | `/api/auth/forgot-password`     | `authentication.forgotPassword`     | No                  | authLimiter         |
| POST   | `/api/auth/reset-password`      | `authentication.resetPassword`      | No                  | authLimiter         |
| GET    | `/api/auth/me`                  | `authentication.getMe`              | requireAccessToken  | authLimiter         |
| POST   | `/api/auth/refresh`             | `authentication.refreshAccessToken` | requireRefreshToken | authLimiter         |
| POST   | `/api/auth/logout`              | `authentication.logout`             | requireRefreshToken | authLimiter         |

### Authenticated (requireAccessToken)

| Method | Path               | Controller                   | Permission |
| ------ | ------------------ | ---------------------------- | ---------- |
| GET    | `/api/permissions` | `permissions.getPermissions` | —          |

### Workspace-scoped (requireAccessToken + resolveWorkspace)

| Method | Path                                                                          | Controller                               | Permission            |
| ------ | ----------------------------------------------------------------------------- | ---------------------------------------- | --------------------- |
| POST   | `/api/workspaces/:workspace_id/conversations`                                 | `conversations.createConversation`       | `conversation:create` |
| GET    | `/api/workspaces/:workspace_id/conversations`                                 | `conversations.listConversations`        | `conversation:read`   |
| GET    | `/api/workspaces/:workspace_id/conversations/:conversation_id`                | `conversations.getConversation`          | `conversation:read`   |
| PUT    | `/api/workspaces/:workspace_id/conversations/:conversation_id`                | `conversations.updateConversation`       | `conversation:update` |
| DELETE | `/api/workspaces/:workspace_id/conversations/:conversation_id`                | `conversations.deleteConversation`       | `conversation:delete` |
| POST   | `/api/workspaces/:workspace_id/datasets/:dataset_id/conversations`            | `datasets.createConversationFromDataset` | `conversation:create` |
| POST   | `/api/workspaces/:workspace_id/conversations/:conversation_id/messages`       | `chat.sendMessage`                       | `conversation:chat`   |
| GET    | `/api/workspaces/:workspace_id/audit-logs`                                    | `audit-logs.listAuditLogs`               | `audit:read`          |
| GET    | `/api/workspaces/:workspace_id/datasets/:dataset_id/files/:file_id/questions` | `dataset-files.listFileQuestions`        | `file:read`           |
| GET    | `/api/workspaces/:workspace_id/datasets/:dataset_id/files/:file_id/chunks`    | `dataset-files.listFileChunks`           | `file:read`           |

> The workspace-scoped table above is illustrative, not exhaustive — workspaces, roles, members, datasets, dataset-files, and agents are also mounted under `/api/workspaces/:workspace_id/*`. See `apps/api/openapi.json` for the full REST reference, or the route files in `src/routes/`.

## Audit Logging (wired)

Audit logging is implemented and wired (not planned). `src/utils/audit.js` exports `logAuditEvent`, which inserts an immutable row into `audit_logs` for a workspace-scoped action. It is called from the datasets, workspaces, members, and dataset-files controllers on mutating operations. Entries are exposed read-only via `GET /api/workspaces/:workspace_id/audit-logs` (`controllers/audit-logs.js` → `listAuditLogs`, guarded by `audit:read`), with `models/audit-logs.js` providing `findMany`/`count` for paginated retrieval.

## Model Catalog

| File                                | Exports                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `users.js`                          | `create`, `findOne`, `findOneWithPassword`, `update`, `softDelete`                                              |
| `email-tokens.js`                   | `hashToken`, `create`, `findActiveByHash`, `markUsed`, `deleteExpired`, `deleteByUser`                          |
| `refresh-tokens.js`                 | `hashToken`, `create`, `findActiveByHash`, `revokeById`, `revokeAllForUser`, `purgeOld`                         |
| `roles.js`                          | `create`, `findOne`, `findMany`, `update`, `remove`, `findPermissionsByRoleId`, `setPermissions`                |
| `permissions.js`                    | `findAll`, `findOne`, `findByIds`                                                                               |
| `agents.js`                         | `create`, `findOne`, `findSystemAgent`, `count`, `findManyPaginated`, `update`, `softDelete`                    |
| `conversations.js`                  | `create`, `findOne`, `count`, `findManyPaginated`, `update`, `softDelete`                                       |
| `conversation-datasets.js`          | `create`, `findByConversationId`, `findDatasetIds`, `remove`, `removeByConversationId`                          |
| `conversation-messages.js`          | `create`, `findOne`, `findByConversationId`, `findVisibleByConversationId`                                      |
| `conversation-message-citations.js` | `bulkInsert`, `findByMessageId`, `findByConversationId`                                                         |
| `workspaces.js`                     | `create`, `findOne`, `findManyByUserId`, `update`, `softDelete`                                                 |
| `workspace-members.js`              | `create`, `findOne`, `findManyByWorkspaceId`, `getPermissions`, `countActiveOwners`, `updateRole`, `softDelete` |
| `datasets.js`                       | `create`, `findOne`, `count`, `findManyPaginated`, `update`, `softDelete`                                       |
| `dataset-files.js`                  | `create`, `findOne`, `count`, `findManyPaginated`, `update`, `softDelete`, `softDeleteByDataset`                |
| `dataset-file-chunks.js`            | `bulkInsert`, `deleteByFileId`, `countByDatasetFileId`, `deleteByDatasetId`, `count`, `findManyPaginated`       |
| `dataset-file-questions.js`         | `bulkInsert`, `findByFileId`, `deleteByFileId`, `deleteByDatasetId`                                             |
| `audit-logs.js`                     | `findMany`, `count`                                                                                             |

## Controller Catalog

| File                | Exports                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authentication.js` | `signup`, `verifyEmail`, `resendVerification`, `signin`, `forgotPassword`, `resetPassword`, `getMe`, `refreshAccessToken`, `logout`                                 |
| `permissions.js`    | `getPermissions`                                                                                                                                                    |
| `roles.js`          | `createRole`, `getRoles`, `getRole`, `updateRole`, `deleteRole`                                                                                                     |
| `agents.js`         | `createAgent`, `listAgents`, `getAgent`, `updateAgent`, `deleteAgent`                                                                                               |
| `conversations.js`  | `createConversation`, `listConversations`, `getConversation`, `updateConversation`, `deleteConversation`                                                            |
| `datasets.js`       | `createDataset`, `listDatasets`, `getDataset`, `updateDataset`, `deleteDataset`, `createConversationFromDataset`                                                    |
| `chat.js`           | `sendMessage`                                                                                                                                                       |
| `members.js`        | `listMembers`, `getMember`, `inviteMember`, `changeRole`, `removeMember`, `acceptInvitation`, `previewInvitation`                                                   |
| `workspaces.js`     | `createWorkspace`, `getWorkspaces`, `getWorkspace`, `updateWorkspace`, `deleteWorkspace`                                                                            |
| `dataset-files.js`  | `upload` (Multer middleware), `uploadFile`, `scrapeUrl`, `listFiles`, `getFile`, `updateFile`, `deleteFile`, `reprocessFile`, `listFileQuestions`, `listFileChunks` |
| `audit-logs.js`     | `listAuditLogs`                                                                                                                                                     |

## Middleware Catalog

| File                    | Exports                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `request-id.js`         | `requestId`                                                                                              |
| `authorization.js`      | `requireAccessToken`, `requireRefreshToken`                                                              |
| `resolve-workspace.js`  | `resolveWorkspace` — validates `workspace_id`, loads workspace, sets `req.workspace` + `req.permissions` |
| `require-permission.js` | `requirePermission`                                                                                      |
| `rate-limit.js`         | `authLimiter`, `generalLimiter`                                                                          |
| `logger.js`             | `httpLogger`, `requestLogger`                                                                            |
| `error.js`              | `errorHandler`, `notFoundHandler`                                                                        |

**Note**: `cookie-parser` is also loaded as middleware (NPM package, not a custom file) to populate `req.cookies` for reading auth tokens from httpOnly cookies.

## Utility Catalog

| File                | Exports                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `argon2.js`         | `hashPassword`, `verifyPassword`                                                         |
| `jwt.js`            | `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `verifyRefreshToken` |
| `cookies.js`        | `setAccessTokenCookie`, `setRefreshTokenCookie`, `clearAuthCookies`                      |
| `http-error.js`     | `HttpError` (default)                                                                    |
| `response.js`       | `apiResponse` (default)                                                                  |
| `pagination.js`     | `validatePaginationQuery`, `buildPaginationMeta`, `executePaginatedQuery`                |
| `sanitize.js`       | `escapeIlike`                                                                            |
| `constant.js`       | `HTTP_STATUS_CODE`, `HTTP_STATUS_MESSAGE`                                                |
| `logger.js`         | `logger` (default, Winston instance)                                                     |
| `redis.js`          | `parseRedisUrl`                                                                          |
| `allowed-models.js` | `ALLOWED_MODELS`, `DEFAULT_MODEL` — agent model allowlist and default chat model         |
| `audit.js`          | `logAuditEvent` — inserts an immutable audit_logs row for a workspace-scoped action      |
| `validate-env.js`   | `validateEnv` (default)                                                                  |

## Service Catalog

| File                    | Exports                                                             | Description                                                              |
| ----------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `email.js`              | `sendEmail`                                                         | Brevo transactional email via inline HTML templates                      |
| `openrouter.js`         | `embedText`, `embedBatch`, `chatCompletion`, `chatCompletionStream` | OpenRouter LLM inference for embeddings, chat, and streaming             |
| `rag.js`                | `searchChunks`, `buildSystemMessage`                                | RAG pipeline: embed query, vector search, build context                  |
| `firecrawl.js`          | `scrapeUrl`                                                         | Scrape a URL to markdown via the Firecrawl API                           |
| `llamaindex.js`         | `submitParseJob`, `pollForMarkdown`                                 | Submit files to LlamaIndex Cloud for async parsing and poll for markdown |
| `question-generator.js` | `generateQuestions`                                                 | Generate 5–10 exploration questions for a document via OpenRouter chat   |
| `storage.js`            | `uploadFile`, `deleteFile`, `getSignedDownloadUrl`                  | S3/R2 object storage: upload, delete, presigned download URLs            |
| `text-splitter.js`      | `splitText`                                                         | Recursive character text splitting into overlapping chunks (LangChain)   |

## Queue & Worker Catalog

| File                         | Exports                                   | Description                                                                                                                              |
| ---------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `queues/file-processing.js`  | `fileProcessingQueue`, `addProcessingJob` | BullMQ queue (`file-processing`); enqueues `{ datasetFileId, datasetId }` jobs (3 retries, exponential backoff)                          |
| `workers/file-processing.js` | `startWorker`, `runProcessingPipeline`    | BullMQ worker (concurrency 2) running the split → embed → store → questions pipeline; questions stored in `dataset_file_questions` table |

## Code Style

- **Formatter**: Prettier — no semicolons, 2-space indent, 100 char width
- **Linter**: Oxlint — correctness (error), suspicious (warn)
- **File naming**: kebab-case (`http-error.js`, `validate-env.js`)
- **UUIDs**: Use `crypto.randomUUID()` from `node:crypto` (not uuid package)
- **Imports**: ES modules only. Models use named exports. Controllers imported as namespace (`import * as controller`)
- **Responses**: Always use `apiResponse({ message, data, pagination })` from `src/utils/response.js`. Pass resource directly as `data` (object for single, array for list, `null` for delete/error). For paginated lists, pass the array as `data` and metadata as `pagination`.
- **JSDoc**: Full JSDoc blocks on every exported function with `@param {type} name - description` and `@returns {type}` tags. Use `@throws` where applicable. One-line JSDoc (`/** description */`) for constants and Joi schemas. No section divider comments (`// ── Section ───`). Controller functions use the `METHOD /path — Short description` pattern as the first JSDoc line, followed by a paragraph explaining behavior, then `@param {Object} req - Express request object` (see `controllers/permissions.js` for reference).
- **Destructured parameters**: Functions accepting 3 or more semantic parameters must use a destructured object parameter. Express handlers `(req, res, next)` are exempt. Internal helpers with 1-2 params stay positional.

## Environment Variables

Required: `DATABASE_URL`, `REDIS_URL` (Redis connection string — `redis://localhost:6379` locally, `rediss://` for TLS), `ACCESS_TOKEN_SECRET` (≥32 chars), `REFRESH_TOKEN_SECRET` (≥32 chars, must differ), `JWT_ISSUER`, `JWT_AUDIENCE`, `OPENROUTER_API_KEY`, `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `APP_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`, `LLAMAINDEX_API_KEY`, `FIRECRAWL_API_KEY`

Optional with defaults: `NODE_ENV` (development), `PORT` (3000), `ACCESS_TOKEN_EXPIRES_IN` (15m), `REFRESH_TOKEN_EXPIRES_IN` (7d), `LOG_LEVEL` (info), `LOG_TO_FILE` (true), `CORS_ALLOWED_ORIGINS` (http://localhost:8080), `RATE_LIMIT_AUTH_MAX` (10, capped at 50), `RATE_LIMIT_GENERAL_MAX` (100), `DEFAULT_EMBEDDINGS_MODEL` (openai/text-embedding-3-small), `DEFAULT_CHAT_MODEL` (openai/gpt-5.4-mini), `S3_REGION` (auto), `EMAIL_FROM_NAME` ("RAG Chatbot"), `LLAMAINDEX_PARSE_TIER` (cost_effective), `OPENROUTER_STREAM_TIMEOUT_MS` (60000)

## Database

- **Config**: `knexfile.js` — loads `.env.test` when `NODE_ENV=test`, connection pool min 2, max 10
- **Migrations**: `database/migrations/` — 9 migration files using raw SQL:
  - 001: Extensions (pgcrypto, vector) + 5 ENUM types
  - 002: Core tenancy (workspaces, users, email_tokens, refresh_tokens)
  - 003: Roles & permissions (permissions, roles, role_permissions, workspace_members)
  - 004: RAG pipeline (datasets, dataset_files, dataset_file_chunks with HNSW vector index, dataset_file_questions)
  - 005: Agents (configurable system prompt + model)
  - 006: Conversations & messages (conversations, conversation_datasets, conversation_messages, conversation_message_citations)
  - 007: Functions (trigger_set_updated_at on 9 tables, search_chunks SQL function)
  - 008: Audit logs (append-only, immutable)
  - 009: Expiry indexes (email_tokens, refresh_tokens)
- **Seeds**: `database/seeds/` — 2 seed files:
  - 01: 31 permissions across 8 resources (workspace, role, member, audit, dataset, file, agent, conversation)
  - 02: 2 test users (alice@example.com, bob@example.com, password: "Password123!")
- 16 tables total, workspace-scoped via `workspace_id` with composite FKs
- Soft delete pattern on 8 tables via `deleted_at` column with partial unique indexes
- pgvector `vector(1536)` column for OpenAI embeddings with HNSW index

## Testing

- **Runner**: Vitest with `globals: true` (no explicit `describe`/`it` imports needed)
- **HTTP**: Supertest for integration tests against the Express app
- **Database**: Real PostgreSQL test database (configured in `.env.test`)
- **Config**: `vitest.config.js` — `fileParallelism: false` (integration tests share DB state), 10s timeout
- **Setup**: `tests/global-setup.js` — creates Knex client, runs migrations, seeds permissions, destroys client
- **Setup file**: `tests/setup.js` — mocks `src/queues/file-processing.js` (no-op stubs) so tests run without Redis
- **Helpers**: `tests/helpers.js`:
  - `getApp()`, `request()` — app bootstrapping
  - `createTestUser(overrides)` — inserts user with Argon2-hashed password, returns `{ id, email, full_name, plainPassword }`
  - `getAuthHeaders(userId)` — generates JWT tokens, stores refresh hash in DB, returns Cookie header
  - `createTestWorkspace(userId)` — creates workspace + 4 system roles + permissions + adds creator as owner + creates system agent
  - `addWorkspaceMember(workspaceId, userId, roleId)` — adds member with active status
  - `cleanAllTables()` — truncates all 16 tables in dependency order
  - `seedPermissions()` — seeds 31 RAG permissions
- **Current test status** — 230 test cases total (static count from the test files; live passing count comes from `corepack pnpm test:api`):
  - Integration: agents (28), agents-default-conflict (2), auth (38), chat (7), conversations (11), dataset-file-chunks (2), dataset-file-questions (4), dataset-files (20), datasets (14), file-processing (3), health (5), members (6), permissions (13), roles (15), workspaces (7)
  - Unit: allowed-models (2), email-render (4), http-error (3), llamaindex-poll (6), pagination (12), redis (5), request-id (4), sanitize (6), url-slug (9), validate-env (4)
  - Skipped (0)
  - No Redis required for local test runs (queue module mocked via `tests/setup.js`)

## Adding a New Resource

1. Migration: `npm run migrate:make create_<resource>_table` — include `workspace_id` FK for tenant scoping
2. Model: `src/models/<resource>.js` — CRUD with workspace-scoped conditions
3. Controller: `src/controllers/<resource>.js` — Use `req.workspace.id` for scoping, Joi validation inline
4. Routes: `src/routes/<resource>.js` — Use `Router({ mergeParams: true })` for nested routes, apply `requirePermission()` guards
5. Wire up in `src/routes/index.js`
6. Add permissions to `database/seeds/01_permissions.js`
