# CLAUDE.md

Monorepo root guidance. Each app has its own detailed `CLAUDE.md` — this file covers workspace-level concerns only.

## Workspace

- **Package manager**: pnpm with Corepack (`corepack pnpm <command>`)
- **Build orchestration**: Turborepo (`turbo.json`)
- **Packages**: `apps/api` (Express), `apps/app` (Vue 3)

## Root commands

```bash
corepack pnpm dev           # Start both apps (nodemon + Vite)
corepack pnpm dev:api       # API only  (port 3000)
corepack pnpm dev:app       # App only  (port 8080)
corepack pnpm build         # Build both
corepack pnpm lint          # Lint both
corepack pnpm format        # Format both (Prettier)
corepack pnpm test          # Test both (API only has tests currently)
corepack pnpm test:api      # Vitest + Supertest against real PostgreSQL
```

## Key architectural facts

- **Auth cookies**: `access_token` and `refresh_token` — httpOnly, Secure, SameSite=Strict cookies set by the server
- **Multi-tenancy**: Shared database, tenant isolation via `workspace_id` columns with composite foreign keys enforcing isolation at the DB level
- **RBAC**: `requirePermission(name)` middleware, permissions resolved on `req.permissions`. 30 permissions across 8 resources (workspace, role, member, audit, dataset, file, agent, conversation)
- **Request context**: `req.id` (request ID), `req.user` (from JWT), `req.permissions` (from RBAC). `req.workspace` planned but not yet implemented
- **Error handling**: Controllers throw `HttpError(status, msg)`, caught by centralized `errorHandler`
- **Env validation**: API fails fast at startup if required vars are missing (expected behavior). 16 service-level env vars required (OpenRouter, Brevo, S3/R2, LlamaIndex, Firecrawl)

## Current implementation state

### API (`apps/api`)

**Wired and working:**
- Authentication — email-based signup with verification, signin (email + password), refresh, logout, me, forgot/reset password, resend verification. Brevo sends inline HTML emails via `sendTransacEmail`
- Permissions (read-only reference endpoint)
- Health check (database connectivity, request ID)
- Roles CRUD (controller exists, routes need re-registration for workspace context)
- Full middleware stack (helmet, CORS, rate limiting, request ID, cookie parser, error handling)
- Database schema — 8 migrations, 15 tables, pgvector HNSW index, `search_chunks()` SQL function

**Planned but not wired:**
- Workspace CRUD + `resolveWorkspace` middleware (F3)
- Dataset + file upload + RAG processing pipeline (F4)
- Agent management (F5)
- Conversation CRUD + dataset linking (F6)
- Chat with ReAct loop + SSE streaming (F7)
- Audit logging middleware (schema exists, no middleware yet)

### Frontend (`apps/app`)

**Wired and working:**
- Auth views (Login, Signup, VerifyEmail, ForgotPassword, ResetPassword)
- Invitations view (MyInvitationsView)
- AppLayout, AppSidebar, RoleFormModal, InviteFormModal, MembersTable, InvitationsTable
- Auth, roles, invitations, members, permissions stores and composables
- HTTP client with automatic token refresh and 401 retry queue
- Vue Router with auth guards

**Referenced but deleted (router/stores point to non-existent files):**
- Org/project/todo views, stores, composables, and API modules were removed in the schema migration. These need to be replaced with workspace/dataset/agent/conversation equivalents when the corresponding API features are built.

### Tests

**Passing (27 tests):** health (5), http-error (3), pagination (9), request-id (4), sanitize (6)
**Rewritten for email-based auth:** auth.test.js (10 tests with Brevo mock, email-based signup/signin, verify-email, forgot-password, logout)
**Broken (need rewrite):** permissions.test.js (7 tests, imports removed helpers)

### Database schema

15 tables across 8 migrations. Key entity tree:

```
workspaces (tenant root)
  +-- roles → role_permissions → permissions (global, 30 entries)
  +-- workspace_members (with role, soft delete)
  +-- datasets → dataset_files → document_chunks (vector(1536) + HNSW index)
  +-- agents (system prompt + model config)
  +-- conversations → messages → message_citations → document_chunks
  +-- audit_logs (immutable, append-only)

users (global)
  +-- email_tokens
  +-- refresh_tokens
```

5 custom ENUM types: `membership_status`, `file_processing_status`, `message_role`, `audit_entity_type`, `audit_action`
2 extensions: `pgcrypto` (UUID generation), `vector` (pgvector embeddings)
SQL functions: `trigger_set_updated_at()` (9 tables), `search_chunks()` (cosine similarity search)

## App-specific details

See [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) and [`apps/app/CLAUDE.md`](apps/app/CLAUDE.md).

## Docker deployment

Two compose files — same two-container architecture, PostgreSQL always external.

### Production (`docker-compose.yml`)

```bash
docker compose build          # build both images
docker compose up -d          # start detached
docker compose logs -f        # tail logs
docker compose ps             # check status
```

- nginx on ports 80 + 443, TLS via `certs/` (gitignored, mounted read-only)
- Uses `nginx/default.conf` (HTTP→HTTPS redirect + TLS block)
- Env from `.env`

### Local (`docker-compose.local.yml`)

```bash
docker compose -f docker-compose.local.yml up --build -d
docker compose -f docker-compose.local.yml logs -f
docker compose -f docker-compose.local.yml down
```

- nginx on port 80 only, no TLS
- Uses `nginx/local.conf` (HTTP-only)
- Env from `.env.local` (copy from `.env.example`; set `NODE_ENV=development`, `JWT_ISSUER/AUDIENCE=http://localhost`, `CORS_ALLOWED_ORIGINS=http://localhost`)
- `NODE_ENV=development` is required locally — the API sets `Secure` cookies only in production, which browsers reject over plain HTTP

### Common facts

- `app` container: nginx serves Vue static files + proxies `/api` and `/health` to the `api` container
- `api` container: Express.js, no host port published, only reachable as `http://api:3000` inside Docker network
- Migrations do **not** run automatically — run manually: `docker compose [-f docker-compose.local.yml] run --rm api sh -c "node_modules/.bin/knex migrate:latest"`
