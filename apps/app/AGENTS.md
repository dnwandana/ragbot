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

| Path               | Name           | Component                                 | Auth Meta       | Status  |
| ------------------ | -------------- | ----------------------------------------- | --------------- | ------- |
| `/login`           | Login          | `views/auth/LoginView.vue`                | `requiresGuest` | Working |
| `/signup`          | Signup         | `views/auth/SignupView.vue`               | `requiresGuest` | Working |
| `/`                | —              | redirect to `/orgs`                       | —               | Stale   |
| `/orgs`            | OrgsList       | `views/orgs/OrgsListView.vue`             | `requiresAuth`  | Deleted |
| `/orgs/:orgId`     | ProjectsList   | `views/projects/ProjectsListView.vue`     | `requiresAuth`  | Deleted |
| `/invitations`     | MyInvitations  | `views/invitations/MyInvitationsView.vue` | `requiresAuth`  | Working |
| `/:pathMatch(.*)*` | —              | redirect to `/orgs`                       | —               | Stale   |

**Stale routes**: Router still references deleted org/project/todo views. These need to be replaced with workspace/dataset/agent/conversation routes when the corresponding API features are built.

**Navigation guard**: Unauthenticated users on `requiresAuth` routes redirect to `/login?redirect=`. Authenticated users on `requiresGuest` routes redirect to `/orgs` (stale — should redirect to workspace list eventually). Auth store is initialized from localStorage on first navigation.

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

1. **Signin**: `LoginView.vue` → `useAuth().handleSignin()` → `useAuthStore().signin()` → `api/auth.js signin()` → `POST /auth/signin` → server sets httpOnly cookies → stores user data in localStorage → redirects to `/orgs`
2. **Token attachment**: Every API call includes `credentials: 'include'` so cookies are sent automatically
3. **Token refresh**: Automatic on 401 responses. Server rotates both tokens via httpOnly cookies.
4. **Logout**: `AppLayout.vue` → `authStore.logout()` → `POST /auth/logout` → clears localStorage → redirects to `/login`
5. **Route protection**: `router.beforeEach` guard calls `authStore.initAuth()` (verifies cookie via `GET /auth/me`) on first nav, then checks route meta flags

## Store Catalog

| Store                 | File                    | State                                          | Key Actions                                        | Status  |
| --------------------- | ----------------------- | ---------------------------------------------- | -------------------------------------------------- | ------- |
| `useAuthStore`        | `stores/auth.js`        | `user`, `loading`                              | `initAuth`, `signup`, `signin`, `logout`           | Working |
| `useRolesStore`       | `stores/roles.js`       | `roles`, `currentRole`, `allPermissions`, `userPermissions`, `loading` | `fetchRoles`, `fetchRoleById`, `createRole`, `updateRole`, `deleteRole`, `fetchAllPermissions`, `loadUserPermissions` | Working (references org API paths) |
| `useMembersStore`     | `stores/members.js`     | `orgMembers`, `projectMembers`, `loading`      | `fetchOrgMembers`, `fetchProjectMembers`, role update/remove | Working (references org/project API) |
| `useInvitationsStore` | `stores/invitations.js` | `orgInvitations`, `myInvitations`, `loading`   | `fetchOrgInvitations`, `fetchMyInvitations`, invite/accept/decline/revoke | Working |

**Note**: Roles, members, and invitations stores still reference org/project API paths. They need to be updated to workspace API paths when F3 (workspaces + RBAC) is implemented.

## Composable Catalog

| Composable       | File                            | Returns                                                                                                    |
| ---------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `useAuth`        | `composables/useAuth.js`        | `formState`, `error`, `loading`, `isAuthenticated`, `currentUser`, validation rules, action handlers       |
| `useRoles`       | `composables/useRoles.js`       | `roles`, `currentRole`, `allPermissions`, `loading`, modal state, CRUD wrappers                            |
| `useMembers`     | `composables/useMembers.js`     | `orgMembers`, `projectMembers`, `loading`, role-change modal state, fetch/change/remove handlers           |
| `useInvitations` | `composables/useInvitations.js` | `orgInvitations`, `myInvitations`, `loading`, `pendingCount`, invite modal state, invite/accept/decline    |
| `usePermissions` | `composables/usePermissions.js` | `userPermissions`, `can(permission)`, `canAny(permissions[])`, `loadPermissions(orgId, userId)`, `clearPermissions` |

## Component Catalog

| Component          | File                              | Purpose                                                                 |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------- |
| `AppLayout`        | `components/AppLayout.vue`        | Main shell: header, sidebar, content slot, footer                       |
| `AppSidebar`       | `components/AppSidebar.vue`       | Context-aware navigation menu (currently org/project, needs workspace)  |
| `RoleFormModal`    | `components/RoleFormModal.vue`    | Create/edit role modal with permissions grouped by resource             |
| `InviteFormModal`  | `components/InviteFormModal.vue`  | Invite member modal — username/email toggle, role selection             |
| `MembersTable`     | `components/MembersTable.vue`     | Members table with inline role-change dropdown and remove button        |
| `InvitationsTable` | `components/InvitationsTable.vue` | Invitations table with status tags and revoke button                    |

## API Service Catalog

| Module      | File                 | Exports                                                       |
| ----------- | -------------------- | ------------------------------------------------------------- |
| auth        | `api/auth.js`        | `signup`, `signin`, `getMe`, `refreshToken`, `logout`         |
| roles       | `api/roles.js`       | `getRoles`, `getRole`, `createRole`, `updateRole`, `deleteRole` |
| permissions | `api/permissions.js` | `getPermissions`                                              |
| invitations | `api/invitations.js` | `inviteToOrg`, `inviteToProject`, list/accept/decline/revoke  |

## Utility Files

| File               | Exports                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `utils/http.js`    | `baseURL` (const), `HttpError` (class), `request` object (`send`, `get`, `post`, `put`, `del`) |
| `utils/storage.js` | `getUserData`, `setUserData`, `clearUserData`                                                  |

## Environment Configuration

- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:3000/api`)
- Copy `.env.example` to `.env` to configure

## Code Style

- **Linting**: Dual-linter setup with oxlint (fast) then eslint (comprehensive) via npm-run-all2
- **Formatting**: Prettier with semicolons disabled, double quotes, 100 char width
- **Import alias**: `@` maps to `src/` directory
- **No tests** currently exist for the frontend app

## File Naming

- Views: `*View.vue` (e.g., `LoginView.vue`)
- Components: PascalCase (e.g., `AppLayout.vue`, `RoleFormModal.vue`)
- Stores: camelCase with `use` prefix (e.g., `useAuthStore`)
- Composables: camelCase with `use` prefix (e.g., `useAuth`, `useRoles`)
- API modules: camelCase (e.g., `auth.js`, `invitations.js`)
