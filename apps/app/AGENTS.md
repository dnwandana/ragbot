# CLAUDE.md

Vue 3 SPA frontend for the RAG Chatbot platform. Cookie-based auth with automatic token refresh, Ant Design Vue UI, Pinia state management. No TypeScript.

## Development Commands

```bash
npm run dev       # Start dev server (port 8080)
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Lint (oxlint then eslint sequentially via npm-run-all2)
npm run format    # Format code with Prettier
```

## Architecture Overview

Vue 3 SPA built with Vite, using a Pinia store + composables pattern for state management. Cookie-based authentication with automatic token refresh via a custom fetch-based HTTP client (httpOnly cookies set by the server).

### Tech Stack

- **Vue 3** with Composition API (no TypeScript)
- **Pinia** for state management (composition API setup syntax)
- **Ant Design Vue** for UI components
- **Native fetch API** for HTTP requests (custom client in `src/utils/http.js`)
- **Vue Router** with navigation guards

### Layered Architecture

```
├── src/
│   ├── api/          # API service layer (pure HTTP calls via custom client)
│   ├── stores/       # Pinia stores (business logic, state)
│   ├── composables/  # Composables (form handling, UI state, validation)
│   ├── views/        # Page components (lazy-loaded via dynamic imports)
│   ├── components/   # Reusable components (modals, tables, layout)
│   ├── router/       # Vue Router config with auth guards
│   └── utils/        # Utilities (HTTP client, localStorage wrappers)
```

## Route Table

| Path                                                     | Name              | Component                                                                           | Auth Meta       | Status  |
| -------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- | --------------- | ------- |
| `/login`                                                 | Login             | `views/auth/LoginView.vue`                                                          | `requiresGuest` | Working |
| `/signup`                                                | Signup            | `views/auth/SignupView.vue`                                                         | `requiresGuest` | Working |
| `/verify-email`                                          | VerifyEmail       | `views/auth/VerifyEmailView.vue`                                                    | none            | Working |
| `/forgot-password`                                       | ForgotPassword    | `views/auth/ForgotPasswordView.vue`                                                 | `requiresGuest` | Working |
| `/reset-password`                                        | ResetPassword     | `views/auth/ResetPasswordView.vue`                                                  | `requiresGuest` | Working |
| `/`                                                      | —                 | redirect to `/workspaces`                                                           | —               | Working |
| `/invitations`                                           | MyInvitations     | `views/invitations/MyInvitationsView.vue`                                           | `requiresAuth`  | Working |
| `/:pathMatch(.*)*`                                       | —                 | redirect to `/workspaces`                                                           | —               | Working |
| `/workspaces`                                            | WorkspacesList    | `views/workspaces/WorkspacesListView.vue`                                           | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/settings`                      | WorkspaceSettings | `views/settings/WorkspaceSettingsView.vue` (parent, redirects to `SettingsGeneral`) | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/settings/general`              | SettingsGeneral   | `views/settings/SettingsGeneral.vue`                                                | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/settings/members`              | SettingsMembers   | `views/settings/SettingsMembers.vue`                                                | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/settings/roles`                | SettingsRoles     | `views/settings/SettingsRoles.vue`                                                  | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/settings/profile`              | SettingsProfile   | `views/settings/SettingsProfile.vue`                                                | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/settings/account`              | SettingsAccount   | `views/settings/SettingsAccount.vue`                                                | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/datasets`                      | DatasetsList      | `views/datasets/DatasetsListView.vue`                                               | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/datasets/:datasetId`           | DatasetDetail     | `views/datasets/DatasetDetailView.vue`                                              | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/agents`                        | AgentsList        | `views/agents/AgentsListView.vue`                                                   | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/audit-logs`                    | AuditLogs         | `views/audit-logs/AuditLogsView.vue`                                                | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/conversations`                 | ConversationsList | `views/conversations/ConversationsListView.vue`                                     | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/conversations/new`             | NewChat           | `views/conversations/ChatView.vue`                                                  | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/conversations/:conversationId` | Chat              | `views/conversations/ChatView.vue`                                                  | `requiresAuth`  | Working |
| `/onboarding`                                            | Onboarding        | `views/onboarding/OnboardingView.vue`                                               | `requiresAuth`  | Working |

**Redirect routes**: `/` and `/:pathMatch(.*)*` both redirect to `/workspaces`. The `WorkspaceSettings` parent route redirects to its `SettingsGeneral` child.

**Navigation guard**: Unauthenticated users on `requiresAuth` routes redirect to `/login?redirect=`. Authenticated users on `requiresGuest` routes redirect to `/workspaces`. Auth store is initialized from localStorage on first navigation.

### View sub-modules (not directly routed)

- **Settings** (`views/settings/`): `WorkspaceSettingsView.vue` is the parent layout; `SettingsGeneral.vue`, `SettingsMembers.vue`, `SettingsRoles.vue`, `SettingsProfile.vue`, `SettingsAccount.vue` are its child route views.
- **Onboarding** (`views/onboarding/`): `OnboardingView.vue` orchestrates a step wizard whose steps live in `views/onboarding/steps/` — `OnboardingWelcome.vue`, `OnboardingWorkspace.vue`, `OnboardingSource.vue`, `OnboardingAgent.vue`, `OnboardingInvite.vue`, `OnboardingComplete.vue`. Supporting files: `agentTemplates.js` (exports `AGENT_TEMPLATES` presets) and `onboarding.css` (flow styles).

## HTTP Client (`src/utils/http.js`)

Custom fetch-based client (NOT Axios). Key behaviors:

- **Base URL**: `VITE_API_BASE_URL` env var (default: `http://localhost:3000/api`)
- **Timeout**: 10 seconds via `AbortController`
- **Auth cookies**: `credentials: 'include'` on all fetch calls, cookies set by server
- **Token refresh flow**: On 401 responses:
  1. Queues concurrent requests in `failedQueue` to prevent refresh race conditions
  2. Sends refresh request (cookie-based) to `POST /auth/refresh`
  3. On success: server rotates and sets new httpOnly cookies, replays queued requests
  4. On failure: clears auth data, redirects to `/login`
