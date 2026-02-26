---
id: traefik-overview
title: "Traefik Ingress: Overview & Concepts"
---

# Traefik Ingress: Overview & Concepts

This section covers how to expose your applications to the internet using [Traefik](https://traefik.io/) as your ingress controller. All examples use the **`public-traefik`** IngressClass.

## Two Approaches to Routing

There are two ways to configure routing with Traefik on the GlueOps platform:

### 1. Standard Kubernetes Ingress

Use the Helm chart's built-in `ingress` configuration to create a standard `networking.k8s.io/v1` Ingress resource. This is the simplest approach for basic hostname-to-service routing.

```yaml
ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'
```

See [Standard Kubernetes Ingress](./traefik-standard-ingress) for full examples.

### 2. Traefik IngressRoute (CRD)

Use `customResources` or `customResourcesMap` in your Helm values to create Traefik-native `IngressRoute` CRDs. This unlocks advanced features like middleware chains, priority-based routing, canary deployments, and TLS options.

```yaml
customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app
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
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

See [Basic IngressRoute](./traefik-basic-ingressroute) for a working example.

## `customResources` vs `customResourcesMap`

The Helm chart provides two keys for creating arbitrary Kubernetes resources:

### `customResources` (List)

A YAML list of resource templates. Simple and direct.

```yaml
customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    ...
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    ...
```

:::caution
**Lists are fully replaced during Helm values merging.** If you define `customResources` in both `base-values.yaml` and `envs/prod/values.yaml`, only the env-specific list survives — the base list is discarded entirely.
:::

### `customResourcesMap` (Map)

A YAML map of resource templates with arbitrary keys. Keys are merged across value files.

```yaml
customResourcesMap:
  my-middleware: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    ...
  my-ingressroute: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    ...
```

:::info
**Maps are deep-merged across value files.** You can define shared resources in `base-values.yaml` and add environment-specific resources in `envs/prod/values.yaml` — both will be rendered. This is the recommended approach when you need resources split across multiple value files.
:::

### When to Use Which

| Scenario | Recommended |
|----------|-------------|
| All resources defined in a single values file | Either works — `customResources` is simpler |
| Shared resources in base + env-specific resources | Use `customResourcesMap` |
| Need to override a resource per environment | Use `customResourcesMap` (same key overwrites) |
| Dynamic resource generation with `range` | Either works |

## DNS and External DNS

When creating IngressRoute resources, you must add two annotations for DNS to work:

```yaml
annotations:
  kubernetes.io/ingress.class: public-traefik
  external-dns.alpha.kubernetes.io/target: public-v2.{{ .Values.captain_domain }}
```

- **`kubernetes.io/ingress.class`** — Tells Traefik which instance should handle this IngressRoute.
- **`external-dns.alpha.kubernetes.io/target`** — Tells external-dns to create a DNS record pointing to the public Traefik load balancer.

:::note
For **standard Kubernetes Ingress** objects, these annotations are not needed — the `ingressClassName: public-traefik` field handles controller selection, and external-dns automatically discovers hostnames from the Ingress spec.
:::

After creating or updating an IngressRoute, DNS propagation typically takes **~2 minutes** for external-dns to create the record.

## Service Naming Convention

ArgoCD names each application as `<app-folder>-<env-folder>`. The Helm chart uses the ArgoCD app name as the service name. So for an app in `apps/my-app/envs/prod/`, the Kubernetes Service name will be **`my-app-prod`**.

When referencing services in IngressRoute resources, always use this full name including the environment suffix:

```yaml
services:
  - name: '{{ include "app.name" . }}'        # resolves to <app-folder>-<env-folder>
    namespace: '{{ include "app.namespace" . }}'
    port: 80
```

## EntryPoints

The public Traefik instance exposes two entrypoints:

| EntryPoint | Port | Protocol |
|-----------|------|----------|
| `web` | 80 | HTTP |
| `websecure` | 443 | HTTPS |

Most IngressRoutes should listen on both:

```yaml
spec:
  entryPoints:
    - web
    - websecure
```

## Available Traefik CRDs

| CRD | Purpose |
|-----|---------|
| `IngressRoute` | HTTP/HTTPS routing rules |
| `IngressRouteTCP` | TCP routing rules |
| `Middleware` | Request/response transformations (headers, auth, rate limiting, etc.) |
| `TLSOption` | TLS version and cipher configuration |
| `TraefikService` | Advanced service features (weighted, mirroring) |
| `ServersTransport` | Backend connection configuration |

## Guides

- [Standard Kubernetes Ingress](./traefik-standard-ingress) — Basic ingress, sticky sessions, paths, multi-host, middleware reference, TLS
- [Basic IngressRoute](./traefik-basic-ingressroute) — Simplest IngressRoute
- [Path-Based Routing](./traefik-path-routing) — PathPrefix match rules
- [Multiple IngressRoutes](./traefik-multiple-ingressroutes) — Multiple subdomains for one app
- [Middleware: Security Headers](./traefik-middleware-headers) — CORS, HSTS, X-Frame-Options
- [Middleware: IP Allow List](./traefik-middleware-ip-allowlist) — Restrict access by IP/CIDR
- [Middleware: Rate Limiting](./traefik-middleware-ratelimit) — Request rate limits
- [Middleware: Basic Auth](./traefik-middleware-basicauth) — HTTP basic authentication
- [Cookie-Based Canary Routing](./traefik-canary-cookie) — Route traffic by cookie
- [Sticky Sessions (IngressRoute)](./traefik-sticky-ingressroute) — Cookie-based session affinity via IngressRoute CRD
- [Canary with Sticky Sessions](./traefik-canary-sticky) — Canary routing combined with pod affinity
- [TLS & HTTPS Redirect](./traefik-tls-redirect) — Force HTTPS + TLS version enforcement
- [Let's Encrypt Certificates (IngressRoute)](./traefik-letsencrypt) — HTTP-01 cert issuance with cert-manager + IngressRoute
- [Let's Encrypt Certificates (Standard Ingress)](./traefik-ingress-letsencrypt) — HTTP-01 cert issuance with cert-manager annotation
- [IngressRouteTCP](./traefik-ingressroutetcp) — TCP pass-through routing
- [IngressRouteTCP: PostgreSQL](./traefik-ingressroutetcp-postgres) — TCP routing with TLS termination + ALPN
