# CLAUDE.md

`apps/web` is the public marketing site for RAGBot. Astro 6, `output: 'static'`, no server runtime. Pages: the landing page (`/`) and `404`. The product UI lives in `apps/app`.

## Commands

```bash
corepack pnpm --filter @ragbot/web dev      # :4321
corepack pnpm --filter @ragbot/web build | preview | lint | lint:fix | format | format:fix
```

## Environment

`PUBLIC_SITE_URL`, `PUBLIC_APP_URL`, `PUBLIC_DOCS_URL`. All three are required. `src/utils/validate-env.js` runs from `astro.config.mjs` and fails the build if one is missing. CTAs link to `${PUBLIC_APP_URL}/signup`. Nav and footer link to `${PUBLIC_DOCS_URL}/`.

## Layout

- `src/pages/` `index.astro`, `404.astro`, `robots.txt.js`.
- `src/layouts/BaseLayout.astro` head meta, Open Graph, anti-flash theme script, loads `app.js`.
- `src/components/` one component per landing section. `src/icons/` static SVG components. `src/styles/`.
- `public/scripts/app.js` one IIFE: nav scroll state, scroll reveal, hero chat animation, dark-mode toggle.

## Conventions

- Prettier with `prettier-plugin-astro`: `semi: false`, double quotes, 100 columns. ESLint with `eslint-plugin-astro`.
- The anti-flash script sets `data-theme` before first paint. Icon swap is CSS-driven. JS only flips the attribute.
- `@lucide/astro` needs kebab-case `stroke-width`. camelCase is ignored.
- Static content, no unit tests. The build is the gate.

## Deployment

Own container from `apps/web/Dockerfile` (Astro build, then nginx with `apps/web/nginx.conf`). Local host port 4321. Production has no published port. The nginx edge proxies `${DOMAIN}` to it. The three `PUBLIC_*` values are build args.
