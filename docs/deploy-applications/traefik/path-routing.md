---
id: traefik-path-routing
title: Path-Based Routing
---

# Path-Based Routing with IngressRoute

Route different URL paths to the same or different services using Traefik's `PathPrefix` matcher.

## Prerequisites

**`base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

## Configuration

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-paths
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`) && PathPrefix(`/api`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`) && PathPrefix(`/web`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          priority: 1
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

customResourcesMap:
  ingressroute: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-paths
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`) && PathPrefix(`/api`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`) && PathPrefix(`/web`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          priority: 1
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

</TabItem>
</Tabs>

## How It Works

- **`PathPrefix(`/api`)`** matches any request starting with `/api` (e.g., `/api`, `/api/v1/users`)
- **`PathPrefix(`/web`)`** matches any request starting with `/web`
- The **catch-all route** with `priority: 1` handles all other paths — without this, unmatched paths return a 404
- Traefik evaluates routes by priority (higher = evaluated first). By default, priority is the length of the match rule, so more specific paths naturally match first

:::info
You can route different paths to **different services** by changing the `services[].name` field per route. This is useful for microservice architectures where `/api` goes to a backend and `/` goes to a frontend.
:::

## Verify

```bash
curl https://my-app-prod.apps.CAPTAIN_DOMAIN/api
curl https://my-app-prod.apps.CAPTAIN_DOMAIN/web
curl https://my-app-prod.apps.CAPTAIN_DOMAIN/
```

:::note
The `-prod` suffix matches your environment folder name (`envs/prod/`). If you deploy to a different environment like `envs/uat/`, the suffix changes accordingly (e.g., `my-app-uat`).
:::

The `whoami` response includes the request URL, so you can confirm each path is being received correctly.

## Other Match Rules

Traefik supports many matchers beyond `PathPrefix`:

| Matcher | Example | Description |
|---------|---------|-------------|
| `Host` | `` Host(`example.com`) `` | Match by hostname |
| `PathPrefix` | `` PathPrefix(`/api`) `` | Match URL path prefix |
| `Path` | `` Path(`/exact`) `` | Match exact path |
| `Headers` | `` Headers(`X-Api`, `true`) `` | Match by header |
| `Method` | `` Method(`GET`, `POST`) `` | Match by HTTP method |
| `Query` | `` Query(`debug=true`) `` | Match by query parameter |

Matchers can be combined with `&&` (AND) and `||` (OR):

```yaml
match: Host(`example.com`) && (PathPrefix(`/api`) || PathPrefix(`/v2`))
```
