# @fullstack/web

The public landing and marketing site for RAGBot — an Astro 6 static site, prerendered at build time with no server runtime. It hosts the public landing page (`/`) and 404 page, and deep-links visitors into the authenticated product (`apps/app`) via "Sign up free" CTAs. This is not the product UI itself.

## Quick start

```bash
corepack pnpm --filter @fullstack/web dev        # astro dev on port 4321
corepack pnpm --filter @fullstack/web build      # static build to dist/
corepack pnpm --filter @fullstack/web preview    # preview the built site
corepack pnpm --filter @fullstack/web lint       # eslint .
corepack pnpm --filter @fullstack/web format     # prettier --check .
```

## Environment

Build-time public vars (Astro exposes `PUBLIC_`-prefixed vars via `import.meta.env`). Copy `.env.example` to `.env`:

- `PUBLIC_SITE_URL` — this site's canonical/SEO base; feeds `<link rel="canonical">`, Open Graph `og:url`, the sitemap, and `robots.txt`.
- `PUBLIC_APP_URL` — the product app's URL; the deep-link target for CTAs (`${PUBLIC_APP_URL}/signup`).

## Directory map

- `src/pages/` — routed pages (`index.astro`, `404.astro`, prerendered `robots.txt.js`).
- `src/components/` — landing-page section components (Nav, Hero, etc.).
- `src/layouts/` — `BaseLayout.astro` (`<head>` meta/OG/Twitter, anti-flash theme script).
- `src/styles/` — global CSS (`colors_and_type.css`, `marketing.css`).
- `src/icons/` — static `.astro` SVG icon components.
- `public/scripts/app.js` — vanilla-JS client interactions (nav scroll state, scroll reveal, hero chat animation, dark-mode toggle).

See `AGENTS.md` for detailed architecture.
