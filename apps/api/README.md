# RAG Chatbot API

Workspace-based multi-tenant REST API for a RAG (Retrieval-Augmented Generation) chatbot platform. Express.js with PostgreSQL + pgvector, JWT authentication, RBAC, and async document processing pipeline.

## Monorepo Usage

This package lives at `apps/api` inside the monorepo.

From the repository root, run:

```bash
corepack pnpm dev:api
corepack pnpm build:api
corepack pnpm lint:api
corepack pnpm test:api
```

You can still run package-local commands from `apps/api` with `pnpm`.

## Features

### Authentication & Security

- **JWT Authentication**: Dual-token system with access tokens (15min) and refresh tokens (7 days), pinned to HS256, delivered as httpOnly cookies
- **Email-Based Auth**: Signup with email + full_name, email verification required before signin, forgot/reset password flow
- **Password Hashing**: Argon2 for secure password storage
- **Email Tokens**: SHA-256 hashed tokens with configurable expiration (verify: 24h, reset: 1h, invitation: 7d)
- **Security Headers**: Helmet with strict Content Security Policy, referrer protection, and HSTS (1-year max-age with preload)
- **CORS**: Configurable allowed origins with credentials support for cookie-based auth
- **Rate Limiting**: Configurable per-route and global rate limits
- **HPP Protection**: HTTP Parameter Pollution prevention
- **Input Validation**: Joi schemas for request validation
- **Environment Validation**: Startup checks for required variables, secret strength, and placeholder detection
- **Body Size Limits**: 100kb cap on JSON and URL-encoded payloads

### Multi-Tenant Architecture

- **Workspace model**: Flat workspace-based tenancy (no org/project nesting)
- **Data isolation**: Shared database with `workspace_id` columns and composite foreign keys enforcing isolation at the DB level
- **RBAC**: 30 permissions across 8 resources, 4 system roles (owner/admin/editor/viewer) + custom roles
- **Soft delete**: `deleted_at` columns with partial unique indexes for safe deletion and recovery

### Database

- **PostgreSQL + pgvector**: 15 tables with vector similarity search (HNSW index)
- **Knex.js**: SQL query builder with migration support
- **MVC Pattern**: Clean separation of concerns (Models, Controllers, Routes)
- **ES Modules**: Modern JavaScript with `import/export` syntax

### Planned Integrations

- **OpenRouter**: LLM inference for chat and embeddings
- **Brevo**: Transactional email via inline HTML templates (verification, password reset, invitations)
- **Cloudflare R2**: S3-compatible file storage
- **LlamaIndex**: Document parsing via webhook
- **Firecrawl**: URL content scraping
- **LangChain**: Text splitting for chunking

## Tech Stack

| Component           | Version                                | Description                   |
| ------------------- | -------------------------------------- | ----------------------------- |
| **Runtime**         | Node.js >=24.0.0                       | JavaScript runtime            |
| **Framework**       | Express.js ^5.2.1                      | Web application framework     |
| **Database**        | PostgreSQL + pgvector                  | Relational + vector search    |
| **ORM**             | Knex.js ^3.1.0                         | Query builder & migrations    |
| **Authentication**  | JWT ^9.0.3, Argon2 ^0.43.1             | Token-based auth & hashing    |
| **Validation**      | Joi ^17.13.3                           | Schema validation             |
| **Security**        | Helmet ^8.1.0, CORS ^2.8.5, HPP ^0.2.3 | Security middleware           |
| **Rate Limiting**   | express-rate-limit ^8.2.1              | Request throttling            |
| **Job Queue**       | BullMQ ^5.53.0                         | Redis-backed async processing |
| **File Upload**     | Multer ^2.1.1                          | Multipart form handling       |
| **AWS SDK**         | @aws-sdk/client-s3 ^3.1048.0           | S3-compatible storage access  |
| **Email**           | @getbrevo/brevo ^5.0.4                 | Transactional email           |
| **Text Processing** | @langchain/textsplitters ^1.0.1        | Document chunking             |
| **Logging**         | Winston ^3.19.0, Morgan ^1.10.1        | Structured logging            |
| **Testing**         | Vitest ^4.0.18, Supertest ^7.2.2       | Test runner & HTTP testing    |
| **Code Quality**    | Oxlint ^1.41.0, Prettier ^3.8.1        | Linting and formatting        |

