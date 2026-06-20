# apps/docs

`apps/docs` — the end-user documentation site for RAGBot, served at `docs.${DOMAIN}`. This file covers app-specific concerns; see the root `CLAUDE.md` for workspace-level guidance.

## What it is

- **VitePress static site** (`^1.6.4`, bundles Vue 3.5) — prerendered to `.vitepress/dist`, no server runtime.
- Scope: end-user docs. Five sections — **Getting Started** (Overview, Accounts & Signing In, Onboarding, Quick Start), **Concepts & How-To** (Workspaces, Members & Roles, Datasets, Agents, Chatting, Audit logs, Profile & account), **Reference** (Product tour), **For Developers** (Architecture, Running locally, Deployment), and **Help** (FAQ, Troubleshooting). Not the product UI (`apps/app`) or marketing site (`apps/web`).
- **Theme:** VitePress default theme, restyled to the RAGBot design tokens in `.vitepress/theme/styles/tokens.css` (+ `components.css`). Dark mode uses VitePress's `.dark` selector.
- **Components:** doc **primitives** (`Cards`/`Card`, `Steps`/`Step`, `Faq`, `MockFrame`, `Shot`) plus **product mockups** — pixel-faithful recreations of real `apps/app` screens — registered globally via `enhanceApp`. Icons from `lucide-vue-next`.

## Directory layout

```
apps/docs/
├── index.md                 # Overview / landing page
├── getting-started/         # signing-in, onboarding, quick-start
├── concepts/                # workspaces, members-roles, datasets, agents,
│                            #   chatting, audit-logs, account
├── reference/               # tour (screenshot-driven product tour)
├── developer/               # architecture, running-locally, deployment
├── help/                    # faq, troubleshooting
├── public/screenshots/      # real-app screenshots surfaced via <Shot>
├── .vitepress/
│   ├── config.ts            # title, nav, sidebar, cleanUrls, srcExclude
│   └── theme/
│       ├── index.ts         # registers all components via enhanceApp
│       ├── styles/          # tokens.css (design tokens) + components.css
│       └── components/
│           ├── primitives/  # Card(s), Step(s), Faq, MockFrame, Shot
│           └── mocks/        # product UI mockups, grouped by feature
├── Dockerfile               # build → nginx serves .vitepress/dist
└── nginx.conf               # static serving + clean URLs
```

## Content pages

| Section           | Page                   | File                             |
| ----------------- | ---------------------- | -------------------------------- |
| Getting Started   | Overview               | `index.md`                       |
| Getting Started   | Accounts & Signing In  | `getting-started/signing-in.md`  |
| Getting Started   | Onboarding             | `getting-started/onboarding.md`  |
| Getting Started   | Quick Start            | `getting-started/quick-start.md` |
| Concepts & How-To | Workspaces             | `concepts/workspaces.md`         |
| Concepts & How-To | Members & Roles        | `concepts/members-roles.md`      |
| Concepts & How-To | Datasets               | `concepts/datasets.md`           |
| Concepts & How-To | Agents                 | `concepts/agents.md`             |
| Concepts & How-To | Chatting with data     | `concepts/chatting.md`           |
| Concepts & How-To | Audit logs             | `concepts/audit-logs.md`         |
| Concepts & How-To | Your profile & account | `concepts/account.md`            |
| Reference         | Product tour           | `reference/tour.md`              |
| For Developers    | Architecture           | `developer/architecture.md`      |
| For Developers    | Running locally        | `developer/running-locally.md`   |
| For Developers    | Deployment             | `developer/deployment.md`        |
| Help              | FAQ                    | `help/faq.md`                    |
| Help              | Troubleshooting        | `help/troubleshooting.md`        |

Every page opens with a `<p class="lede">` intro paragraph and carries a frontmatter `title`. The sidebar/nav order is defined in `.vitepress/config.ts` (it does not auto-generate).

## Theme components

All components live under `.vitepress/theme/components/` and are registered globally in `.vitepress/theme/index.ts`, so markdown uses them with no per-page import.

### Primitives (`components/primitives/`)

| Component        | Purpose                                                                 | Props                                 |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| `Cards` / `Card` | Responsive grid of clickable nav cards (icon + title + description).    | `Card`: `to`, `icon`, `title`, `desc` |
| `Steps` / `Step` | Numbered procedure; the counter auto-increments via CSS `counter()`.    | `Step`: `title` (+ default slot)      |
| `Faq`            | Accordion FAQ; data-driven, renders HTML answers (so `v-html` is used). | `items: { q, a }[]`                   |
| `MockFrame`      | Browser-chrome frame (dots + label bar) wrapping every mock.            | `label`, `caption`                    |
| `Shot`           | Framed, click-to-enlarge, lazy-loaded screenshot with a caption.        | `src`, `alt`, `label`, `caption`      |

### Product mockups (`components/mocks/`)

Each mock wraps `MockFrame` and recreates a real `apps/app` screen in HTML/CSS (no live app calls). Styles are scoped with per-mock class prefixes to avoid global bleed. Only `AuthCardMock` (`variant`) and `OnboardingMock` (`step`) take props; the rest are static.

