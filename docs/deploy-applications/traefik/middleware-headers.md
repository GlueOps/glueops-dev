---
id: traefik-middleware-headers
title: "Middleware: Security Headers"
---

# Middleware: Security Headers

Add security headers (CORS, HSTS, X-Frame-Options, etc.) to all responses using a Traefik `headers` Middleware.

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
    kind: Middleware
    metadata:
      name: security-headers
    spec:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        customResponseHeaders:
          X-Custom-Header: "glueops-traefik"
        accessControlAllowOriginList:
          - "https://example.com"
        accessControlAllowMethods:
          - "GET"
          - "POST"
          - "OPTIONS"
        accessControlAllowHeaders:
          - "Content-Type"
          - "Authorization"
        accessControlMaxAge: 86400
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-headers
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
            - name: security-headers
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
  middleware: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: security-headers
    spec:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        customResponseHeaders:
          X-Custom-Header: "glueops-traefik"
        accessControlAllowOriginList:
          - "https://example.com"
        accessControlAllowMethods:
          - "GET"
          - "POST"
          - "OPTIONS"
        accessControlAllowHeaders:
          - "Content-Type"
          - "Authorization"
        accessControlMaxAge: 86400
  ingressroute: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-headers
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
            - name: security-headers
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

:::tip
With `customResourcesMap`, you can define the middleware in `base-values.yaml` (shared across environments) and the IngressRoute in `envs/prod/values.yaml` (environment-specific hostname).
:::

</TabItem>
</Tabs>

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| Middleware | `security-headers` | Adds security response headers |
| IngressRoute | `my-app-headers` | Routes traffic through the middleware |

## Verify

```bash
# Check the middleware exists
kubectl get middlewares -n nonprod | grep security-headers

# Check response headers
curl -I https://my-app.apps.CAPTAIN_DOMAIN
```

Expected response headers:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Custom-Header: glueops-traefik
Access-Control-Allow-Origin: https://example.com
```

## Available Header Options

| Option | Description | Example |
|--------|-------------|---------|
| `frameDeny` | Sets `X-Frame-Options: DENY` | `true` |
| `contentTypeNosniff` | Sets `X-Content-Type-Options: nosniff` | `true` |
| `browserXssFilter` | Sets `X-XSS-Protection: 1; mode=block` | `true` |
| `stsSeconds` | Sets `Strict-Transport-Security` max-age | `31536000` |
| `stsIncludeSubdomains` | Adds `includeSubDomains` to HSTS | `true` |
| `stsPreload` | Adds `preload` to HSTS | `true` |
| `customResponseHeaders` | Add/override any response header | `X-My-Header: value` |
| `accessControlAllowOriginList` | CORS allowed origins | `["https://example.com"]` |
| `accessControlAllowMethods` | CORS allowed methods | `["GET", "POST"]` |
| `accessControlAllowHeaders` | CORS allowed headers | `["Content-Type"]` |
| `accessControlMaxAge` | CORS preflight cache duration (seconds) | `86400` |

For the full list, see the [Traefik headers middleware documentation](https://doc.traefik.io/traefik/middlewares/http/headers/).
