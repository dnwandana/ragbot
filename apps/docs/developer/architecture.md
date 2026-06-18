---
title: Architecture
---

# Architecture

<p class="lede">A developer's-eye view of how RAGBot is built — the apps, the data model, and the retrieval pipeline that turns a document into a cited answer. For day-to-day product use, start with the <a href="/">Overview</a> instead.</p>

## The monorepo

RAGBot is a **pnpm + Turborepo** monorepo of four apps:

| App         | Stack                                                | Dev port | Role                                    |
| ----------- | ---------------------------------------------------- | -------- | --------------------------------------- |
| `apps/api`  | Express 5, PostgreSQL + pgvector, Knex, BullMQ/Redis | 3000     | REST API, auth, RAG pipeline            |
| `apps/app`  | Vue 3, Pinia, Ant Design Vue, Vite                   | 8080     | The single-page app users interact with |
| `apps/web`  | Astro 6                                              | 4321     | Static marketing site                   |
| `apps/docs` | VitePress                                            | 4173     | This documentation site                 |

The browser app talks to the API at `/api`; auth flows over secure, httpOnly cookies with automatic background refresh.

## Multi-tenancy

Everything is scoped to a **workspace**, the tenant boundary. A single shared PostgreSQL database holds all tenants; isolation is enforced **at the database level** through `workspace_id` columns and composite foreign keys, so one workspace can never reference another's rows. Almost every endpoint lives under `/api/workspaces/:workspace_id/...`.

## Roles & permissions (RBAC)

Each workspace has four built-in roles — **owner, admin, editor, viewer** — plus optional custom roles. Access is checked against **31 fine-grained permissions** across eight resources (workspace, role, member, audit, dataset, file, agent, conversation). The API resolves a caller's permissions for the workspace on each request and guards every route with a `requirePermission(...)` check.

## Data model

Eighteen tables, with the workspace as the root of the tree:

```
workspaces (tenant root)
  ├── roles → role_permissions → permissions (31, global)
  ├── workspace_members (role, soft-deleted, pending invites)
  ├── datasets → dataset_files → dataset_file_chunks  (vector(1536) + HNSW index)
  │                            → dataset_file_questions
  ├── agents (system prompt + model config; one protected system agent)
  ├── conversations → conversation_datasets (which datasets a chat searches)
  │                 → conversation_messages → conversation_message_citations → chunks
  └── audit_logs (append-only)

users (global) ── email_tokens, refresh_tokens
```

Note that **conversations**, not agents, link to datasets (`conversation_datasets`) — which is why you choose sources per chat.

## The RAG pipeline

Turning a document into something answerable happens asynchronously:

1. **Ingest** — an uploaded file is parsed to markdown (LlamaIndex); a scraped URL is fetched to markdown (Firecrawl).
2. **Queue** — a background job is enqueued (BullMQ on Redis). The job carries only IDs; no document content is stored in the queue, so jobs are idempotent and safe to retry.
3. **Process** — a worker splits the markdown into overlapping **chunks** (LangChain), embeds each chunk (OpenRouter), stores them as `vector(1536)` rows, generates a handful of exploration questions, and marks the file **Indexed**. On repeated failure it's marked **Failed**.
4. **Retrieve** — at chat time the user's question is embedded and matched against chunks with a cosine-similarity search (`search_chunks()` SQL function over a pgvector HNSW index). The top passages are injected into the agent's prompt.
5. **Answer** — the API runs a ReAct (reason–act–observe) loop and streams the answer back over Server-Sent Events, emitting `token`, `thought`, `observation`, `citation`, and `done` events. Each citation is persisted and linked back to its source chunk.

That last link — citation → chunk → file — is what powers the clickable sources in every answer.

## Frontend shape

The Vue app is layered: `api/` (a small fetch client) → `stores/` (Pinia state) → `composables/` (UI and form logic) → `views/` + `components/`. The HTTP client handles 401s by transparently refreshing the session once and replaying the request. Chat uses a raw `fetch` SSE stream (after a token-refresh probe) to render answers as they arrive.

See [Running locally](/developer/running-locally) to bring it all up on your machine and [Deployment](/developer/deployment) to ship it.
