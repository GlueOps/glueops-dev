# Pattern: Multi-App Guide (e.g., Canary)

**Use for:** Guides that involve multiple cooperating apps (e.g., canary v1/v2 + routing config).

```markdown
---
id: traefik-<feature-name>
title: "<Display Title>"
---

# <Display Title>

<Description>

## Architecture

<Explain the multi-app pattern — what each app does>

| App | Purpose | Creates |
|-----|---------|---------|
| `<app-1>` | <Role> | <Resources> |
| `<app-2>` | <Role> | <Resources> |

## Configuration

### Step 1: <First app>

<Config for app 1>

### Step 2: <Second app>

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">
<Config>
</TabItem>
<TabItem value="map" label="customResourcesMap (map)">
<Config>
</TabItem>
</Tabs>

## How It Works

<Explanation>

## Verify

<Verification steps>

## Key Points

- <Points>
```

## Notes

- Each cooperating app needs its own directory under `apps/`
- Cross-app service references must be hardcoded (e.g., `my-app-v1-prod`) since `{{ include "app.name" . }}` resolves to the current app
- The routing app may have no Deployment/Service — it only creates the IngressRoute
- Import `Tabs` and `TabItem` before the first `<Tabs>` element