## Prerequisites

- **Node.js** v24 or higher
- **PostgreSQL** with `pgvector` extension
- **Redis** — any Redis-compatible provider (local, Upstash, etc.) for the BullMQ job queue
- **Git** for cloning the repository

## Quick Start

```bash
# 1. Install dependencies
corepack pnpm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your database credentials and service keys

# 3. Set up the database
npm run migrate
npm run seed

# 4. Start development server
npm run dev
```

The API will be available at `http://localhost:3000/api`

## Configuration

Create a `.env` file from `.env.example`. See `.env.example` for the full list with defaults.

**Required variables**: `DATABASE_URL`, `REDIS_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `OPENROUTER_API_KEY`, `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `APP_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`, `LLAMAINDEX_API_KEY`, `LLAMAINDEX_WEBHOOK_SECRET`, `FIRECRAWL_API_KEY`

Generate secrets with:

```bash
openssl rand -hex 32
```

## Logging

Winston + Morgan for structured logging with daily rotation (14 days retention). Console always enabled; file logging when `LOG_TO_FILE=true`.

Log files in `logs/`: `error-YYYY-MM-DD.log` and `combined-YYYY-MM-DD.log`.

## Development Commands

### Server

```bash
npm run dev      # Development server with nodemon
npm start        # Production server
```

### Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

Tests require a PostgreSQL test database with pgvector. Copy `.env.example` to `.env.test` and configure a separate database.

### Linting & Formatting

```bash
npm run lint         # Run Oxlint
npm run lint:fix     # Auto-fix issues
npm run format       # Check formatting with Prettier
npm run format:fix   # Apply formatting with Prettier
```

### Database

```bash
npm run migrate                # Run all pending migrations
npm run migrate:make <name>    # Create a new migration file
npm run migrate:rollback       # Rollback the last migration
npm run seed                   # Run all seed files
npm run seed:make <name>       # Create a new seed file
```

## API Endpoints

### Health Check

| Method | Endpoint  | Description                             | Auth Required |
| ------ | --------- | --------------------------------------- | ------------- |
| GET    | `/health` | Health check with database connectivity | No            |

### Authentication

| Method | Endpoint                        | Description                                              | Auth Required |
| ------ | ------------------------------- | -------------------------------------------------------- | ------------- |
| POST   | `/api/auth/signup`              | Create account, sends verification email                 | No            |
| POST   | `/api/auth/verify-email`        | Verify email via token from email link                   | No            |
| POST   | `/api/auth/resend-verification` | Resend verification email (always returns 200)           | No            |
| POST   | `/api/auth/signin`              | Sign in (requires verified email); sets httpOnly cookies | No            |
| POST   | `/api/auth/forgot-password`     | Request password reset email (always returns 200)        | No            |
| POST   | `/api/auth/reset-password`      | Reset password via token, revokes all sessions           | No            |
| GET    | `/api/auth/me`                  | Verify cookie validity, return user                      | Access Token  |
| POST   | `/api/auth/refresh`             | Rotate tokens via httpOnly cookie                        | Refresh Token |
| POST   | `/api/auth/logout`              | Revoke refresh token, clear cookies                      | Refresh Token |

### Permissions

| Method | Endpoint           | Description                 | Auth Required |
| ------ | ------------------ | --------------------------- | ------------- |
| GET    | `/api/permissions` | List all system permissions | Access Token  |

### Authentication Format

Authentication uses **httpOnly cookies** set by the server. Tokens are never exposed to client-side JavaScript.

- **Signin**: Server sets `access_token` (httpOnly, path `/api`, 15min) and `refresh_token` (httpOnly, path `/api/auth`, 7d) cookies
- **Token refresh**: Browser sends `refresh_token` cookie. Server rotates both tokens and sets new cookies
- **Authenticated requests**: Browser sends `access_token` cookie with every request under `/api`
- **Logout**: Server revokes refresh token and clears both cookies