- **Excluded from refresh retry**: `/auth/signin`, `/auth/signup`, `/auth/refresh`
- **Error handling**: Non-401 errors trigger `message.error()` toast automatically
- **Exports**: `baseURL` (const), `HttpError` (class), `request` (object with `send`, `get`, `post`, `put`, `del`)

## Authentication Flow

1. **Signin**: `LoginView.vue` → `useAuth().handleSignin()` → `useAuthStore().signin()` → `api/auth.js signin()` → `POST /auth/signin` → server sets httpOnly cookies → stores user data in localStorage → redirects to `/workspaces`
2. **Token attachment**: Every API call includes `credentials: 'include'` so cookies are sent automatically
3. **Token refresh**: Automatic on 401 responses. Server rotates both tokens via httpOnly cookies.
4. **Logout**: `AppLayout.vue` → `authStore.logout()` → `POST /auth/logout` → clears localStorage → redirects to `/login`
5. **Route protection**: `router.beforeEach` guard calls `authStore.initAuth()` (verifies cookie via `GET /auth/me`) on first nav, then checks route meta flags

## Store Catalog

| Store                   | File                      | State                                                                                    | Key Actions                                                                                                 | Status  |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------- |
| `useAuthStore`          | `stores/auth.js`          | `user`, `loading`                                                                        | `initAuth`, `signup`, `signin`, `logout`                                                                    | Working |
| `useRolesStore`         | `stores/roles.js`         | `roles`, `currentRole`, `allPermissions`, `loading`                                      | `fetchRoles`, `fetchRoleById`, `createRole`, `updateRole`, `deleteRole`, `fetchAllPermissions`              | Working |
| `useMembersStore`       | `stores/members.js`       | `members`, `loading`                                                                     | `fetchMembers`, role update/remove                                                                          | Working |
| `useInvitationsStore`   | `stores/invitations.js`   | `myInvitations`, `loading`                                                               | `fetchMyInvitations`, `inviteToWorkspace`, `acceptInvitation`                                               | Working |
| `useAgentsStore`        | `stores/agents.js`        | `agents`, `loading`                                                                      | `fetchAgents`, `createAgent`, `updateAgent`, `deleteAgent`                                                  | Working |
| `useConversationsStore` | `stores/conversations.js` | `conversations`, `currentConversation`, `pagination`, `loading`                          | `fetchConversations`, `fetchConversation`, `createConversation`, `updateConversation`, `deleteConversation` | Working |
| `useChatStore`          | `stores/chat.js`          | `isStreaming`, `currentContent`, `thoughts`, `observations`, `pendingCitations`, `error` | `reset`                                                                                                     | Working |
| `useWorkspacesStore`    | `stores/workspaces.js`    | `workspaces`, `currentWorkspace`, `currentPermissions`, `loading`                        | `fetchWorkspaces`, `fetchWorkspaceById`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`            | Working |
| `useDatasetsStore`      | `stores/datasets.js`      | `datasets`, `currentDataset`, `pagination`, `loading` (computed from a counter ref)      | `fetchDatasets`, `fetchDataset`, `createDataset`, `updateDataset`, `deleteDataset`                          | Working |
| `useDatasetFilesStore`  | `stores/datasetFiles.js`  | `files`, `pagination`, `loading`                                                         | `fetchFiles`, `uploadFile`, `scrapeUrl`, `deleteFile`, `reprocessFile`, `renameFile`                        | Working |
| `useAuditLogsStore`     | `stores/auditLogs.js`     | `auditLogs`, `pagination`, `loading` (computed from a counter ref)                       | `fetchAuditLogs`                                                                                            | Working |

## Composable Catalog

| Composable         | File                              | Returns                                                                                                                                                                                                                                                                                                                       |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAuth`          | `composables/useAuth.js`          | `formState`, `error`, `loading`, `isAuthenticated`, `currentUser`, validation rules, action handlers                                                                                                                                                                                                                          |
| `useRoles`         | `composables/useRoles.js`         | `roles`, `currentRole`, `allPermissions`, `loading`, modal state, CRUD wrappers                                                                                                                                                                                                                                               |
| `useMembers`       | `composables/useMembers.js`       | `members`, `loading`, role-change modal state, fetch/change/remove handlers                                                                                                                                                                                                                                                   |
| `useInvitations`   | `composables/useInvitations.js`   | `myInvitations`, `loading`, `pendingCount`, invite modal state, invite/accept/decline                                                                                                                                                                                                                                         |
| `usePermissions`   | `composables/usePermissions.js`   | `can(permission)`, `canAny(permissions[])` — reads `currentPermissions` from `useWorkspacesStore`                                                                                                                                                                                                                             |
| `useAgents`        | `composables/useAgents.js`        | `agents`, `loading`, modal state, CRUD wrappers                                                                                                                                                                                                                                                                               |
| `useConversations` | `composables/useConversations.js` | `conversations`, `pagination`, `loading`, modal state, create/delete handlers                                                                                                                                                                                                                                                 |
| `useChat`          | `composables/useChat.js`          | `sendMessage`, `abort`. Probes `GET /auth/me` through the HTTP client before opening the raw-fetch SSE stream so a stale access token is refreshed first                                                                                                                                                                      |
| `useWorkspaces`    | `composables/useWorkspaces.js`    | `workspaces`, `currentWorkspace`, `loading`, `isModalVisible`, `editingWorkspace`, `isEditing`, `nameRules`, `openCreateModal`, `openEditModal`, `closeModal`, `handleSubmit`, `handleDelete`, `fetchWorkspaces`, `fetchWorkspaceById`                                                                                        |
| `useDatasets`      | `composables/useDatasets.js`      | `datasets`, `loading`, `pagination`, `viewMode` ("cards"\|"table" — affects items per page: 12 cards, 15 table rows), `query` (debounced 300 ms), `sortBy`, `sortOrder`, `page`, `setPage`, `isModalVisible`, `editingDataset`, `openCreateModal`, `openEditModal`, `closeModal`, `handleSubmit`, `handleDelete`, `nameRules` |
| `useDatasetFiles`  | `composables/useDatasetFiles.js`  | `files`, `filteredFiles` (filtered by `searchQuery` + `filterStatus`), `loading`, `searchQuery`, `filterStatus` ("all"\|"indexed"\|"parsing"\|"failed"), `fetchFiles`, `handleUpload`, `handleScrape`, `handleDelete`, `handleReprocess`, `handleRename`, `bulkDelete` (returns array of failed IDs)                                          |
| `useFileDetail`    | `composables/useFileDetail.js`    | `questions`, `chunks`, `chunksTotal`, `chunksPage`, `loadingQuestions`, `loadingChunks`, `errored` (first-load failure), `loadMoreError` (paginate failure — chunks preserved), `hasMoreChunks`, `loadFile(file)` (questions + first chunk page via `Promise.allSettled`; only for `completed` files), `loadMoreChunks(file)`, `reset()`. Guards stale responses via an `activeFileId` closure. |
| `useProfile`       | `composables/useProfile.js`       | `saving`, `saveProfile(data)` — updates user profile via `PUT /auth/profile`, refreshes auth store and localStorage                                                                                                                                                                                                           |
| `useAccount`       | `composables/useAccount.js`       | `changingPassword`, `deletingAccount`, `submitChangePassword(data)` — calls `PUT /auth/password`, `submitDeleteAccount()` — calls `DELETE /auth/profile`, clears auth, redirects to `/login`                                                                                                                                  |
| `useChatActions`   | `composables/useChatActions.js`   | `highlightedSource`, `copiedId`, `copyMessage(msg)`, `setHighlight(msgId, n)` — auto-clears after 2.8 s                                                                                                                                                                                                                       |
| `useMarkdown`      | `composables/useMarkdown.js`      | `render(content)` — chat markdown → DOMPurify-sanitized HTML; custom `[N]` citation extension renders `<span class="cite-ref">`. `renderChunk(content)` — document-chunk markdown via an isolated `Marked` instance (no citation extension, so literal `[1]` stays text), also DOMPurify-sanitized. External links get `target="_blank" rel="noopener noreferrer"`.                                                                                                                                    |
| `usePaginationUI`  | `composables/usePaginationUI.js`  | `SORT_OPTIONS` (also a named export const), `currentSortLabel`, `totalCount`, `paginationInfo` ("Showing X–Y of Z"), `pageNumbers` (smart ellipsis, shows all when ≤7 pages), `showPagination`                                                                                                                                |
| `useTheme`         | `composables/useTheme.js`         | `theme` ("light"\|"dark", loaded from `localStorage` on mount), `toggleTheme()` — persists to `localStorage` and sets `data-theme` attribute on `<html>`                                                                                                                                                                      |
| `useAuditLogs`     | `composables/useAuditLogs.js`     | `auditLogs`, `pagination`, `loading`, filter/page state, and fetch handlers wrapping `useAuditLogsStore` for the audit-logs view                                                                                                                                                                                              |

