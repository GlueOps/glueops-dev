---
id: traefik-canary-cookie
title: Cookie-Based Canary Routing
---

# Cookie-Based Canary Routing

Route traffic between two versions of your application based on a cookie value. This enables testing a new version with specific users before rolling out to everyone.

## Architecture

This pattern uses **three separate apps**:

| App | Purpose | Creates |
|-----|---------|---------|
| `my-app-v1` | Stable version (current code) | Deployment + Service |
| `my-app-v2` | Canary version (new code) | Deployment + Service |
| `my-app-canary` | Routing configuration only | IngressRoute only |

The `my-app-canary` app contains no Deployment — it only creates the IngressRoute that routes between the two backing services.

## Configuration

### Step 1: Create Backing Services

Each backing service is a standard app with a Deployment and Service but **no ingress**.

**`apps/my-app-v1/base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

**`apps/my-app-v1/envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1
  env:
    - name: WHOAMI_NAME
      value: "canary-v1"

service:
  enabled: true
```

Create the same structure for `my-app-v2`, changing `WHOAMI_NAME` to `"canary-v2"`.

### Step 2: Create the Canary Routing App

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

**`apps/my-app-canary/base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

**`apps/my-app-canary/envs/prod/values.yaml`**
```yaml
customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-canary
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`) && HeaderRegexp(`Cookie`, `.*canary=v2.*`)
          kind: Rule
          priority: 100
          services:
            - name: my-app-v2-prod
              namespace: '{{ include "app.namespace" . }}'
              port: 80
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          priority: 10
          services:
            - name: my-app-v1-prod
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`apps/my-app-canary/base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

**`apps/my-app-canary/envs/prod/values.yaml`**
```yaml
customResourcesMap:
  canary-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-canary
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`) && HeaderRegexp(`Cookie`, `.*canary=v2.*`)
          kind: Rule
          priority: 100
          services:
            - name: my-app-v2-prod
              namespace: '{{ include "app.namespace" . }}'
              port: 80
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          priority: 10
          services:
            - name: my-app-v1-prod
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

</TabItem>
</Tabs>

## How It Works

1. **Default route** (priority 10): All traffic goes to `my-app-v1-prod` (stable version)
2. **Canary route** (priority 100): Requests with `canary=v2` in the `Cookie` header go to `my-app-v2-prod` (canary version)
3. Higher priority routes are evaluated first, so the cookie match always takes precedence

## Verify

```bash
# Default traffic → goes to v1 (stable)
curl https://my-app-canary.apps.CAPTAIN_DOMAIN
# Name: canary-v1

# With canary cookie → goes to v2 (canary)
curl -b "canary=v2" https://my-app-canary.apps.CAPTAIN_DOMAIN
# Name: canary-v2
```

## Key Points

- The `HeaderRegexp` matcher checks for the cookie value anywhere in the Cookie header string
- `priority: 100` on the canary route ensures it's evaluated before the default route (`priority: 10`)
- The backing services (`my-app-v1-prod`, `my-app-v2-prod`) must be deployed and healthy before the routing app
- To send all traffic to the canary, simply remove the priority/cookie route and change the default route's service to `my-app-v2-prod`

:::info
**Swapping traffic:** To promote the canary to stable, update the default route's service from `my-app-v1-prod` to `my-app-v2-prod`. No DNS changes needed — only the IngressRoute config changes.
:::

:::tip
You can set the canary cookie in a browser using DevTools: `document.cookie = "canary=v2"`. This lets testers opt into the canary version while everyone else gets the stable version.
:::
