# CLAUDE.md

Monorepo root guidance. Each app has its own detailed `CLAUDE.md` — this file covers workspace-level concerns only.

## Workspace

- **Package manager**: pnpm with Corepack (`corepack pnpm <command>`)
- **Build orchestration**: Turborepo (`turbo.json`)
- **Packages**: `apps/api` (Express), `apps/app` (Vue 3), `apps/web` (Astro static marketing site), `apps/docs` (VitePress documentation site)

## Root commands

```bash
corepack pnpm dev           # Start all apps (nodemon + Vite + apps/web Astro)
corepack pnpm dev:api       # API only  (port 3000)
corepack pnpm dev:app       # App only  (port 8080)
corepack pnpm dev:web       # Web only  (port 4321, Astro)
corepack pnpm dev:docs      # Docs only (port 4173, VitePress)
corepack pnpm build         # Build all (api, app, web, docs)
corepack pnpm lint          # Lint all
corepack pnpm format        # Format all (Prettier)
corepack pnpm build:web     # Web only  (Astro static build)
corepack pnpm build:docs    # Docs only (VitePress static build)
corepack pnpm test          # Test both (API only has tests currently)
corepack pnpm test:api      # Vitest + Supertest against real PostgreSQL
```

## Key architectural facts

- **Auth cookies**: `access_token` and `refresh_token` — httpOnly, Secure, SameSite=Strict cookies set by the server
- **Sessions & instant revocation**: each access token carries a `sid` claim bound to its `refresh_tokens` session row; `requireAccessToken` checks a Redis denylist (`src/utils/session-denylist.js`, fail-open) so logout, password change/reset, account delete, and per-session revoke kill live access tokens within one token TTL. Sessions are listable/revocable via `/api/auth/sessions`
- **Multi-tenancy**: Shared database, tenant isolation via `workspace_id` columns with composite foreign keys enforcing isolation at the DB level
- **RBAC**: `requirePermission(name)` middleware, permissions resolved on `req.permissions`. 31 permissions across 8 resources (workspace, role, member, audit, dataset, file, agent, conversation)
- **Request context**: `req.id` (request ID), `req.user` (from JWT). `req.workspace` and `req.permissions` are set by `resolveWorkspace` (`src/middlewares/resolve-workspace.js`), mounted via `router.use("/:workspace_id", resolveWorkspace)` in `routes/workspaces.js` — it loads the workspace and resolves the caller's permissions for RBAC
- **Error handling**: Controllers throw `HttpError(status, msg)`, caught by centralized `errorHandler`
- **Env validation**: API fails fast at startup if required vars are missing (expected behavior). The authoritative schema is `src/utils/validate-env.js` — 38 validated env vars (16 always required, plus `IPGEOLOCATION_API_KEY` required only when `IP_GEOLOCATION_ENABLED=true`; the rest have defaults), including `REDIS_URL`, scheme `redis://` or `rediss://`, covering OpenRouter, Brevo, S3/R2, LlamaIndex, Firecrawl, Redis, and IP geolocation
- **Async processing**: BullMQ job queue backed by Redis — dataset file processing (upload, scrape, reprocess) runs in an inline worker started alongside Express. A dedicated youtube-processing queue/worker resolves YouTube transcripts (manual captions via yt-dlp, else audio + OpenRouter Whisper) and reuses the shared runProcessingPipeline; YouTube files are marked by metadata.source_type === "youtube".

## Current implementation state

### API (`apps/api`)

**Wired and working:**

- Authentication — email-based signup with verification, signin (email + password), refresh, logout, me, forgot/reset password, resend verification. Brevo sends inline HTML emails via `sendTransacEmail`
- Session management — list/revoke active sessions (`/api/auth/sessions`) with device/IP/optional-geo metadata, plus instant access-token revocation via a Redis denylist (kills tokens on logout, password change/reset, and account delete). Optional IP→location lookup (`ip-geolocation.js`, off by default)
- Permissions (read-only reference endpoint)
- Health check (database connectivity, request ID)
- Roles CRUD (workspace-scoped)
- Full middleware stack (helmet, CORS, rate limiting, request ID, cookie parser, error handling)
- Database schema — 10 migrations, 18 tables, pgvector HNSW index, `search_chunks()` SQL function
- Workspace CRUD + RBAC + member management (F3)
- Datasets + file upload (LlamaIndex) + URL scraping (Firecrawl) + BullMQ processing pipeline (F4) + YouTube video import (yt-dlp captions / Whisper transcription)
- Agent management — CRUD with system agent protection (F5)
- Conversation CRUD + dataset linking + dataset shortcut endpoint (F6)
- Chat with ReAct loop + SSE streaming (F7) — RAG search, message persistence, citations
- Audit logging — workspace-scoped read endpoint plus append-only event writes via `utils/audit.js` (`logAuditEvent`), backed by `controllers/audit-logs.js`, `routes/audit-logs.js`, and `models/audit-logs.js`

