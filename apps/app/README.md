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
│   ├── invitations.js
│   ├── permissions.js
│   └── roles.js
├── stores/        # Pinia stores - business logic and state
│   ├── auth.js
│   ├── invitations.js
│   ├── members.js
│   └── roles.js
├── composables/   # Composables - form handling, UI state
│   ├── useAuth.js
│   ├── useInvitations.js
│   ├── useMembers.js
│   ├── usePermissions.js
│   └── useRoles.js
├── views/         # Page components - *View.vue naming
│   ├── auth/           # LoginView, SignupView, VerifyEmailView, ForgotPasswordView, ResetPasswordView
│   └── invitations/    # MyInvitationsView
├── components/    # Reusable components
│   ├── AppLayout.vue
│   ├── AppSidebar.vue
│   ├── InviteFormModal.vue
│   ├── InvitationsTable.vue
│   ├── MembersTable.vue
│   └── RoleFormModal.vue
├── router/        # Vue Router configuration with auth guards
└── utils/         # Utilities (fetch-based HTTP client, localStorage)
    ├── http.js
    └── storage.js
```

### Layer Architecture

1. **API Layer** (`src/api/`) - Service functions that make HTTP requests
2. **Store Layer** (`src/stores/`) - Pinia stores that manage domain state
3. **Composable Layer** (`src/composables/`) - Reusable composition functions for UI logic
4. **View Layer** (`src/views/`) - Page components that use composables

## Code Style

- **Linters**: oxlint (fast) + eslint (comprehensive) via npm-run-all2
- **Formatter**: Prettier
- **Rules**: No semicolons, double quotes, 100 char line width
- **Import alias**: `@` maps to `src/`
