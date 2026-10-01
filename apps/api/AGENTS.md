# CLAUDE.md

RAGBot API. Multi-tenant Express REST API with PostgreSQL + pgvector, JWT auth, RBAC, and a RAG pipeline. ES modules, Node 24 (`.nvmrc`).

## Commands

```bash
npm run dev | start | test | test:watch | test:coverage
npm run lint | lint:fix | format | format:fix
npm run migrate | migrate:make <n> | migrate:rollback | seed
```

No pre-commit hooks. Run `npm run lint:fix && npm run format:fix` before you commit.

## Layout

- `src/models/` Knex queries only, no business logic. Named exports.
- `src/controllers/` business logic and inline Joi validation. Imported as a namespace.
- `src/routes/` route definitions, aggregated in `routes/index.js`. Nested routers use `Router({ mergeParams: true })`.
- `src/middlewares/`, `src/services/` (external APIs), `src/queues/` + `src/workers/` (BullMQ), `src/utils/`.
- `src/app.js` builds the Express app without `listen()`. `src/index.js` validates env, imports the app, starts the server and the workers. Supertest imports `app.js` directly.
- `openapi.json` is the full REST reference. Do not add endpoint tables here.

## Rules that the code does not make obvious

- **Middleware order** in `src/app.js`: requestId → helmet/cors → body parsers (100kb) → hpp → cookie-parser → `/health` → generalLimiter → loggers → routes → notFoundHandler → errorHandler (last). `trust proxy` is `1`.
- **Request context**: `req.id`, `req.user = { id }`, `req.sessionId`, and on workspace routes `req.workspace` + `req.permissions` (set by `resolveWorkspace`).
- **Errors**: throw `HttpError(status, message)`. Do not log in controllers. `errorHandler` is the only logging point.
- **Responses**: always `apiResponse({ message, data, pagination })`. `data` is the resource, or `null` on delete.
- **Sessions**: `POST /auth/refresh` rotates the token hash in place, so `sid` stays stable. Every revoke path calls `denySession(sid)`. The denylist fails open and its TTL derives from `ACCESS_TOKEN_EXPIRES_IN`.
- **Tenancy**: composite FKs `(id, workspace_id)` and partial unique indexes `WHERE deleted_at IS NULL`. Soft delete on 7 tables.
- **Folders**: `dataset_files.folder_id` NULL means the dataset root. Every folder write and file move takes `lockDatasetTree(trx, datasetId)` first, so the cycle and name checks see a stable tree.
- **Search input**: pass through `escapeIlike()` before an ILIKE query.
- **Chat loop**: `openRouterMessages` is append-only. `CHAT_MAX_ITERATIONS` (default 10) bounds the loop, and the last iteration offers no tools.
- **Citations**: one `createCitationRegistry()` numbers every chunk of a turn, so a tool search continues after the prompt excerpts. The API stores a row only for a `[n]` that the answer cites. `cited_text` is the full chunk, and `snippet_start_char`/`snippet_end_char` are UTF-16 offsets into it (null when no passage matched).
- **Message finders**: `findVisibleByConversationId` feeds the model (input + final_answer only). `findThreadByConversationId` feeds the GET endpoint (adds thought + observation rows). Do not widen the first one.
- **Sandbox client**: `executeCode()` never throws. Branch on `result.ok`. File `content` must be a Buffer. The sandbox has only `pandas`, `numpy`, `duckdb`, `pyarrow`, `openpyxl`, and no plotting library. Charts are Chart.js specs passed to `show_chart(spec)`. Keep the `execute_code` tool description in step with `sandbox/requirements.txt`.
- **Tabular files**: the worker runs the server-owned `services/tabular/profile-script.py` in the sandbox and stores the result in `metadata.profile` before the embed pipeline.
- **Env**: `utils/validate-env.js` is authoritative. `SANDBOX_URL` + `SANDBOX_API_TOKEN` are required only when `SANDBOX_ENABLED=true`. `IPGEOLOCATION_API_KEY` only when `IP_GEOLOCATION_ENABLED=true`. `CORS_ALLOWED_ORIGINS` is required in production. `RATE_LIMIT_AUTH_MAX` is capped at 50.
- **Audit**: call `logAuditEvent` from `utils/audit.js` on mutating workspace actions.

## Code style

- Prettier: no semicolons, 2 spaces, 100 columns. Oxlint. Kebab-case file names.
- `crypto.randomUUID()` from `node:crypto`, not the `uuid` package.
- Full JSDoc on every exported function (`@param`, `@returns`, `@throws`). Controller JSDoc starts with `METHOD /path — Short description`. No section divider comments.
- Functions with 3 or more semantic parameters take one destructured object. Express handlers are exempt.

## Testing

- Vitest with `globals: true`, `fileParallelism: false`, real PostgreSQL from `.env.test`. `tests/global-setup.js` migrates and seeds permissions.
- `tests/setup.js` mocks the queues, the session denylist, the sandbox client, and the rate limiters. No Redis or sandbox is needed locally.
- Helpers in `tests/helpers.js`: `createTestUser`, `getAuthHeaders`, `createTestWorkspace`, `addWorkspaceMember`, `cleanAllTables`, `seedPermissions`.
- Seed users: `alice@example.com`, `bob@example.com`, password `Password123!`.

## Adding a resource

1. `npm run migrate:make create_<resource>_table`, with a `workspace_id` FK.
2. Model in `src/models/`, controller in `src/controllers/` (scope by `req.workspace.id`), routes in `src/routes/` with `requirePermission()` guards.
3. Mount in `src/routes/index.js`. Add permissions to `database/seeds/01_permissions.js`.
