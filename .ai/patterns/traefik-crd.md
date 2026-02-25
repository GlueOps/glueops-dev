# Pattern: Traefik IngressRoute Guide (CRD)

**Use for:** Traefik guides that demonstrate a CRD-based feature (IngressRoute, Middleware, TLSOption, etc.). This is the most common pattern.

```markdown
---
id: traefik-<feature-name>
title: "<Display Title>"
---

# <Display Title>

<One-sentence description of what this guide demonstrates.>

## Prerequisites

**`base/base-values.yaml`**
~~~yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
~~~

## Configuration

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="list" label="customResources (list)">

**`envs/prod/values.yaml`**
~~~yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: <CRD-Kind>
    metadata:
      name: <resource-name>
    spec:
      <resource-spec>
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: <app-name>
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          middlewares:
            - name: <resource-name>
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
~~~

</TabItem>
<TabItem value="map" label="customResourcesMap (map)">

**`envs/prod/values.yaml`**
~~~yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

customResourcesMap:
  <resource-key>: |
    apiVersion: traefik.io/v1alpha1
    kind: <CRD-Kind>
    metadata:
      name: <resource-name>
    spec:
      <resource-spec>
  ingressroute: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: <app-name>
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          middlewares:
            - name: <resource-name>
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
~~~

</TabItem>
</Tabs>

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| Deployment | `<app-name>-prod` | Runs the application pods |
| Service | `<app-name>-prod` | ClusterIP service for internal routing |
| <CRD-Kind> | `<resource-name>` | <Purpose> |
| IngressRoute | `<app-name>` | Routes external traffic through the middleware |

## Verify

~~~bash
# Check the resources
kubectl get <crd-plural> -n nonprod | grep <resource-name>
kubectl get ingressroutes -n nonprod | grep <app-name>

# Test (CAPTAIN_DOMAIN is replaced dynamically with the reader's domain)
curl https://<app-name>.apps.CAPTAIN_DOMAIN
~~~

## Key Points

- <Key point 1>
- <Key point 2>
- <Key point 3>

:::info
<Optional informational callout>
:::
```

## Notes

- Always include both `customResources` (list) and `customResourcesMap` (map) tabs
- Import `Tabs` and `TabItem` before the first `<Tabs>` element — imports must appear in the markdown body, not in frontmatter
- The `customResourcesMap` variant should use descriptive keys (e.g., `middleware`, `ingressroute`, `tls-options`)
- Service references always use `'{{ include "app.name" . }}'` and `'{{ include "app.namespace" . }}'`