### Frontend (`apps/app`)

**Wired and working:**

- Auth views (Login, Signup, VerifyEmail, ForgotPassword, ResetPassword)
- Workspaces views (WorkspacesListView, WorkspaceFormModal) + store/composable/API module
- Workspace settings views (general, members, roles) under `views/settings/` (flat paths `…/settings`, `…/members`, `…/roles` under `WorkspaceSettingsLayout.vue`); user account settings at `/settings` (`AccountSettingsView.vue`) composing `components/settings/ProfileSection.vue` + `SecuritySection.vue`
- Invitations view (MyInvitationsView) — partial: the sidebar pending-count badge was removed and `fetchMyInvitations` is a no-op stub (backend not yet wired), so the view currently renders empty
- Onboarding flow (OnboardingView + step wizard under `views/onboarding/steps/`)
- AppLayout, AppSidebar, AppUserMenu, RoleEditor, InviteFormModal, MembersTable, InvitationsTable
- Auth, roles, invitations, members, permissions, workspaces stores and composables
- HTTP client with automatic token refresh and 401 retry queue
- Vue Router with auth guards
- Agent views (AgentsListView, AgentFormDrawer), store, composable, and API module (F5)
- Dataset views (DatasetsListView, DatasetDetailView) + datasets/datasetFiles stores, composables, and API modules (F4)
- Conversation views (ConversationsListView), store, composable, and API module (F6)
- Chat view (ChatView) with SSE streaming, chat store, composable, and API module (F7)
- Audit-logs view (AuditLogsView) with store, composable, and API module
- Active-sessions management in Settings → Account — list signed-in devices and revoke individually or all-others (sessions store, `useSessions` composable, and API module)

### Web (`apps/web`)

**Wired and working:**

- Astro 6 static marketing site — public landing page (`/`) and 404 page
- `BaseLayout` with SEO meta (canonical, Open Graph, Twitter), `@astrojs/sitemap`, prerendered `robots.txt`
- Anti-flash dark-mode toggle (CSS-driven icon swap), scroll-reveal, animated hero chat demo (`public/scripts/app.js`)
- CTAs deep-link to `${PUBLIC_APP_URL}/signup`
- Nav and footer link to the docs site via `${PUBLIC_DOCS_URL}/` (build-time-validated public env var)
- Runs as its own `web` container from `apps/web/Dockerfile` in **both** stacks. Production: no published ports, reverse-proxied at `${DOMAIN}` by the nginx edge. Local: published on host port 4321 via `docker-compose.local.yml`

### Tests

Static test cases across 37 files (live passing count via `corepack pnpm test:api`). Integration: agents, agents-default-conflict, auth, chat, conversations, dataset-file-chunks, dataset-file-questions, dataset-questions, dataset-files, datasets, file-processing, health, members, permissions, roles, workspaces. Unit: allowed-models, consume-stream, email-render, file-processing-worker, http-error, ip-geolocation, llamaindex-poll, pagination, redis, request-id, sanitize, session-denylist, ssrf, test-users-seed, url-slug, validate-env. Session management (in `tests/`): sessions, session-revocation, jwt-sid, refresh-tokens-model.
**No Redis required locally:** queue module mocked via `tests/setup.js`

### Database schema

18 tables across 10 migrations. Key entity tree:

```
workspaces (tenant root)
  +-- roles → role_permissions → permissions (global, 31 entries)
  +-- workspace_members (with role, soft delete)
  +-- datasets → dataset_files → dataset_file_chunks (vector(1536) + HNSW index)
                              → dataset_file_questions
  +-- agents (system prompt + model config)
  +-- conversations → conversation_datasets (join to datasets)
                    → conversation_messages → conversation_message_citations → dataset_file_chunks
  +-- audit_logs (immutable, append-only)

users (global)
  +-- email_tokens
  +-- refresh_tokens
```

