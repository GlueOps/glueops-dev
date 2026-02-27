# Pattern: Concept/Overview Page

**Use for:** Pages that explain concepts without showing full deployment examples (e.g., overview pages, domain explanations).

```markdown
---
id: <page-id>
title: "<Display Title>"
---

# <Display Title>

<Introduction paragraph>

## <Section 1>

<Content>

## <Section 2>

<Content>

:::info
<Callout for important context>
:::
```

## Notes

- No tabs. May include illustrative YAML snippets to explain concepts, but not full deployment configurations
- Can include tables, diagrams (Mermaid not currently enabled), and links
- Link to related guides using relative paths: `[Basic IngressRoute](./traefik-basic-ingressroute)`