## Component Catalog

| Component              | File                                           | Purpose                                                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AppLayout`            | `components/AppLayout.vue`                     | Main shell: header, sidebar, content slot, footer                                                                                                                                                                                    |
| `AppSidebar`           | `components/AppSidebar.vue`                    | Workspace-scoped navigation menu — reads `:workspaceId` from the route, lists conversations, permission-gated links, theme toggle, invitations badge                                                                                 |
| `AppUserMenu`          | `components/AppUserMenu.vue`                   | User avatar dropdown menu — account links and logout                                                                                                                                                                                 |
| `AuthShell`            | `components/AuthShell.vue`                     | Centered page wrapper for auth views; slot renders each view's auth card                                                                                                                                                             |
| `InviteFormModal`      | `components/InviteFormModal.vue`               | Invite member modal — username/email toggle, role selection                                                                                                                                                                          |
| `InvitationsTable`     | `components/InvitationsTable.vue`              | Invitations table with status tags and revoke button                                                                                                                                                                                 |
| `MembersTable`         | `components/MembersTable.vue`                  | Members table with inline role-change dropdown and remove button                                                                                                                                                                     |
| `MarkdownMessage`      | `components/MarkdownMessage.vue`               | Renders sanitized markdown HTML via `useMarkdown`, with citation-click handling                                                                                                                                                      |
| `StrengthMeter`        | `components/StrengthMeter.vue`                 | Password strength meter bar                                                                                                                                                                                                          |
| `VariationsToggle`     | `components/VariationsToggle.vue`              | Segmented toggle for a list of `{ label, value }` options                                                                                                                                                                            |
| `WorkspaceFormModal`   | `components/WorkspaceFormModal.vue`            | Create/edit workspace modal                                                                                                                                                                                                          |
| `AgentFormDrawer`      | `components/agents/AgentFormDrawer.vue`        | Create/edit agent side drawer with model config                                                                                                                                                                                      |
| `AuditTable`           | `components/audit/AuditTable.vue`              | Audit-log list table with category icons, actor, and relative timestamps                                                                                                                                                             |
| `AuditFilterBar`       | `components/audit/AuditFilterBar.vue`          | Filter bar for audit logs (entity type, action, etc.)                                                                                                                                                                                |
| `AuditDetailDrawer`    | `components/audit/AuditDetailDrawer.vue`       | Side drawer showing full detail of a single audit-log entry                                                                                                                                                                          |
| `auditIcons.js`        | `components/audit/auditIcons.js`               | `auditIcon(key)` — maps audit entity/action keys to Ant Design icon components                                                                                                                                                       |
| `auditMaps.js`         | `components/audit/auditMaps.js`                | Pure display mappers (`category`, `entityIcon`, `verb`, `resourceLabel`, `timeOfDay`, `CATEGORIES`) translating the lean audit API shape into UI labels                                                                              |
| `ChatComposer`         | `components/chat/ChatComposer.vue`             | Chat input composer with send button and the floating dataset drawer                                                                                                                                                                 |
| `ChatMessage`          | `components/chat/ChatMessage.vue`              | Single chat message (user or assistant) with copy action and markdown rendering                                                                                                                                                      |
| `ChatThread`           | `components/chat/ChatThread.vue`               | Scrollable message thread with welcome/empty state and auto-scroll                                                                                                                                                                   |
| `ChatTopBar`           | `components/chat/ChatTopBar.vue`               | Chat header with inline-editable conversation title                                                                                                                                                                                  |
| `CiteRef`              | `components/chat/CiteRef.vue`                  | Inline `[N]` citation reference chip with hover state                                                                                                                                                                                |
| `DatasetDrawer`        | `components/chat/DatasetDrawer.vue`            | Dual-mode "Linked sources" drawer: interactive multi-select picker with realtime backend search + pinned selection (new conversations), or a read-only linked-dataset list with "Dataset unavailable" stubs (existing conversations) |
| `MarkdownRenderer`     | `components/chat/MarkdownRenderer.vue`         | Chat-specific markdown renderer (sanitized HTML + citation-click handling)                                                                                                                                                           |
| `SourceCitations`      | `components/chat/SourceCitations.vue`          | Source-citations toggle that opens the citations panel                                                                                                                                                                               |
| `AddSourceDrawer`      | `components/datasets/AddSourceDrawer.vue`      | Drawer to add dataset sources — file upload and URL scraping                                                                                                                                                                         |
| `FileDetailPanel`      | `components/datasets/FileDetailPanel.vue`      | Slide-in panel for a dataset file: metadata, status, auto-generated "Explore this document" questions (emits `ask`), and a paginated chunk preview with per-status sub-states (parsing / failed / empty / errored) and an inline "load more" retry.                                                                                                                                                                 |
| `OnboardingProgress`   | `components/onboarding/OnboardingProgress.vue` | Step-progress indicator for the onboarding flow                                                                                                                                                                                      |
| `OnboardingToast`      | `components/onboarding/OnboardingToast.vue`    | Inline success/error toast used within onboarding                                                                                                                                                                                    |
| `DeleteRoleModal`      | `components/roles/DeleteRoleModal.vue`         | Confirm deletion of a custom role, reassigning members to another role when needed                                                                                                                                                   |
| `RoleEditor`           | `components/roles/RoleEditor.vue`              | Full-page create/edit/view editor for a workspace role                                                                                                                                                                               |
| `RolePermissionMatrix` | `components/roles/RolePermissionMatrix.vue`    | Permissions grouped by resource as rows with per-permission toggles                                                                                                                                                                  |

## API Service Catalog

| Module        | File                   | Exports                                                                                                       |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| auth          | `api/auth.js`          | `signup`, `verifyEmail`, `resendVerification`, `signin`, `forgotPassword`, `resetPassword`, `getMe`, `logout` |
| roles         | `api/roles.js`         | `getRoles`, `getRole`, `createRole`, `updateRole`, `deleteRole`                                               |
| permissions   | `api/permissions.js`   | `getPermissions`                                                                                              |
| invitations   | `api/invitations.js`   | `acceptInvitation`                                                                                            |
| agents        | `api/agents.js`        | `listAgents`, `getAgent`, `createAgent`, `updateAgent`, `deleteAgent`                                         |
| datasetFiles  | `api/datasetFiles.js`  | `listFiles`, `uploadFile`, `scrapeUrl`, `deleteFile`, `reprocessFile`, `listFileQuestions`, `listFileChunks`, `updateFile` |
| conversations | `api/conversations.js` | `listConversations`, `getConversation`, `createConversation`, `updateConversation`, `deleteConversation`      |
| chat          | `api/chat.js`          | `sendMessage`                                                                                                 |
| account       | `api/account.js`       | `changePassword`                                                                                              |
| datasets      | `api/datasets.js`      | `listDatasets`, `getDataset`, `createDataset`, `updateDataset`, `deleteDataset`                               |
| members       | `api/members.js`       | `getMembers`, `inviteMember`, `changeMemberRole`, `removeMember`                                              |
| profile       | `api/profile.js`       | `updateProfile`, `deleteProfile`                                                                              |
| workspaces    | `api/workspaces.js`    | `getWorkspaces`, `getWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`                      |
| auditLogs     | `api/auditLogs.js`     | `listAuditLogs(workspaceId, params)`                                                                          |

## Utility Files

| File                         | Exports                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/http.js`              | `baseURL` (const), `HttpError` (class), `request` object (`send`, `get`, `post`, `put`, `del`)                                        |
| `utils/storage.js`           | `getUserData`, `setUserData`, `clearUserData`                                                                                         |
| `utils/time.js`              | `relativeTime(dateStr)` — formats a date string as relative time ("Just now", "Xm ago", etc.)                                         |
| `utils/files.js`             | `humanSize(bytes)`, `fileType(filename)`, `statusLabel(status)`, `statusChipClass(status)` — dataset-file display helpers             |
| `utils/permissionCatalog.js` | `PERMISSION_GROUPS`, `PERMISSION_META` (consts), `groupPermissions(permissions)` — groups/labels permissions by resource for role UIs |
| `utils/pagination.js`        | `totalItems(pagination, fallback)` — total item count from an API list response's `pagination` meta (reads `total_items`), falling back when the field/object is absent |
| `constants/models.js`        | `MODEL_CATALOG`, `MODEL_RECOMMENDATIONS`, `DEFAULT_MODEL_CONFIG` (consts), `findModel(value)`, `selectableModels(savedModel)` — agent model picker catalog, guide recommendations, default agent model config, and select-option helpers |

