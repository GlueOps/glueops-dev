# Reference — Docusaurus Conventions, Frontmatter & Gotchas

## Frontmatter

Every doc page requires YAML frontmatter at the top:

```yaml
---
id: <unique-doc-id>
title: "<Display Title>"
---
```

### Rules

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ Yes | Unique identifier used in `sidebars.js`. Must be unique across all docs |
| `title` | ✅ Yes | Page title shown in sidebar and browser tab |
| `type` | ❌ Optional | `tutorial`, `explainer`, etc. Informational only, no rendering effect |

### ID Naming Conventions

| Doc Category | ID Pattern | Example |
|-------------|------------|---------|
| Traefik CRD guide | `traefik-<feature>` | `traefik-basic-ingressroute` |
| Traefik middleware guide | `traefik-middleware-<name>` | `traefik-middleware-headers` |
| Traefik Ingress guide | `traefik-standard-ingress` | (single page covers all variants) |
| Traefik TCP guide | `traefik-ingressroutetcp-<variant>` | `traefik-ingressroutetcp-postgres` |
| Traefik overview | `traefik-overview` | |
| Deploy guide | `deploy-<topic>` | `deploy-hello-world-to-glueops` |
| Platform admin | `<descriptive-kebab-case>` | `glueops-deployment-configuration` |
| Top-level | `<short-id>` | `introduction`, `glueops-captain-domain` |

---

## Sidebar Configuration (`sidebars.js`)

The sidebar is **manually defined** — pages are NOT auto-discovered from the filesystem.

### How to add a page

Add the doc reference as `"<path-from-docs>/<frontmatter-id>"`:

```javascript
// In sidebars.js, inside the appropriate items array:
"deploy-applications/traefik/traefik-my-new-page",
```

The format is: `"<directory-path-relative-to-docs>/<id-from-frontmatter>"`

### Sidebar structure

```javascript
main: [
  "introduction",                    // Top-level pages
  "glueops-captain-domain",
  {
    type: "category",
    label: "Developers",             // Developer docs
    items: [
      "<doc-refs>",
      {
        type: "category",
        label: "Traefik Ingress",    // Traefik sub-category
        items: [
          "deploy-applications/traefik/traefik-overview",
          "deploy-applications/traefik/traefik-<page-id>",
          // ... add new Traefik pages here
        ],
        link: { type: "generated-index", ... }
      },
    ],
  },
  {
    type: "category",
    label: "Platform Administrators", // Admin docs
    items: [...],
  },
]
```

### Category links

Categories use `generated-index` links that auto-generate a landing page listing all items:

```javascript
link: {
  type: "generated-index",
  title: "Category Title",
  description: "Category description.",
  slug: "/url-slug",
},
```

---

## Markdown Features

### Admonitions

Docusaurus supports these callout types (from least to most severe):

```markdown
:::note
Supplementary information.
:::

:::tip
Helpful suggestion or best practice.
:::

:::info
Important context or explanation.
:::

:::caution
Something that could cause problems if ignored.
:::

:::warning
Critical information — ignoring this will likely cause failure.
:::
```

### Tabs

Used to show alternative configurations (e.g., `customResources` list vs `customResourcesMap` map):

```markdown
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

Content for tab 1

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

Content for tab 2

</TabItem>
</Tabs>
```

**Rules:**
- `import` statements go in the markdown body, NOT in frontmatter
- Place imports immediately before the first `<Tabs>` usage
- The `value` prop must be unique within each `<Tabs>` group
- Leave a blank line between `<TabItem>` and markdown content
- Leave a blank line before `</TabItem>`

### Code Blocks

````markdown
```yaml
key: value
```

```bash
curl https://my-app-prod.apps.CAPTAIN_DOMAIN
```

```javascript
const x = 1;
```
````

Supported languages: `yaml`, `bash`, `javascript`, `json`, `markdown`, `html`, `css`, `python`, `go`, `dockerfile`, and more (Prism.js).

### Internal Links

Use relative paths with the doc `id` (not the filename):

```markdown
[Basic IngressRoute](./traefik-basic-ingressroute)
[Overview](./traefik-overview)
```

**Rules:**
- Always use `./` prefix for same-directory links
- Use `../` for parent directory references
- Link to the `id`, not the filename (e.g., `./traefik-overview` not `./overview`)
- Broken links cause build failures (`onBrokenLinks: "throw"`)

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
```

### Images

Store in `docs/deploy-applications/images/` (or a relevant subdirectory) and reference with relative paths:

```markdown
![Alt text](./images/screenshot.png)
```

---

## Page Structure Conventions

### Traefik Guide Pages

All Traefik guide pages follow this structure:

1. **H1 title** — matches the frontmatter `title`
2. **Intro paragraph** — one sentence describing the feature
3. **Prerequisites** — `base/base-values.yaml` code block
4. **Configuration** — tabbed `customResources` (list) vs `customResourcesMap` (map) examples
5. **What Gets Created** or **How It Works** — table or bullet list
6. **Verify** — `curl` commands (do not use `kubectl` — platform users do not have kubectl access; for certificate or TCP apps, mention the ArgoCD dashboard for resource status)
7. **Key Points** — bullet list of important takeaways
8. **Admonitions** — `:::info`, `:::caution`, `:::warning` at the end

### Overview/Concept Pages

1. **H1 title**
2. **Intro paragraph**
3. **Concept sections** (H2)
4. **Guides list** — links to all related guide pages

### Tutorial Pages

1. **H1 title**
2. **Prerequisites**
3. **Numbered steps** (H2: "Step 1:", "Step 2:", etc.)
4. **Verify**

---

## Helm Template Expressions in Docs

When showing Helm values in code blocks, use the same template expressions used in the actual deployment configs:

| Expression | Resolves To | Example |
|-----------|-------------|---------|
| `{{ .Values.captain_domain }}` | Cluster domain | `my-cluster.my-tenant.onglueops.com` |
| `{{ include "app.name" . }}` | ArgoCD app name | `traefik-basic-prod` |
| `{{ include "app.namespace" . }}` | Target namespace | `nonprod` |

In verification/curl examples, use the `CAPTAIN_DOMAIN` sentinel (not template expressions or hardcoded domains):

```bash
# ✅ Use the CAPTAIN_DOMAIN sentinel — replaced dynamically for the reader
curl https://my-app-prod.apps.CAPTAIN_DOMAIN