| Folder        | Component            | Mirrors (in `apps/app`)                                         |
| ------------- | -------------------- | --------------------------------------------------------------- |
| `agents/`     | `AgentMock`          | An agent card in the Agents list                                |
| `agents/`     | `AgentDrawerMock`    | The agent settings drawer (system prompt, model, temperature)   |
| `audit/`      | `AuditTableMock`     | `AuditTable.vue` — the audit-log table                          |
| `auth/`       | `AuthCardMock`       | The auth views (`variant`: `login` / `signup` / `forgot`)       |
| `chat/`       | `NewChatMock`        | The empty chat composer / welcome screen                        |
| `chat/`       | `AgentPickerMock`    | The agent-selector popover in chat                              |
| `chat/`       | `SourcePickerMock`   | The dataset (source) picker drawer in chat                      |
| `chat/`       | `ChatMock`           | A chat thread with a streaming answer and inline citations      |
| `chat/`       | `CitationsPanelMock` | The sources side panel (citations grouped by file)              |
| `datasets/`   | `DatasetsListMock`   | The Datasets grid/list view                                     |
| `datasets/`   | `DatasetMock`        | A dataset detail page (its file table)                          |
| `datasets/`   | `FileDetailMock`     | The file detail drawer (info, explore questions, chunk preview) |
| `onboarding/` | `OnboardingMock`     | The first-run wizard (`step` 1–6)                               |
| `settings/`   | `MembersTableMock`   | `MembersTable` + `InvitationsTable`                             |
| `settings/`   | `RolesTable`         | `SettingsRoles.vue` — built-in + custom role cards              |
| `workspaces/` | `WorkspaceMock`      | The workspace list/switcher table                               |

> When the real app UI changes, update the matching mock so the docs stay pixel-faithful. New components must also be registered in `.vitepress/theme/index.ts`.

## Screenshots & the `Shot` workflow

`public/screenshots/` holds real-app captures (26 images across 8 categories) surfaced in markdown via the `<Shot>` primitive:

```md
<Shot src="/screenshots/auth/login.png" label="Sign in" caption="The sign-in screen." />
```

| Category      | Count | Category      | Count |
| ------------- | ----- | ------------- | ----- |
| `auth/`       | 3     | `chat/`       | 5     |
| `workspaces/` | 3     | `settings/`   | 6     |
| `datasets/`   | 5     | `audit/`      | 1     |
| `agents/`     | 2     | `onboarding/` | 1     |

`reference/tour.md` and `concepts/account.md` are the heaviest `Shot` consumers; the concept pages mostly use mockups instead. Screenshots are **captured manually** (headed Playwright while running `apps/app` locally) — there is no automated capture script. The capture/authoring workflow is documented in `vitepress-doc-prompt.md` at the repo root.

## Styling

- **`tokens.css`** — RAGBot design tokens (brand orange `--brand: #ff6b35`, surface/ink palette, status colors, Geist Sans/Mono, radii, text sizes) mapped onto VitePress variables (`--vp-c-*`) so the stock theme inherits the brand. Includes the `.dark` overrides for dark mode.
- **`components.css`** — styling for the doc primitives and mock internals: the `.lede` intro paragraph, `.inl` inline code, restyled `::: info / tip / warning` callouts, cards, steps, the mock frame, chat bubbles/citations, role tables, and the FAQ accordion.

## Commands

```bash
corepack pnpm --filter @ragbot/docs dev         # vitepress dev
corepack pnpm --filter @ragbot/docs build       # static build to .vitepress/dist
corepack pnpm --filter @ragbot/docs preview      # preview the built site on :4173
corepack pnpm --filter @ragbot/docs lint         # eslint .
corepack pnpm --filter @ragbot/docs format:fix   # prettier --write .
```

From the repo root: `dev:docs` / `build:docs` / `lint:docs` / `format:docs` run the same via Turborepo.

## Conventions

- VitePress fails the build on dead internal links — keep cross-page links valid.
- Every page has a frontmatter `title` and opens with a `<p class="lede">` paragraph.
- Callouts use native containers (`::: info` / `::: tip` / `::: warning`); they're restyled in `components.css`.
- Mock CSS is namespaced with per-component class prefixes to prevent global bleed.
- `vue/no-v-html` and `vue/multi-word-component-names` are disabled (see `eslint.config.js`) — `Faq` renders HTML answer strings.
- Static content — no unit tests (same as `apps/web`); the build is the gate.

## Config

`.vitepress/config.ts` owns the site shell: `title`, `description`, `cleanUrls: true`, the `nav` and `sidebar` (hand-maintained), `search: { provider: "local" }`, light/dark logos, and `srcExclude` for `AGENTS.md` / `CLAUDE.md` / `README.md` so these internal docs never ship as pages.

## Deployment

- **Local** — runs as its own container via `apps/docs/Dockerfile` (multi-stage: VitePress build → nginx serves `.vitepress/dist`). Wired into `docker-compose.local.yml` as the `docs` service on host port **4173**. nginx uses `try_files $uri $uri.html $uri/` for clean URLs.
- **Production** — same Dockerfile, no published ports; the nginx edge reverse-proxies `docs.${DOMAIN}` to it via `nginx/templates/docs.conf.template`. The wildcard cert already covers the subdomain.
