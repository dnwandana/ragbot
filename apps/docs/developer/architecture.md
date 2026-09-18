---
title: Architecture
---

# Architecture

<p class="lede">A developer's-eye view of how RAGBot is built — the apps, the data model, and the retrieval pipeline that turns a document into a cited answer. For day-to-day product use, start with the <a href="/">Overview</a> instead.</p>

## The monorepo

RAGBot is a **pnpm + Turborepo** monorepo of four apps, plus one Python service that lives outside `apps/`:

| App         | Stack                                                | Dev port | Role                                       |
| ----------- | ---------------------------------------------------- | -------- | ------------------------------------------ |
| `apps/api`  | Express 5, PostgreSQL + pgvector, Knex, BullMQ/Redis | 3000     | REST API, auth, RAG pipeline               |
| `apps/app`  | Vue 3, Pinia, Ant Design Vue, Vite                   | 8080     | The single-page app users interact with    |
| `apps/web`  | Astro 6                                              | 4321     | Static marketing site                      |
| `apps/docs` | VitePress                                            | 4173     | This documentation site                    |
| `sandbox/`  | Python 3.12, FastAPI, pandas                         | 8000     | Hardened executor for model-written Python |

The browser app talks to the API at `/api`; auth flows over secure, httpOnly cookies with automatic background refresh. The sandbox is reachable from the API only, never from the browser.

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

1. **Ingest** — an uploaded file is parsed to markdown (LlamaIndex); a scraped URL is fetched to markdown (Firecrawl); a YouTube link is resolved to its transcript. A **tabular** file (`csv`, `tsv`, `xls`, `xlsx`, `json`) skips LlamaIndex: the worker sends it to the sandbox, which profiles every sheet and column, and the profile is stored in the file's metadata and rendered to markdown.
2. **Queue** — a background job is enqueued (BullMQ on Redis). The job carries only IDs; no document content is stored in the queue, so jobs are idempotent and safe to retry.
3. **Process** — a worker splits the markdown into overlapping **chunks** (LangChain), embeds each chunk (OpenRouter), stores them as `vector(1536)` rows, generates a handful of exploration questions, and marks the file **Indexed**. On repeated failure it's marked **Failed**.
4. **Retrieve** — at chat time the user's question is embedded and matched against chunks with a cosine-similarity search (`search_chunks()` SQL function over a pgvector HNSW index). The top passages are injected into the agent's prompt.
5. **Answer** — the API runs a ReAct (reason–act–observe) loop and streams the answer back over Server-Sent Events, emitting `token`, `thought`, `observation`, `chart`, `citation`, and `done` events. Each citation is persisted and linked back to its source chunk.

That last link — citation → chunk → file — is what powers the clickable sources in every answer.

After the first answer in a conversation, the API asks a small **utility model** (`UTILITY_MODEL`, default `openai/gpt-5.4-nano`) for a title of at most eight words, built from the first user message and the assistant's reply. Title generation is best-effort: when the call fails or returns nothing, the conversation falls back to the first 100 characters of the user's message.

## The code interpreter

The ReAct loop offers the model its tools through a small **tool registry** (`services/chat-tools.js`). Each tool declares when it is available for a request, so the loop builds the tool list per request and dispatches calls without knowing tool internals. Two tools exist today:

- `search_knowledge_base` — the vector search above. Available when the conversation has at least one dataset.
- `execute_code` — runs model-written Python against the conversation's tabular files. Available only when the sandbox is enabled and the selected datasets hold at least one **Indexed** tabular file. The system prompt lists each such file with its id, its filename inside the sandbox, and its sheets and columns from the stored profile.

An `execute_code` call goes through four steps:

1. The API validates the requested file ids against the conversation's own tabular files, so the model can never reach a file outside its scope, and downloads them from object storage.
2. The API posts the code and the files to the sandbox at `POST /execute` with a bearer token. The sandbox writes them into a temporary directory, runs the code as an isolated child process (`python -I`, empty environment, its own process group), and returns capped `stdout` and `stderr`, an error code (`exception`, `timeout`, `memory`), and any chart specs the code produced through the injected `show_chart()` helper.
3. The loop persists the call as a `thought` row (title, code, file ids, filenames) and the result as an `observation` row (output, error, duration, charts) in `conversation_messages.content_json`, and emits one `chart` SSE event per chart.
4. The observation is appended to an append-only message array, so every later iteration sees all earlier tool calls and results. `CHAT_MAX_ITERATIONS` bounds the loop, and the last iteration gets no tools, which forces an answer.

The sandbox client never throws: a refused connection, a timeout, or a `429 busy` response becomes a structured observation the model can read and recover from. The conversation endpoint returns the full thread, including thought and observation rows, so a reloaded page rebuilds the code cells and charts exactly as the live stream showed them.

## Frontend shape

The Vue app is layered: `api/` (a small fetch client) → `stores/` (Pinia state) → `composables/` (UI and form logic) → `views/` + `components/`. The HTTP client handles 401s by transparently refreshing the session once and replaying the request. Chat uses a raw `fetch` SSE stream (after a token-refresh probe) to render answers as they arrive. `execute_code` thoughts and observations render as notebook-style cells in a `CodeRunCard`, and `chart` events render through Chart.js in a `ChartCard`; on reload, `chat-thread-grouping.js` folds the persisted thought and observation rows back into the answer they belong to.

See [Running locally](/developer/running-locally) to bring it all up on your machine and [Deployment](/developer/deployment) to ship it.