## Environment Configuration

- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:3000/api`)
- Copy `.env.example` to `.env` to configure

## Code Style

- **Linting**: Dual-linter setup with oxlint (fast) then eslint (comprehensive) via npm-run-all2
- **Formatting**: Prettier with semicolons disabled, double quotes, 100 char width
- **Import alias**: `@` maps to `src/` directory
- **JSDoc**: Full JSDoc blocks on every exported function with `@param {type} name - description` and `@returns {type}` tags. Use `@throws` where applicable. One-line JSDoc (`/** description */`) for constants. No section divider comments (`// ── Section ───`).
- **Destructured parameters**: Functions accepting 3 or more semantic parameters must use a destructured object parameter. Internal helpers with 1-2 params stay positional.
- **Tests**: Vitest (`corepack pnpm test`, jsdom env). Unit tests cover API wrappers (`api/*.test.js`) and composables (`composables/*.test.js`); component-render tests use `@vue/test-utils` (`components/**/*.test.js`).

## File Naming

- Views: `*View.vue` (e.g., `LoginView.vue`)
- Components: PascalCase (e.g., `AppLayout.vue`, `RoleEditor.vue`)
- Stores: camelCase with `use` prefix (e.g., `useAuthStore`)
- Composables: camelCase with `use` prefix (e.g., `useAuth`, `useRoles`)
- API modules: camelCase (e.g., `auth.js`, `invitations.js`)
