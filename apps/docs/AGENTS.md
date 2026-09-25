# apps/docs

End-user documentation site for RAGBot, served at `docs.${DOMAIN}`. VitePress static site, no server runtime. Not the product UI (`apps/app`) and not the marketing site (`apps/web`).

## Commands

```bash
corepack pnpm --filter @ragbot/docs dev      # :5173
corepack pnpm --filter @ragbot/docs build | preview | lint | format:fix
```

## Layout

- Content: `index.md`, `getting-started/`, `concepts/`, `reference/`, `developer/`, `help/`.
- `.vitepress/config.ts` owns title, nav, sidebar (hand-maintained), `cleanUrls`, local search, and `srcExclude` for `AGENTS.md`, `CLAUDE.md`, `README.md`.
- `.vitepress/theme/index.ts` registers every component globally, so markdown uses them with no import.
- `.vitepress/theme/components/primitives/`: `Cards`/`Card`, `Steps`/`Step`, `Faq`, `MockFrame`, `Shot`.
- `.vitepress/theme/components/mocks/`: pixel-faithful HTML/CSS recreations of `apps/app` screens, grouped by feature. Only `AuthCardMock` (`variant`) and `OnboardingMock` (`step`) take props.
- `.vitepress/theme/styles/tokens.css` maps the RAGBot design tokens onto `--vp-c-*`. `components.css` styles the primitives and mocks.
- `public/screenshots/` holds real-app captures used by `<Shot>`. Capture is manual (headed Playwright). The workflow is in `vitepress-doc-prompt.md` at the repo root.

## Conventions

- Every page has a frontmatter `title` and opens with `<p class="lede">`.
- VitePress fails the build on a dead internal link. The build is the test gate. No unit tests.
- Callouts use `::: info`, `::: tip`, `::: warning`.
- Mock CSS uses a per-component class prefix. Register a new component in `theme/index.ts`.
- When the real app UI changes, update the matching mock.
- `vue/no-v-html` and `vue/multi-word-component-names` are disabled on purpose.

## Deployment

Own container from `apps/docs/Dockerfile` (VitePress build, then nginx). Local host port 5173. Production has no published port. The nginx edge proxies `docs.${DOMAIN}` to it.
