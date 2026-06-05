# RAG Chatbot Frontend

Vue 3 SPA frontend for the RAG Chatbot platform. Features cookie-based JWT authentication with automatic token refresh, Ant Design Vue UI components, and a layered architecture built for scalability.

## Monorepo Usage

This package lives at `apps/app` inside the monorepo.

From the repository root, run:

```bash
corepack pnpm dev:app
corepack pnpm build:app
corepack pnpm lint:app
```

You can still run package-local commands from `apps/app` with `pnpm`.

## Features

- **Cookie-Based Auth**: JWT tokens in httpOnly cookies set by the server, automatic refresh on 401, request queuing during refresh
- **RBAC-Aware UI**: Permission-gated components via `can()` / `canAny()` composables
- **Workspaces & Members**: Workspace CRUD, member management, role editor with a permission matrix, and invitations
- **Onboarding**: Guided multi-step wizard (workspace → source → agent → invite) for new users
- **Datasets**: Dataset list and detail views with file upload and URL-scrape sources
- **Agents**: Agent CRUD via a side drawer with model configuration
- **Conversations & Chat**: Conversation list plus a chat view with SSE streaming, citations, and a linked-datasets drawer
- **Audit Logs**: Filterable workspace audit-log view with a detail drawer
- **Ant Design Vue**: Full component library with icons
- **Layered Architecture**: API → Store → Composable → View separation

## Tech Stack

| Technology     | Purpose                                            |
| -------------- | -------------------------------------------------- |
| Vue 3          | Progressive JavaScript framework (Composition API) |
| Vite           | Next-generation frontend tooling                   |
| Pinia          | State management                                   |
| Ant Design Vue | UI component library                               |
| Fetch API      | Native HTTP client with cookie-based auth          |
| Vue Router     | Client-side routing with guards                    |

## Prerequisites

- **Node.js**: `>=24.0.0`
- A running backend API

## Quick Start

1. **Install dependencies**

   ```bash
   corepack pnpm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Set your API base URL:

   ```
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`

## Development Commands

```bash
npm run dev       # Start dev server (port 8080)
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run linters (oxlint + eslint with auto-fix)
npm run format    # Format code with Prettier
```

## Project Structure

```
src/
├── api/           # API service layer - pure HTTP calls
│   ├── auth.js
│   ├── chat.js          # SSE chat via native fetch
│   ├── conversations.js
│   ├── datasets.js
│   ├── datasetFiles.js
│   ├── agents.js
│   ├── workspaces.js
│   ├── members.js
│   ├── invitations.js
│   ├── roles.js
│   ├── permissions.js
│   ├── auditLogs.js
│   ├── account.js
│   └── profile.js
├── stores/        # Pinia stores - business logic and state
│   ├── auth.js
│   ├── chat.js          # Chat streaming state
│   ├── conversations.js
│   ├── datasets.js
│   ├── datasetFiles.js
│   ├── agents.js
│   ├── workspaces.js
│   ├── members.js
│   ├── invitations.js
│   ├── roles.js
│   └── auditLogs.js
├── composables/   # Composables - form handling, UI state
│   ├── useAuth.js
│   ├── useChat.js       # Chat sendMessage + abort
│   ├── useChatActions.js
│   ├── useMarkdown.js
│   ├── useConversations.js
│   ├── useDatasets.js
│   ├── useDatasetFiles.js
│   ├── useAgents.js
│   ├── useWorkspaces.js
│   ├── useMembers.js
│   ├── useInvitations.js
│   ├── useRoles.js
│   ├── usePermissions.js
│   ├── useAuditLogs.js
│   ├── useProfile.js
│   ├── useAccount.js
│   ├── usePaginationUI.js
│   └── useTheme.js
├── views/         # Page components - *View.vue naming
│   ├── auth/            # LoginView, SignupView, VerifyEmailView, ForgotPasswordView, ResetPasswordView
│   ├── workspaces/      # WorkspacesListView
│   ├── settings/        # WorkspaceSettingsView + SettingsGeneral/Members/Roles/Profile/Account
│   ├── datasets/        # DatasetsListView, DatasetDetailView
│   ├── agents/          # AgentsListView
│   ├── conversations/   # ConversationsListView, ChatView
│   ├── audit-logs/      # AuditLogsView
│   ├── onboarding/      # OnboardingView + steps/
│   └── invitations/     # MyInvitationsView
├── components/    # Reusable components
│   ├── AppLayout.vue
│   ├── AppSidebar.vue
│   ├── AppUserMenu.vue
│   ├── AuthShell.vue
│   ├── WorkspaceFormModal.vue
│   ├── InviteFormModal.vue
│   ├── InvitationsTable.vue
│   ├── MembersTable.vue
│   ├── agents/          # AgentFormDrawer
│   ├── audit/           # AuditTable, AuditFilterBar, AuditDetailDrawer, auditIcons, auditMaps
│   ├── chat/            # ChatComposer, ChatMessage, ChatThread, ChatTopBar, CiteRef, DatasetDrawer, MarkdownRenderer, SourceCitations
│   ├── datasets/        # AddSourceDrawer, FileDetailPanel
│   ├── onboarding/      # OnboardingProgress, OnboardingToast
│   └── roles/           # RoleEditor, DeleteRoleModal, RolePermissionMatrix
├── router/        # Vue Router configuration with auth guards
└── utils/         # Utilities (fetch-based HTTP client, localStorage, time/file helpers)
    ├── http.js
    ├── storage.js
    ├── time.js
    ├── files.js
    └── permissionCatalog.js
```

### Layer Architecture

1. **API Layer** (`src/api/`) - Service functions that make HTTP requests
2. **Store Layer** (`src/stores/`) - Pinia stores that manage domain state
3. **Composable Layer** (`src/composables/`) - Reusable composition functions for UI logic
4. **View Layer** (`src/views/`) - Page components that use composables

### Chat with SSE Streaming

The chat feature uses Server-Sent Events (SSE) for real-time streaming of AI responses. The native `fetch` API is used directly (rather than the project HTTP client) because the custom fetch wrapper does not expose the `ReadableStream` body needed to consume SSE frames.

The SSE endpoint URL is built using the `baseURL` constant exported from `utils/http.js`, ensuring the correct API host from `VITE_API_BASE_URL` is always used rather than a hardcoded path.

**Flow**: User sends message -> native fetch POST with `Accept: text/event-stream` -> server runs ReAct loop (embed -> search -> stream) -> client parses `token`/`thought`/`observation`/`citation`/`done` events -> reloads conversation from server on completion.

## Code Style

- **Linters**: oxlint (fast) + eslint (comprehensive) via npm-run-all2
- **Formatter**: Prettier
- **Rules**: No semicolons, double quotes, 100 char line width
- **Import alias**: `@` maps to `src/`
