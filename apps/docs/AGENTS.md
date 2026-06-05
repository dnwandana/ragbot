# apps/docs

`apps/docs` — the end-user documentation site for RAGBot, served at `docs.${DOMAIN}`. This file covers app-specific concerns; see the root `CLAUDE.md` for workspace-level guidance.

## What it is

- **VitePress static site** (`^1.6.4`, bundles Vue 3.5) — prerendered to `.vitepress/dist`, no server runtime.
- Scope: end-user docs (Overview, Quick Start, Workspaces, Members & Roles, Datasets, Agents, Chatting, FAQ). Not the product UI (`apps/app`) or marketing site (`apps/web`).
- **Theme:** VitePress default theme, restyled to the RAGBot design tokens in `.vitepress/theme/styles/tokens.css` (+ `components.css`). Dark mode uses VitePress's `.dark` selector.
- **Components:** four product mockups (`ChatMock`, `DatasetMock`, `AgentMock`, `WorkspaceMock`) on a shared `MockFrame`, plus doc primitives (`Cards`/`Card`, `Steps`/`Step`, `Faq`, `RolesTable`) in `.vitepress/theme/components/`, registered globally via `enhanceApp`. Icons from `lucide-vue-next`.

## Commands

```bash
corepack pnpm --filter @fullstack/docs dev        # vitepress dev
corepack pnpm --filter @fullstack/docs build      # static build to .vitepress/dist
corepack pnpm --filter @fullstack/docs preview     # preview the built site on :4173
corepack pnpm --filter @fullstack/docs lint        # eslint .
corepack pnpm --filter @fullstack/docs format:fix  # prettier --write .
```

From the repo root: `dev:docs` / `build:docs` / `lint:docs` / `format:docs` run the same via Turborepo.

## Conventions

- VitePress fails the build on dead internal links — keep cross-page links valid.
- Callouts use native containers (`::: info` / `::: tip` / `::: warning`); they're restyled in `components.css`.
- Static content — no unit tests (same as `apps/web`); the build is the gate.

## Deployment

- **Local** — runs as its own container via `apps/docs/Dockerfile` (multi-stage: VitePress build → nginx serves `.vitepress/dist`). Wired into `docker-compose.local.yml` as the `docs` service on host port **4173**. nginx uses `try_files $uri $uri.html $uri/` for clean URLs.
- **Production** — same Dockerfile, no published ports; the nginx edge reverse-proxies `docs.${DOMAIN}` to it via `nginx/templates/docs.conf.template`. The wildcard cert already covers the subdomain.
