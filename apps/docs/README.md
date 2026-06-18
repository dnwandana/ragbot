# @fullstack/docs

The end-user product documentation site for RAGBot — a VitePress static site, prerendered with no server runtime. It covers how to use the product: getting started, the core concepts (workspaces, members & roles, datasets, agents, chatting, audit logs, account), a screenshot product tour, developer guides, and help. This is end-user documentation, not the product UI (`apps/app`) or marketing site (`apps/web`).

## Quick start

```bash
corepack pnpm --filter @fullstack/docs dev         # vitepress dev
corepack pnpm --filter @fullstack/docs build       # static build to .vitepress/dist
corepack pnpm --filter @fullstack/docs preview      # preview the built site on :4173
corepack pnpm --filter @fullstack/docs lint         # eslint .
corepack pnpm --filter @fullstack/docs format:fix   # prettier --write .
```

## Content map

Sidebar order and structure are defined in `.vitepress/config.ts`.

- **Getting Started** — `index.md` (overview), `getting-started/signing-in.md`, `getting-started/onboarding.md`, `getting-started/quick-start.md`.
- **Concepts & How-To** — `concepts/`: `workspaces.md`, `members-roles.md`, `datasets.md`, `agents.md`, `chatting.md`, `audit-logs.md`, `account.md`.
- **Reference** — `reference/tour.md` (screenshot-driven product tour).
- **For Developers** — `developer/`: `architecture.md`, `running-locally.md`, `deployment.md`.
- **Help** — `help/faq.md`, `help/troubleshooting.md`.

Screenshots live in `public/screenshots/` and are surfaced via the `<Shot>` component; product screens are also recreated as pixel-faithful Vue mockups under `.vitepress/theme/components/mocks/`.

## Versions

- VitePress `^1.6.4`
- Vue `^3.5.32`

This README (along with `AGENTS.md` / its `CLAUDE.md` symlink) is excluded from the published site via `srcExclude` in `.vitepress/config.ts`, so it is not emitted as a page.

See `AGENTS.md` for detailed architecture — directory layout, the full component and screenshot inventory, styling, config, and deployment.
