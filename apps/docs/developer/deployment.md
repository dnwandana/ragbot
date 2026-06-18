---
title: Deployment
---

# Deployment

<p class="lede">How to run RAGBot in containers — a four-service stack on your machine, or the full reverse-proxied production deployment. For a non-Docker dev setup, see <a href="/developer/running-locally">Running locally</a>.</p>

Two Compose files ship with the repo — one for local containers, one for production. **PostgreSQL is always external** to both, and **migrations never run automatically** — you run them by hand (see below).

## Local Docker

The local stack runs four containers — `web` (Astro marketing site, `:4321`), `docs` (VitePress, `:4173`), `app` (Vue SPA on `:80`, proxies `/api`), and `api` (Express, no published port). nginx serves over plain HTTP (no TLS) using `nginx/local.conf`.

```bash
docker compose -f docker-compose.local.yml up --build -d
docker compose -f docker-compose.local.yml logs -f
docker compose -f docker-compose.local.yml down
```

Environment comes from `.env.local` (copy `.env.example`). Set `NODE_ENV=development`, `JWT_ISSUER`/`JWT_AUDIENCE=http://localhost`, and `CORS_ALLOWED_ORIGINS=http://localhost`.

::: tip Local cookies need development mode
`NODE_ENV=development` is required locally: the API marks auth cookies `Secure` only in production, and browsers reject `Secure` cookies over plain HTTP — so a production config won't let you log in over `http://localhost`.
:::

## Production self-host

The production stack runs **five** containers — one nginx edge plus `web`, `app`, `api`, and `docs`.

```bash
docker compose build
docker compose up -d
docker compose logs -f
docker compose ps
```

The edge is a **pure reverse proxy** for name-based virtual hosts, each backed by its own container:

| Hostname         | Container | Serves                          |
| ---------------- | --------- | ------------------------------- |
| `${DOMAIN}`      | `web`     | Astro marketing site            |
| `app.${DOMAIN}`  | `app`     | Vue SPA                         |
| `api.${DOMAIN}`  | `api`     | Express API (`http://api:3000`) |
| `docs.${DOMAIN}` | `docs`    | This documentation site         |

The edge **builds nothing and serves no content** — it owns TLS and routing only; each app builds and serves its own static files. **Header ownership:** the edge sets HSTS; each app's own `nginx.conf` sets `nosniff` / `X-Frame-Options`.

Config is templated per vhost under `nginx/templates/{web,app,api,docs}.conf.template` — each self-contained (its own `:80`→`:443` redirect plus a `:443` server), rendered at container start via nginx's envsubst from `${DOMAIN}`. nginx listens on `80` + `443`; `:80` 301-redirects every host to HTTPS.

The **API uses clean URLs** (`api.${DOMAIN}/*`): nginx re-adds the `/api` prefix upstream and rewrites `Set-Cookie` paths via `proxy_cookie_path`, so the Express app and its cookie code are unchanged. Frontend↔API is **cross-origin same-site**, so `SameSite=Strict` cookies still flow; CORS is owned by Express (`CORS_ALLOWED_ORIGINS=https://app.${DOMAIN}`), not nginx.

Set `DOMAIN` and the rest of the production configuration in `.env`.

### TLS & DNS

You bring your own DNS and certificate. Point both the **apex** and a **wildcard** record at the host, and provide a single certificate covering both (issued with, for example, `-d example.com -d *.example.com`). The edge mounts `certs/` read-only and expects two files named after your domain:

- `${DOMAIN}.fullchain.pem`
- `${DOMAIN}.privkey.pem`

The wildcard entry covers the `app.`, `api.`, and `docs.` subdomains.

## Run the migrations

Migrations never run automatically — run them inside the `api` container once the stack is up:

```bash
# production
docker compose run --rm api sh -c "node_modules/.bin/knex migrate:latest"
# local
docker compose -f docker-compose.local.yml run --rm api sh -c "node_modules/.bin/knex migrate:latest"
```