## System Roles & Permissions

4 built-in system roles per workspace. 30 permissions across 8 resources.

| Resource     | Actions                                 |
| ------------ | --------------------------------------- |
| workspace    | create, read, update, delete            |
| role         | create, read, update, delete            |
| member       | read, invite, remove, manage_role       |
| audit        | read                                    |
| dataset      | create, read, update, delete            |
| file         | read, upload, update, delete, reprocess |
| agent        | create, read, update, delete            |
| conversation | create, read, update, delete, chat      |

## Project Structure

```
apps/api/
├── src/
│   ├── config/
│   │   └── database.js          # Knex instance
│   ├── controllers/
│   │   ├── authentication.js    # Signup, verify-email, signin, forgot/reset password, refresh, logout, me
│   │   ├── permissions.js       # Permission reference endpoint
│   │   └── roles.js             # CRUD roles (needs workspace re-scoping)
│   ├── emails/
│   │   ├── render.js            # Template loader with {{var}} substitution
│   │   └── templates/           # verify-email.html, reset-password.html, workspace-invitation.html
│   ├── middlewares/
│   │   ├── authorization.js     # requireAccessToken, requireRefreshToken
│   │   ├── error.js             # errorHandler, notFoundHandler
│   │   ├── logger.js            # httpLogger (Morgan), requestLogger (Winston)
│   │   ├── rate-limit.js        # authLimiter, generalLimiter
│   │   ├── request-id.js        # X-Request-Id tracking
│   │   └── require-permission.js # Permission gate
│   ├── models/
│   │   ├── email-tokens.js      # SHA-256 token hashing, CRUD for email_tokens
│   │   ├── permissions.js
│   │   ├── refresh-tokens.js
│   │   ├── roles.js
│   │   └── users.js
│   ├── services/
│   │   └── email.js             # Brevo transactional email via inline HTML templates
│   ├── routes/
│   │   ├── authentication.js
│   │   ├── health.js
│   │   ├── index.js             # Route aggregator
│   │   └── permissions.js
│   ├── utils/
│   │   ├── argon2.js            # Password hashing
│   │   ├── constant.js          # HTTP constants
│   │   ├── cookies.js           # httpOnly cookie helpers
│   │   ├── http-error.js        # Custom error class
│   │   ├── jwt.js               # JWT utilities
│   │   ├── logger.js            # Winston logger
│   │   ├── pagination.js        # Reusable pagination & search
│   │   ├── response.js          # Response formatter
│   │   ├── sanitize.js          # ILIKE escaping
│   │   └── validate-env.js      # Startup env validation
│   ├── app.js                   # Express app (middleware + routes)
│   └── index.js                 # Entry point (env validation + server start)
├── database/
│   ├── migrations/              # 8 Knex migrations (15 tables)
│   └── seeds/                   # 2 seed files (permissions + test users)
├── tests/
│   ├── integration/             # auth, health, permissions
│   ├── unit/                    # http-error, pagination, request-id, sanitize
│   ├── helpers.js               # Test factories and utilities
│   ├── global-setup.js
│   └── global-teardown.js
├── .env.example
├── .nvmrc                       # Node.js version (24)
├── knexfile.js                  # Knex configuration
├── vitest.config.js             # Vitest test configuration
└── package.json
```

## Production Deployment

```bash
npm run migrate   # Always run migrations before starting
npm start         # Start production server
```

### Security Considerations

- Use HTTPS in production
- JWT secrets validated at startup (≥32 chars, no placeholders)
- Tokens as httpOnly cookies (XSS protection)
- Account lockout after 5 failed attempts (15-minute lock)
- Helmet enforces strict CSP, no-referrer, HSTS with preload
- CORS restricted to explicit origins
- Rate limiting on auth (10 req/15min) and globally (100 req/15min)
- Request body capped at 100kb
- Never commit `.env` file to version control
