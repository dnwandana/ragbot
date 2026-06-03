# CLAUDE.md

`apps/web` — the public marketing site for RAGBot. This file covers app-specific concerns; see the root `CLAUDE.md` for workspace-level guidance.

## What it is

- **Astro 6 static site** (`output: 'static'`) — prerendered at build time, no server runtime.
- Scope: the public **landing page** (`/`) and **404** page. This is **not** the authenticated product UI — that lives in `apps/app` (Vue 3).
- Linked to the app via CTAs: every "Sign up free" button is a plain `<a href="${PUBLIC_APP_URL}/signup">`.

## Commands

```bash
corepack pnpm --filter @fullstack/web dev        # astro dev on port 4321
corepack pnpm --filter @fullstack/web build      # static build to dist/
corepack pnpm --filter @fullstack/web preview     # preview the built site
corepack pnpm --filter @fullstack/web lint        # eslint . (report-only)
corepack pnpm --filter @fullstack/web lint:fix    # eslint . --fix
corepack pnpm --filter @fullstack/web format      # prettier --check .
corepack pnpm --filter @fullstack/web format:fix  # prettier --write .
```

From the repo root, the shortcuts `dev:web` / `build:web` / `lint:web` / `format:web` run the same via Turborepo.

## Environment

Build-time public vars (Astro exposes `PUBLIC_`-prefixed vars via `import.meta.env`). Copy `.env.example` to `.env`:

- `PUBLIC_SITE_URL` — canonical domain; feeds `<link rel="canonical">`, Open Graph `og:url`, the sitemap, and `robots.txt`. Defaults to `http://localhost:4321`.
- `PUBLIC_APP_URL` — the product domain; CTAs link to `${PUBLIC_APP_URL}/signup`. Defaults to `http://localhost:8080`.

## Structure

```
apps/web/
├── astro.config.mjs            # output: 'static', @astrojs/sitemap
├── src/
│   ├── pages/
│   │   ├── index.astro         # landing page (composes the section components)
│   │   ├── 404.astro           # not-found page
│   │   └── robots.txt.js       # prerendered robots.txt (GET endpoint)
│   ├── layouts/
│   │   └── BaseLayout.astro    # <head> meta/OG/Twitter, anti-flash theme script, loads app.js
│   ├── components/             # Nav, Hero, HowItWorks, Benefits, Reassurance, FinalCta, Footer, NotFound
│   ├── icons/                  # static .astro SVG icon components (Logo, Mark, Icon*)
│   └── styles/                 # colors_and_type.css, marketing.css
└── public/
    ├── assets/                 # logo/mark SVGs
    ├── favicon.svg             # site favicon
    └── scripts/app.js          # vanilla-JS interactions (see below)
```

## `public/scripts/app.js`

A single IIFE handling all client interactions, loaded via `<script src="/scripts/app.js" is:inline>`:

- **Nav scroll state** — toggles `.scrolled` on `#nav` past 8px.
- **Scroll reveal** — `IntersectionObserver` reveals `.reveal` elements, with a `load`+timeout safety net; respects `prefers-reduced-motion`.
- **Hero chat animation** — types/streams a rotating set of demo Q&A into `#chat`; pauses while the tab is hidden (`scheduleNext` + `visibilitychange`); renders a static final state under reduced motion.
- **Dark-mode toggle** (`initTheme`) — flips `data-theme` on `<html>` and persists to `localStorage`.

## Conventions

- **Prettier**: `.prettierrc.json` — `semi: false`, double quotes, `tabWidth: 2`, `printWidth: 100` (same as `apps/api`/`apps/app`), plus `prettier-plugin-astro`.
- **Lint**: ESLint flat config with `eslint-plugin-astro` (recommended); `dist/` and `.astro/` ignored.
- **Anti-flash theme**: an `is:inline` script in `BaseLayout` `<head>` sets `data-theme` from `localStorage` **before first paint**. Icon visibility is **CSS-driven** (`[data-theme='dark'] .icon-moon { display:none }`); JS only flips the attribute — never toggles icon display directly, to avoid flicker.

## Deployment

- **Local** — runs as its own container via `apps/web/Dockerfile` (multi-stage: Astro build → nginx serves the static `dist/`). Wired into `docker-compose.local.yml` as the `web` service on host port **4321** (`http://localhost:4321`). nginx serves the static files with a baked-in `apps/web/nginx.conf` (security headers re-asserted on assets, `try_files $uri $uri/ =404` + `error_page 404 /404.html`, asset caching).
- **Production** — runs as its own `web` container from the **same** `apps/web/Dockerfile`, with no published ports; the nginx edge reverse-proxies the apex domain (`${DOMAIN}`) to it via `nginx/templates/web.conf.template`. The edge no longer bakes the static `dist/`.
- **Build args** — `PUBLIC_SITE_URL` (default `http://localhost:4321`) and `PUBLIC_APP_URL` (default `http://localhost:8080`); production passes `https://${DOMAIN}` and `https://app.${DOMAIN}`.
