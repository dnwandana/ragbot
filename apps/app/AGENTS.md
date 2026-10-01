# CLAUDE.md

Vue 3 SPA for RAGBot. Composition API, no TypeScript. Pinia stores, Ant Design Vue, Vue Router with auth guards, Chart.js for `execute_code` charts.

## Commands

```bash
npm run dev       # :8080
npm run build | preview | lint | format
npm test          # Vitest, jsdom
```

## Layout

- `src/api/` HTTP wrappers only. `src/stores/` Pinia state and logic. `src/composables/` form and UI state. `src/views/` lazy-loaded pages. `src/components/` shared UI. `src/router/` routes and guards. `src/utils/` HTTP client, storage, time.
- `@` maps to `src/`.
- Routes live in `src/router/index.js`. Workspace pages sit under `/workspaces/:workspaceId/…`. Public share page: `/chat/:id` (`bare` meta). Account settings: `/settings`.
- Tests sit next to their subject (`*.test.js`).

## Rules that the code does not make obvious

- **HTTP client** (`utils/http.js`): native fetch, not Axios. 10 s timeout, `credentials: "include"`. On 401 all callers await one shared refresh promise, then replay once. Non-401 errors show a toast unless the call passes `{ silent: true }`.
- **Response shape**: stores read `res.data.data`. The client and `apiResponse` double-nest. `res.data` alone is a silent bug.
- **Auth**: the server sets httpOnly cookies. `router.beforeEach` calls `authStore.initAuth()` on the first navigation (verifies via `GET /auth/me`).
- **Store reset**: every non-auth store exposes `reset()`. `stores/reset.js` calls all of them on logout, so a second login never shows stale data.
- **Chat stream**: `useChat` probes `GET /auth/me` through the HTTP client before it opens the raw-fetch SSE stream, so a stale token refreshes first. `chart` SSE events go into `useChatStore().charts`.
- **Reloaded threads**: `views/conversations/chat-thread-grouping.js` folds `thought` and `observation` rows into their assistant message, so a reload renders the same code cells and charts as the live stream.
- **Markdown**: `useMarkdown().render()` sanitizes with DOMPurify and turns `[N]` into citation chips. `renderChunk()` renders document chunks without the citation extension.
- **Citations**: the Sources panel renders `CitationExcerpt`, which marks `cited_text.slice(snippet_start_char, snippet_end_char)` with `markPassage()`. Never build HTML strings from chunk text; `markPassage()` creates nodes after DOMPurify.
- **Time**: use `useFormattedTime` for absolute dates. It binds the signed-in user's saved timezone and falls back to UTC.
- **Permissions**: `usePermissions().can(name)` reads `currentPermissions` from the workspaces store.
- **Invitations**: `fetchMyInvitations` is a no-op stub. The backend list endpoint is not wired yet, so `/invitations` renders empty.
- **View tests**: the vue-router mock must spread `importOriginal()`, because views load the real router transitively.

## Environment

- `VITE_API_BASE_URL` (default `http://localhost:3000/api`).
- `VITE_WEB_URL` marketing site origin for the public share page (default `/`).

## Code style

- Prettier: no semicolons, double quotes, 100 columns. Oxlint then ESLint.
- Full JSDoc on every exported function. No section divider comments.
- Functions with 3 or more semantic parameters take one destructured object.
- Names: views `*View.vue`, components PascalCase, stores and composables `use*`, API modules camelCase.
