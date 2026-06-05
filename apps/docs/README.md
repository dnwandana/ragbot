# @fullstack/docs

The end-user product documentation site for RAGBot — a VitePress static site, prerendered with no server runtime. It covers how to use the product (workspaces, members & roles, datasets, agents, chatting, and FAQ). This is end-user documentation, not the product UI (`apps/app`) or marketing site (`apps/web`).

## Quick start

```bash
corepack pnpm --filter @fullstack/docs dev        # vitepress dev
corepack pnpm --filter @fullstack/docs build      # static build to .vitepress/dist
corepack pnpm --filter @fullstack/docs preview    # preview the built site on :4173
```

## Content map

- `index.md` — overview / landing page.
- `getting-started/` — `quick-start.md`.
- `concepts/` — `workspaces.md`, `members-roles.md`, `datasets.md`, `agents.md`, `chatting.md`.
- `help/` — `faq.md`.

## Versions

- VitePress `^1.6.4`
- Vue `^3.5.32`

This README is excluded from the published site via `srcExclude` in `.vitepress/config.ts`, so it is not emitted as a page.

See `AGENTS.md` for detailed architecture.
