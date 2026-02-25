---
id: traefik-tls-redirect
title: TLS & HTTPS Redirect
---

# TLS & HTTPS Redirect

Force all HTTP traffic to redirect to HTTPS and configure TLS version enforcement using Traefik's `redirectScheme` Middleware and `TLSOption` CRDs.

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
      name: https-redirect
    spec:
      redirectScheme:
        scheme: https
        permanent: true
  - |
    apiVersion: traefik.io/v1alpha1
    kind: TLSOption
    metadata:
      name: tls-strict
    spec:
      minVersion: VersionTLS12
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-http
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          middlewares:
            - name: https-redirect
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-https
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
      tls:
        options:
          name: tls-strict
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
  redirect-middleware: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: https-redirect
    spec:
      redirectScheme:
        scheme: https
        permanent: true
  tls-options: |
    apiVersion: traefik.io/v1alpha1
    kind: TLSOption
    metadata:
      name: tls-strict
    spec:
      minVersion: VersionTLS12
  http-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-http
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - web
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          middlewares:
            - name: https-redirect
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
  https-route: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-https
      annotations:
        kubernetes.io/ingress.class: public-traefik
        external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
    spec:
      entryPoints:
        - websecure
      routes:
        - match: Host(`{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}`)
          kind: Rule
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
      tls:
        options:
          name: tls-strict
```

</TabItem>
</Tabs>

## How It Works

Two IngressRoutes handle the two entrypoints:

| IngressRoute | EntryPoint | Behavior |
|-------------|------------|----------|
| `my-app-http` | `web` (port 80) | Applies `https-redirect` middleware → 301 redirect to HTTPS |
| `my-app-https` | `websecure` (port 443) | Serves the app with TLS options enforced |

The `TLSOption` resource enforces:
- **`minVersion: VersionTLS12`** — Rejects connections using TLS 1.0 or 1.1

## Verify

```bash
# HTTP → should redirect to HTTPS (301)
curl -v http://my-app.apps.CAPTAIN_DOMAIN 2>&1 | grep -i location
# Location: https://my-app.apps.CAPTAIN_DOMAIN/

# HTTPS → should serve the app
curl https://my-app.apps.CAPTAIN_DOMAIN

# Test TLS version enforcement (TLS 1.1 should fail)
curl --tls-max 1.1 https://my-app.apps.CAPTAIN_DOMAIN
# Should fail with an SSL error
```

## Available TLS Versions

| Value | TLS Version |
|-------|-------------|
| `VersionTLS10` | TLS 1.0 |
| `VersionTLS11` | TLS 1.1 |
| `VersionTLS12` | TLS 1.2 |
| `VersionTLS13` | TLS 1.3 |

:::info
For most applications, `VersionTLS12` is the recommended minimum. Set `VersionTLS13` if you only need to support modern clients.
:::

## Key Points

- The `permanent: true` flag sends a **301 Moved Permanently** redirect. Use `permanent: false` for a **302 Found** (temporary) redirect
- Both IngressRoutes need the `external-dns` annotation since DNS needs to resolve for both HTTP and HTTPS endpoints
- The `tls.options.name` in the HTTPS IngressRoute references the `TLSOption` resource by name
