# AI Agent Instructions — glueops-dev (Docusaurus Documentation)

This project is a Docusaurus v2 documentation site for the GlueOps platform. Docs live in `docs/` and are rendered at `https://docs.glueops.dev`. The sidebar is manually defined in `sidebars.js`.

## Project Structure

```
glueops-dev/
├── docusaurus.config.js          # Site config (routeBasePath: '/')
├── sidebars.js                   # Manual sidebar definition (NOT auto-generated)
├── docs/                         # All documentation pages
│   ├── introduction.md           # Landing page (id: introduction)
│   ├── cluster-domains.md        # Captain domain explanation
│   ├── deploy-applications/      # Developer guides
│   │   ├── traefik/              # Traefik routing guides (13 pages)
│   │   ├── ingress/              # Legacy ingress docs
│   │   └── images/               # Screenshots for hello-world guides
│   └── glueops-platform-administrator/   # Platform admin guides
├── src/                          # React components, CSS, custom pages
├── static/                       # Static assets
└── analytics/                    # Analytics scripts
```

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
