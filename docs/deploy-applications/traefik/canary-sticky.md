---
id: traefik-canary-sticky
title: "Canary Routing with Sticky Sessions"
---

# Canary Routing with Sticky Sessions

Combine cookie-based canary routing with sticky sessions so that users are both routed to the correct version **and** pinned to a specific pod within that version. This is useful when canary backends run multiple replicas and maintain in-memory state.

## Architecture

This pattern extends the [Cookie-Based Canary Routing](./traefik-canary-cookie) setup by adding `sticky.cookie` to both service references:

| App | Purpose | Creates |
|-----|---------|---------|
| `my-app-v1` | Stable version (current code) | Deployment + Service |
| `my-app-v2` | Canary version (new code) | Deployment + Service |
| `my-app-canary-sticky` | Routing configuration only | IngressRoute with sticky sessions |

The `my-app-canary-sticky` app contains no Deployment — it only creates the IngressRoute that routes between the two backing services with pod affinity.

## Configuration

### Step 1: Create Backing Services

Use the same backing services as the [canary routing example](./traefik-canary-cookie). Each is a standard app with a Deployment and Service but **no ingress**.

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
  replicas: 2
  envVariables:
    - name: WHOAMI_NAME
      value: "canary-v1"

service:
  enabled: true
```

Create the same structure for `my-app-v2`, changing `WHOAMI_NAME` to `"canary-v2"`.

### Step 2: Create the Canary Sticky Routing App

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

**`apps/my-app-canary-sticky/base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

**`apps/my-app-canary-sticky/envs/prod/values.yaml`**
```yaml
customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-canary-sticky
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
              sticky:
                cookie:
                  name: my-sticky-cookie
                  maxAge: 3600
                  secure: true
                  httpOnly: true
                  sameSite: none
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          priority: 10
          services:
            - name: my-app-v1-prod
              namespace: '{{ include "app.namespace" . }}'
              port: 80
              sticky:
                cookie:
                  name: my-sticky-cookie
                  maxAge: 3600
                  secure: true
                  httpOnly: true
                  sameSite: none
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`apps/my-app-canary-sticky/base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

**`apps/my-app-canary-sticky/envs/prod/values.yaml`**
```yaml
customResourcesMap:
  canary-sticky-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-canary-sticky
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
              sticky:
                cookie:
                  name: my-sticky-cookie
                  maxAge: 3600
                  secure: true
                  httpOnly: true
                  sameSite: none
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          priority: 10
          services:
            - name: my-app-v1-prod
              namespace: '{{ include "app.namespace" . }}'
              port: 80
              sticky:
                cookie:
                  name: my-sticky-cookie
                  maxAge: 3600
                  secure: true
                  httpOnly: true
                  sameSite: none
```

</TabItem>
</Tabs>

## How It Works

Two cookie mechanisms work together, each serving a different purpose:

| Cookie | Purpose | Set by |
|--------|---------|--------|
| `canary=v2` | Selects which version (v1 or v2) receives the request | The user/tester (manually or via application logic) |
| `my-sticky-cookie` | Pins the user to a specific pod within the selected version | Traefik (automatically, via `Set-Cookie` response header) |

1. **Default route** (priority 10): All traffic without the `canary=v2` cookie goes to `my-app-v1-prod` (stable), with sticky affinity to a specific v1 pod
2. **Canary route** (priority 100): Requests with `canary=v2` in the `Cookie` header go to `my-app-v2-prod` (canary), with sticky affinity to a specific v2 pod
3. The sticky cookie ensures that once a user is assigned to a pod, they keep hitting that same pod on subsequent requests

## Verify

```bash
# Default traffic → v1 (stable) with sticky cookie
curl -v https://my-app-canary-sticky-prod.apps.CAPTAIN_DOMAIN 2>&1 | grep -iE "(Name:|Set-Cookie)"
# Name: canary-v1
# Set-Cookie: my-sticky-cookie=<hash>; ... Secure; HttpOnly; SameSite=None

# With canary cookie → v2 (canary) with sticky cookie
curl -v -b "canary=v2" https://my-app-canary-sticky-prod.apps.CAPTAIN_DOMAIN 2>&1 | grep -iE "(Name:|Set-Cookie)"
# Name: canary-v2
# Set-Cookie: my-sticky-cookie=<hash>; ... Secure; HttpOnly; SameSite=None

# Repeated requests with the sticky cookie go to the same pod
curl -b "my-sticky-cookie=<hash>" https://my-app-canary-sticky-prod.apps.CAPTAIN_DOMAIN
# Hostname: <same-pod-name-each-time>
```

:::note
The `-prod` suffix matches your environment folder name (`envs/prod/`). If you deploy to a different environment like `envs/uat/`, the suffix changes accordingly (e.g., `my-app-canary-sticky-uat`).
:::

## Key Points

- The **canary cookie** (`canary=v2`) and **sticky cookie** (`my-sticky-cookie`) are orthogonal — one selects the version, the other pins to a pod
- Both service references include `sticky.cookie`, so affinity works regardless of which version is selected
- The backing services (`my-app-v1-prod`, `my-app-v2-prod`) must be deployed and healthy before the routing app
- Cross-app service names are hardcoded because `{{ include "app.name" . }}` resolves to the routing app's name, not the backend's
- To observe sticky behavior, the backing services need `replicas > 1`

:::info
**Cookie independence:** Switching from v1 to v2 (by setting `canary=v2`) generates a **new** sticky cookie for the v2 backend. The old sticky cookie for v1 is not reused — each route's sticky cookie tracks affinity independently.
:::

:::tip
You can set the canary cookie in a browser using DevTools: `document.cookie = "canary=v2"`. This lets testers opt into the canary version while keeping their sticky session within that version.
:::
