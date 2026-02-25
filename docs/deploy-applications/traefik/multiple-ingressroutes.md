---
id: traefik-multiple-ingressroutes
title: Multiple IngressRoutes
---

# Multiple IngressRoutes for One App

Create multiple IngressRoutes to expose the same service under different subdomains — for example, an API endpoint and a web frontend endpoint.

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
      name: my-app-api
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`my-app-api.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-web
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`my-app-web.apps.{{ .Values.captain_domain }}`)
          kind: Rule
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
  api-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-api
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`my-app-api.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
  web-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-web
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`my-app-web.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

:::tip
Using `customResourcesMap` here makes it easy to add or remove routes per environment. For example, you could define the API route in `base-values.yaml` and add the web route only in `envs/prod/values.yaml`.
:::

</TabItem>
</Tabs>

## What Gets Created

| Resource | Name | Hostname |
|----------|------|----------|
| IngressRoute | `my-app-api` | `my-app-api.apps.<captain_domain>` |
| IngressRoute | `my-app-web` | `my-app-web.apps.<captain_domain>` |

Both route to the same `my-app-prod` service.

## Verify

```bash
# Both IngressRoutes should exist
kubectl get ingressroutes -n nonprod | grep my-app

# Both hostnames should resolve (after ~2 min for DNS)
curl https://my-app-api.apps.nonprod.jupiter.onglueops.rocks
curl https://my-app-web.apps.nonprod.jupiter.onglueops.rocks
```

## Key Points

- Each IngressRoute must have a **unique `metadata.name`** within the namespace
- Both IngressRoutes need their own `external-dns` annotation so DNS records are created for each hostname
- You can attach different middlewares to each IngressRoute (e.g., rate limiting on the API, different headers on the web route)
