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

| Path                                                     | Name              | Component                                       | Auth Meta       | Status  |
| -------------------------------------------------------- | ----------------- | ----------------------------------------------- | --------------- | ------- |
| `/login`                                                 | Login             | `views/auth/LoginView.vue`                      | `requiresGuest` | Working |
| `/signup`                                                | Signup            | `views/auth/SignupView.vue`                     | `requiresGuest` | Working |
| `/verify-email`                                          | VerifyEmail       | `views/auth/VerifyEmailView.vue`                | none            | Working |
| `/forgot-password`                                       | ForgotPassword    | `views/auth/ForgotPasswordView.vue`             | `requiresGuest` | Working |
| `/reset-password`                                        | ResetPassword     | `views/auth/ResetPasswordView.vue`              | `requiresGuest` | Working |
| `/`                                                      | —                 | redirect to `/workspaces`                       | —               | Stale   |
| `/invitations`                                           | MyInvitations     | `views/invitations/MyInvitationsView.vue`       | `requiresAuth`  | Working |
| `/:pathMatch(.*)*`                                       | —                 | redirect to `/workspaces`                       | —               | Stale   |
| `/workspaces/:workspaceId/agents`                        | AgentsList        | `views/agents/AgentsListView.vue`               | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/conversations`                 | ConversationsList | `views/conversations/ConversationsListView.vue` | `requiresAuth`  | Working |
| `/workspaces/:workspaceId/conversations/:conversationId` | Chat              | `views/conversations/ChatView.vue`              | `requiresAuth`  | Working |

**Stale routes**: `/` and catch-all redirect to `/workspaces`.

**Navigation guard**: Unauthenticated users on `requiresAuth` routes redirect to `/login?redirect=`. Authenticated users on `requiresGuest` routes redirect to `/workspaces`. Auth store is initialized from localStorage on first navigation.

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

| Store                   | File                      | State                                                                                    | Key Actions                                                                                                           | Status                               |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `useAuthStore`          | `stores/auth.js`          | `user`, `loading`                                                                        | `initAuth`, `signup`, `signin`, `logout`                                                                              | Working                              |
| `useRolesStore`         | `stores/roles.js`         | `roles`, `currentRole`, `allPermissions`, `loading`                                      | `fetchRoles`, `fetchRoleById`, `createRole`, `updateRole`, `deleteRole`, `fetchAllPermissions`                        | Working                              |
| `useMembersStore`       | `stores/members.js`       | `members`, `loading`                                                                     | `fetchMembers`, role update/remove                                                                                    | Working                              |
| `useInvitationsStore`   | `stores/invitations.js`   | `myInvitations`, `loading`                                                               | `fetchMyInvitations`, `inviteToWorkspace`, `acceptInvitation`                                                         | Working                              |
| `useAgentsStore`        | `stores/agents.js`        | `agents`, `loading`                                                                      | `fetchAgents`, `createAgent`, `updateAgent`, `deleteAgent`                                                            | Working                              |
| `useConversationsStore` | `stores/conversations.js` | `conversations`, `currentConversation`, `pagination`, `loading`                          | `fetchConversations`, `fetchConversation`, `createConversation`, `updateConversation`, `deleteConversation`           | Working                              |
| `useChatStore`          | `stores/chat.js`          | `isStreaming`, `currentContent`, `thoughts`, `observations`, `pendingCitations`, `error` | `reset`                                                                                                               | Working                              |

## Composable Catalog

| Composable         | File                              | Returns                                                                                                             |
| ------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `useAuth`          | `composables/useAuth.js`          | `formState`, `error`, `loading`, `isAuthenticated`, `currentUser`, validation rules, action handlers                |
| `useRoles`         | `composables/useRoles.js`         | `roles`, `currentRole`, `allPermissions`, `loading`, modal state, CRUD wrappers                                     |
| `useMembers`       | `composables/useMembers.js`       | `members`, `loading`, role-change modal state, fetch/change/remove handlers                                         |
| `useInvitations`   | `composables/useInvitations.js`   | `myInvitations`, `loading`, `pendingCount`, invite modal state, invite/accept/decline                               |
| `usePermissions`   | `composables/usePermissions.js`   | `can(permission)`, `canAny(permissions[])` — reads `currentPermissions` from `useWorkspacesStore` |
| `useAgents`        | `composables/useAgents.js`        | `agents`, `loading`, modal state, CRUD wrappers                                                                     |
| `useConversations` | `composables/useConversations.js` | `conversations`, `pagination`, `loading`, modal state, create/delete handlers                                       |
| `useChat`          | `composables/useChat.js`          | `sendMessage`, `abort`. Probes `GET /auth/me` through the HTTP client before opening the raw-fetch SSE stream so a stale access token is refreshed first |

## Component Catalog

| Component          | File                              | Purpose                                                                |
| ------------------ | --------------------------------- | ---------------------------------------------------------------------- |
| `AppLayout`        | `components/AppLayout.vue`        | Main shell: header, sidebar, content slot, footer                      |
| `AppSidebar`       | `components/AppSidebar.vue`       | Context-aware navigation menu (currently org/project, needs workspace) |
| `RoleFormModal`    | `components/RoleFormModal.vue`    | Create/edit role modal with permissions grouped by resource            |
| `InviteFormModal`  | `components/InviteFormModal.vue`  | Invite member modal — username/email toggle, role selection            |
| `MembersTable`     | `components/MembersTable.vue`     | Members table with inline role-change dropdown and remove button       |
| `InvitationsTable` | `components/InvitationsTable.vue` | Invitations table with status tags and revoke button                   |
| `AgentFormDrawer`  | `components/agents/AgentFormDrawer.vue` | Create/edit agent side drawer with model config                   |

## API Service Catalog

| Module        | File                   | Exports                                                                                                       |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| auth          | `api/auth.js`          | `signup`, `verifyEmail`, `resendVerification`, `signin`, `forgotPassword`, `resetPassword`, `getMe`, `logout` |
| roles         | `api/roles.js`         | `getRoles`, `getRole`, `createRole`, `updateRole`, `deleteRole`                                               |
| permissions   | `api/permissions.js`   | `getPermissions`                                                                                              |
| invitations   | `api/invitations.js`   | `acceptInvitation`                                                                                            |
| agents        | `api/agents.js`        | `listAgents`, `getAgent`, `createAgent`, `updateAgent`, `deleteAgent`                                         |
| datasetFiles  | `api/datasetFiles.js`  | `listFiles`, `uploadFile`, `scrapeUrl`, `deleteFile`, `reprocessFile`                                         |
| conversations | `api/conversations.js` | `listConversations`, `getConversation`, `createConversation`, `updateConversation`, `deleteConversation`      |
| chat          | `api/chat.js`          | `sendMessage`                                                                                                 |

## Utility Files

| File               | Exports                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `utils/http.js`    | `baseURL` (const), `HttpError` (class), `request` object (`send`, `get`, `post`, `put`, `del`) |
| `utils/storage.js` | `getUserData`, `setUserData`, `clearUserData`                                                  |
| `utils/time.js`    | `relativeTime(dateStr)` — formats a date string as relative time ("Just now", "Xm ago", etc.) |

## Environment Configuration

- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:3000/api`)
- Copy `.env.example` to `.env` to configure

## Code Style

- **Linting**: Dual-linter setup with oxlint (fast) then eslint (comprehensive) via npm-run-all2
- **Formatting**: Prettier with semicolons disabled, double quotes, 100 char width
- **Import alias**: `@` maps to `src/` directory
- **JSDoc**: Full JSDoc blocks on every exported function with `@param {type} name - description` and `@returns {type}` tags. Use `@throws` where applicable. One-line JSDoc (`/** description */`) for constants. No section divider comments (`// ── Section ───`).
- **Destructured parameters**: Functions accepting 3 or more semantic parameters must use a destructured object parameter. Internal helpers with 1-2 params stay positional.
- **No tests** currently exist for the frontend app

## File Naming

- Views: `*View.vue` (e.g., `LoginView.vue`)
- Components: PascalCase (e.g., `AppLayout.vue`, `RoleFormModal.vue`)
- Stores: camelCase with `use` prefix (e.g., `useAuthStore`)
- Composables: camelCase with `use` prefix (e.g., `useAuth`, `useRoles`)
- API modules: camelCase (e.g., `auth.js`, `invitations.js`)