5 custom ENUM types: `membership_status`, `file_processing_status`, `message_role`, `audit_entity_type`, `audit_action`
2 extensions: `pgcrypto` (UUID generation), `vector` (pgvector embeddings)
SQL functions: `trigger_set_updated_at()` (9 tables), `search_chunks()` (cosine similarity search)

## App-specific details

See [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md), [`apps/app/CLAUDE.md`](apps/app/CLAUDE.md), [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md), and [`apps/docs/CLAUDE.md`](apps/docs/CLAUDE.md).

## Docker deployment

Two compose files. Production runs **five** containers (nginx edge + `web` + `app` + `api` + `docs`); local runs **four** (`web` + `app` + `api` + `docs`, no edge). PostgreSQL is always external.

### Production (`docker-compose.yml`)

```bash
docker compose build          # build all images
docker compose up -d          # start detached
docker compose logs -f        # tail logs
docker compose ps             # check status
```

- **Name-based virtual hosts** — one nginx edge container (built from `nginx/Dockerfile`) is a pure reverse proxy for four hostnames, each backed by its own container:
  - `${DOMAIN}` → proxies to the `web` container (Astro static site, `apps/web/Dockerfile`)
  - `app.${DOMAIN}` → proxies to the `app` container (Vue SPA, `apps/app/Dockerfile`)
  - `api.${DOMAIN}` → proxies to the `api` container (`http://api:3000`)
  - `docs.${DOMAIN}` → proxies to the `docs` container (VitePress static site, `apps/docs/Dockerfile`)
- **The edge builds nothing** — it only removes the stock `default.conf` so the mounted per-vhost templates are the only servers. Each app builds and serves its own static content; the edge owns TLS + routing only. **Header ownership:** HSTS is set by the edge; `nosniff`/`X-Frame-Options` by each app's own `nginx.conf`.
- nginx on ports 80 + 443; `:80` 301-redirects all hosts to HTTPS
- Config is templated and split per vhost: `nginx/templates/{web,app,api,docs}.conf.template` (each self-contained — its own `:80` redirect + `:443` server) use `${DOMAIN}`, rendered at container start via nginx's envsubst (the whole `nginx/templates/` dir mounts into `/etc/nginx/templates/`). The stock `default.conf` is removed in the image so only these vhosts are served. Set `DOMAIN` in `.env`.
- TLS via `certs/` (gitignored, mounted read-only) — a single cert covering **both** the apex and wildcard (`-d example.com -d *.example.com`), named `${DOMAIN}.fullchain.pem` / `${DOMAIN}.privkey.pem`
- **API uses clean URLs** (`api.${DOMAIN}/*`): nginx re-adds the `/api` prefix upstream and rewrites `Set-Cookie` paths (`/api/auth → /auth`, `/api → /`) via `proxy_cookie_path`, so the Express app and its cookie code are unchanged
- Frontend↔API is **cross-origin same-site**: `SameSite=Strict` cookies still flow; CORS is owned by Express (`CORS_ALLOWED_ORIGINS=https://app.${DOMAIN}`), not nginx
- Env from `.env`

### Local (`docker-compose.local.yml`)

```bash
docker compose -f docker-compose.local.yml up --build -d
docker compose -f docker-compose.local.yml logs -f
docker compose -f docker-compose.local.yml down
```

- Four services: `web` (Astro marketing site, `apps/web/Dockerfile`, `http://localhost:4321`), `docs` (VitePress docs, `apps/docs/Dockerfile`, `http://localhost:4173`), `app` (Vue SPA on port 80, proxies `/api`), `api` (Express, no published port)
- nginx on port 80 (app), 4321 (web), and 4173 (docs), no TLS
- Uses `nginx/local.conf` (HTTP-only)
- Env from `.env.local` (copy from `.env.example`; set `NODE_ENV=development`, `JWT_ISSUER/AUDIENCE=http://localhost`, `CORS_ALLOWED_ORIGINS=http://localhost`)
- `NODE_ENV=development` is required locally — the API sets `Secure` cookies only in production, which browsers reject over plain HTTP

### Common facts

- `app` container: nginx serves Vue static files + proxies `/api` and `/health` to the `api` container
- `api` container: Express.js, no host port published, only reachable as `http://api:3000` inside Docker network
- `redis`: external service — connect via `REDIS_URL` (`redis://` for plain, `rediss://` for TLS)
- Migrations do **not** run automatically — run manually: `docker compose [-f docker-compose.local.yml] run --rm api sh -c "node_modules/.bin/knex migrate:latest"`