# ❌ Don't hardcode a specific cluster domain
curl https://my-app-prod.apps.my-cluster.my-tenant.onglueops.com

# ❌ Don't use Helm template expressions outside of Helm YAML
curl https://{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}
```

## Captain Domain — Dynamic Domain Replacement

The site replaces domain references dynamically so readers see their own cluster domain. There are **three patterns** depending on context:

| Pattern | Where to use | Handled by |
|---------|--------------|-----------|
| `CAPTAIN_DOMAIN` | Inside code fences (` ``` `) | Swizzled `CodeBlock` component — replaces at render time |
| `<CaptainDomain />` | Inline prose / paragraph text (non-URL domain names) | MDX component — renders current domain as styled text |
| `<CaptainDomainLink to="https://sub.{domain}" />` | `https://` URLs in prose that readers should visit | `CaptainDomainLink` component — clickable link when domain is customized, styled text with tooltip when default |
| `{{ .Values.captain_domain }}` | Helm template YAML inside code fences | Not replaced — displayed as-is (real Helm expression) |

### Rules

1. **Code fences** — write `CAPTAIN_DOMAIN` as a literal sentinel. The swizzled CodeBlock replaces every occurrence with the reader's domain.
2. **Prose text (non-URL domain names)** — use `<CaptainDomain />` for bare domain names that are not clickable URLs. Files using this component **must** have a `.mdx` extension. Standard Docusaurus components like `<Tabs>` and `<TabItem>` work in `.md` files — only custom JSX components like `<CaptainDomain />` require `.mdx`.
3. **Prose text (clickable URLs)** — use `<CaptainDomainLink to="https://sub.{domain}/path" />` for any `https://` URL the reader should visit. The `to` prop uses `{domain}` as a placeholder. Optional `children` override the link text (e.g., `<CaptainDomainLink to="https://argocd.{domain}">ArgoCD dashboard</CaptainDomainLink>`). When the reader has set their domain, it renders as a clickable link opening in a new tab. When using the default domain, it renders as styled text with a tooltip prompting them to set their domain. Requires `.mdx` extension.
4. **Helm YAML in code fences** — use `{{ .Values.captain_domain }}`. This is the actual Helm expression and is intentionally left as-is.
5. **Never hardcode** a specific domain like `my-cluster.my-tenant.onglueops.com` in docs. Use the appropriate pattern above.

### Examples

**In a code fence (verification command):**

````markdown
```bash
curl https://my-app.apps.CAPTAIN_DOMAIN
```
````

**In prose — bare domain name (`.mdx` file):**

```markdown
Your app will be available at `https://my-app.apps.`<CaptainDomain />.
```

**Clickable URL in prose (`.mdx` file):**

```markdown
Visit <CaptainDomainLink to="https://cluster-info.{domain}" /> to see your cluster info.

Or with custom text: <CaptainDomainLink to="https://argocd.{domain}">ArgoCD dashboard</CaptainDomainLink>
```

**In Helm template YAML (code fence):**

````markdown
```yaml
spec:
  routes:
    - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
```
````

---

## Gotchas

### 1. Sidebar requires manual updates

New pages are **never** auto-discovered. If you create a page without adding it to `sidebars.js`, it won't appear in the sidebar (but will be accessible by direct URL).

### 2. Imports must be in markdown body

`import Tabs from '@theme/Tabs'` must appear in the markdown body, not in frontmatter. Place it right before the first `<Tabs>` usage.

### 3. Blank lines around JSX components

Docusaurus MDX requires blank lines before and after `<Tabs>`, `<TabItem>`, and other JSX components. Without them, markdown inside the component won't be rendered correctly.

### 4. Frontmatter `id` must match sidebar reference

The `id` in frontmatter must exactly match what's referenced in `sidebars.js` (minus the directory path prefix). For example:
- Frontmatter: `id: traefik-basic-ingressroute`
- Sidebar: `"deploy-applications/traefik/traefik-basic-ingressroute"`

### 5. Overview page guides list

When adding a new Traefik guide, also add a link in `docs/deploy-applications/traefik/overview.md` under the "Guides" section.

### 6. Build breaks on broken links

The site config has `onBrokenLinks: "throw"`. Any internal link that doesn't resolve to a valid doc `id` will break the build. Always verify link targets exist.

### 7. Code blocks inside tabs need blank lines

Inside `<TabItem>`, leave a blank line before and after code blocks:

```markdown
<TabItem value="list" label="customResources (list)">

**`envs/prod/values.yaml`**
~~~yaml
key: value
~~~

</TabItem>
```
