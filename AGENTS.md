# CLAUDE.md

Monorepo root guidance. Each app has its own `CLAUDE.md` (a symlink to `AGENTS.md`). This file covers workspace-level facts only.

## Workspace

- **Package manager**: pnpm with Corepack (`corepack pnpm <command>`). Build orchestration: Turborepo.
- **Apps**: `apps/api` (Express REST API), `apps/app` (Vue 3 SPA), `apps/web` (Astro marketing site), `apps/docs` (VitePress docs), `sandbox/` (Python code executor).

```bash
corepack pnpm dev            # all apps
corepack pnpm dev:api        # :3000   dev:app :8080   dev:web :4321   dev:docs :5173
corepack pnpm build | lint | format
corepack pnpm test:api       # Vitest + Supertest against a real PostgreSQL
```

## Key architectural facts

- **Auth**: `access_token` + `refresh_token` httpOnly cookies set by the server. Each access token carries a `sid` claim. A Redis session denylist (fail-open) revokes live tokens on logout, password change, and session revoke.
- **Multi-tenancy**: one shared database. `workspace_id` columns plus composite foreign keys isolate tenants at the DB level.
- **RBAC**: `requirePermission(name)` reads `req.permissions`, which `resolveWorkspace` sets on every `/api/workspaces/:workspace_id/*` route. 32 permissions across 8 resources.
- **Errors**: controllers throw `HttpError(status, msg)`. A central `errorHandler` logs and responds.
- **Env validation**: `apps/api/src/utils/validate-env.js` is the authoritative schema. The API exits at startup if a required var is missing.
- **Async work**: BullMQ on Redis. One worker processes dataset files (upload, scrape, reprocess), a second resolves YouTube transcripts. Tabular files (`csv`, `tsv`, `xls`, `xlsx`, `json`) skip LlamaIndex and get profiled in the sandbox.
- **Chat**: server-side ReAct loop with SSE streaming, two tools: `search_knowledge_base` and `execute_code` (sandbox).
- **Database**: 19 tables, 11 migrations, pgvector HNSW index, `search_chunks()` SQL function. Tree: `workspaces` → roles, members, datasets → files → chunks, agents, conversations → messages → citations, shares, audit_logs. Global: `users`, `email_tokens`, `refresh_tokens`.
- **Tests**: API only. Redis, sandbox, and rate limits are mocked in `apps/api/tests/setup.js`.

## Docker

- Production (`docker-compose.yml`): an nginx edge plus `web`, `app`, `api`, `docs`, `sandbox`. The edge owns TLS and routes `${DOMAIN}`, `app.`, `api.`, `docs.` to the matching container. Templates live in `nginx/templates/`. Certs in `certs/` must cover the apex and the wildcard.
- Local (`docker-compose.local.yml`): the same five containers, no edge, no TLS. Env from `.env.local` with `NODE_ENV=development`.
- The `sandbox` container runs untrusted code. It sits alone on `sandbox_net`, reachable only by `api`, with no internet route. It reads only `SANDBOX_API_TOKEN`, which must match the `api` value.
- PostgreSQL and Redis are always external. Migrations do not run automatically:

```bash
docker compose [-f docker-compose.local.yml] run --rm api sh -c "node_modules/.bin/knex migrate:latest"
```
