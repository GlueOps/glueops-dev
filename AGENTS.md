# AI Agent Instructions — glueops-dev (Docusaurus Documentation)

This project is a Docusaurus v2 documentation site for the GlueOps platform. Docs live in `docs/` and are rendered at `https://docs.glueops.dev`. The sidebar is manually defined in `sidebars.js`.

## Project Structure

```
glueops-dev/
├── Dockerfile                    # Multi-stage production build (static HTML via nginx)
├── Dockerfile.dev                # Development build (Docusaurus dev server with live reload)
├── nginx.conf                    # Nginx config for the production container
├── .dockerignore                 # Docker build context exclusions
├── docusaurus.config.js          # Site config (routeBasePath: '/')
├── sidebars.js                   # Manual sidebar definition (NOT auto-generated)
├── docs/                         # All documentation pages
│   ├── introduction.md           # Landing page (id: introduction)
│   ├── cluster-domains.mdx        # Captain domain explanation
│   ├── deploy-applications/      # Developer guides
│   │   ├── traefik/              # Traefik routing guides (13 pages)
│   │   ├── ingress/              # Legacy ingress docs
│   │   └── images/               # Screenshots for hello-world guides
│   └── glueops-platform-administrator/   # Platform admin guides
├── src/                          # React components, CSS, custom pages
├── static/                       # Static assets
└── analytics/                    # Analytics scripts
```

## Docker

There are two Dockerfiles for different purposes. Both expose port 80.

| File | Purpose | Base Image | Output |
|------|---------|------------|--------|
| `Dockerfile` | Production | `node:24-slim` (build) → `nginx:alpine-slim` (serve) | Static HTML served by nginx |
| `Dockerfile.dev` | Development | `node:24-slim` | Docusaurus dev server with live reload |

- **`Dockerfile`** — Multi-stage build. Stage 1 installs dependencies and runs `yarn build` to produce static HTML. Stage 2 copies the output into an nginx container with `nginx.conf` for serving. This is what CI builds and deploys.
- **`Dockerfile.dev`** — Single-stage build. Runs the Docusaurus dev server (`yarn start`) for local development with hot module reloading. Mount your source code as a volume for live reload.
- **`nginx.conf`** — Nginx server config used by the production container. Includes `try_files` fallback for client-side routing, gzip compression, and static asset caching.

## Adding a New Documentation Page — Checklist

### 1. Read required files first

Before creating or modifying any doc page, you **must** read:

1. **`.ai/patterns/`** — pick the skeleton that matches your doc type:
   - `traefik-crd.md` — IngressRoute/Middleware/TLSOption guides (most common)
   - `standard-ingress.md` — Standard Kubernetes Ingress guides
   - `overview.md` — Concept/overview pages
   - `multi-app.md` — Multi-app guides (e.g., canary routing)
   - `general.md` — Non-Traefik deployment tutorials
2. **`.ai/reference.md`** — contains frontmatter rules, admonition syntax, sidebar conventions, and gotchas
3. **`sidebars.js`** — the manual sidebar config you must update

### 2. Create the markdown file

- Place the file in the appropriate `docs/` subdirectory
- Use the correct frontmatter (see `.ai/reference.md` for rules)
- Follow the page structure from the matching `.ai/patterns/` skeleton

### 3. Update `sidebars.js`

The sidebar is **manually defined** — new pages are NOT auto-discovered. You must add the doc `id` (prefixed with its relative path from `docs/`) to the correct position in `sidebars.js`.

**Format:** `"<folder-path>/<doc-id>"` — e.g., `"deploy-applications/traefik/traefik-basic-ingressroute"`

### 4. Update parent/overview pages

If the new page belongs to a section with an overview page (e.g., `docs/deploy-applications/traefik/overview.md`), add a link to the new page in the overview's "Guides" list.

### 5. Verify

- Confirm frontmatter `id` matches what's referenced in `sidebars.js`
- Confirm all internal links use relative paths (e.g., `./traefik-basic-ingressroute`)
- Confirm admonitions use valid types: `:::note`, `:::info`, `:::tip`, `:::caution`, `:::warning`
- Confirm `import Tabs` and `import TabItem` are present if using `<Tabs>` components

## Documentation Categories

| Category | Path | Sidebar Section | Description |
|----------|------|-----------------|-------------|
| Traefik guides | `docs/deploy-applications/traefik/` | Developers → Traefik Ingress | Routing, middleware, TLS, TCP examples |
| Deploy guides | `docs/deploy-applications/` | Developers | Hello world, app deployment basics |
| Platform admin | `docs/glueops-platform-administrator/` | Platform Administrators | Cluster setup, GitHub config |
| Top-level | `docs/` | Root sidebar | Introduction, captain domains |

## Key Conventions

- **Dark mode default** — the site defaults to dark mode (`colorMode.defaultMode: "dark"`)
- **No trailing slashes** — `trailingSlash: false`
- **Docs at root** — `routeBasePath: '/'` means docs are served from `/`, not `/docs/`
- **Edit links** — each page gets an "Edit this page" link pointing to the GitHub repo
- **Broken links throw** — `onBrokenLinks: "throw"`, so invalid internal links will break the build

## Captain Domain Feature

The site has a dynamic domain replacement feature that lets readers type their cluster domain into a navbar input, which automatically updates all domain references across the docs. The default domain is `nonprod.antoniostacos.onglueops.com`.

### Architecture

| Layer | File | Purpose |
|-------|------|---------|
| React Context | `src/contexts/CaptainDomainContext.tsx` | Stores domain in state + `localStorage` (key: `glueops_captain_domain`) |
| Provider | `src/theme/Root.tsx` | Wraps the entire app with `CaptainDomainProvider` |
| Navbar Input | `src/theme/NavbarItem/CaptainDomainInput.tsx` | Text input widget in the navbar |
| Navbar Registration | `src/theme/NavbarItem/ComponentTypes.tsx` | Registers `custom-captainDomainInput` navbar item type |
| CodeBlock Swizzle | `src/theme/CodeBlock/index.tsx` | Replaces `CAPTAIN_DOMAIN` sentinel in code fences |
| MDX Component | `src/theme/MDXComponents.tsx` | Exports `<CaptainDomain />` for prose usage |
| Styles | `src/css/custom.css` | Styles for navbar widget and inline component |

### Three Domain Reference Patterns

| Pattern | Where to use | How it works |
|---------|--------------|--------------|
| `CAPTAIN_DOMAIN` | Inside code fences (` ``` `) | CodeBlock swizzle replaces it reactively |
| `<CaptainDomain />` | Inline prose text | MDX component renders the current domain |
| `{{ .Values.captain_domain }}` | Helm template YAML in code fences | Shown as-is (not replaced) — it's a real Helm expression |

### File Extension Rule

Any doc file that uses the `<CaptainDomain />` JSX component **must** use the `.mdx` extension (not `.md`). Plain `.md` files cannot render JSX components. Standard Docusaurus components like `<Tabs>` and `<TabItem>` work in `.md` files — only custom JSX components like `<CaptainDomain />` require `.mdx`.

### Writing Guidelines

- **Code fences:** Write `CAPTAIN_DOMAIN` as a raw sentinel. The swizzled CodeBlock replaces it with the user's domain automatically.
- **Prose text:** Use `<CaptainDomain />`. Example: `Navigate to <CaptainDomain /> in your browser.`
- **Helm templates:** Use `{{ .Values.captain_domain }}` — this is a real Helm expression and must not be replaced.
- **Never hardcode** a specific cluster domain (e.g., `my-cluster.my-tenant.onglueops.com`) in documentation prose or code fences. Use one of the three patterns above instead.
