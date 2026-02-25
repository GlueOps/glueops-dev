---
id: traefik-standard-ingress
title: Standard Kubernetes Ingress
---

# Standard Kubernetes Ingress with Traefik

The simplest way to expose your application is using a standard Kubernetes `Ingress` resource with `ingressClassName: public-traefik`. This uses the Helm chart's built-in `ingress` configuration — no `customResources` needed.

## Basic Hostname Routing

Route all traffic for a hostname to your service.

**`base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'
```

### Verify

```bash
kubectl get ingress -n nonprod | grep my-app
curl https://my-app.apps.nonprod.jupiter.onglueops.rocks
```

---

## Sticky Sessions

Pin a user to the same backend pod using cookies. Useful when running multiple replicas and your app maintains session state.

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 2

service:
  enabled: true
  annotations:
    traefik.ingress.kubernetes.io/service.sticky.cookie: "true"
    traefik.ingress.kubernetes.io/service.sticky.cookie.name: "my-sticky-cookie"
    traefik.ingress.kubernetes.io/service.sticky.cookie.maxage: "3600"

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'
```

### Verify

```bash
# First request sets a cookie
curl -v https://my-app-sticky.apps.nonprod.jupiter.onglueops.rocks 2>&1 | grep Set-Cookie
# Output should include: Set-Cookie: my-sticky-cookie=<hash>; ...

# Subsequent requests with the cookie go to the same pod
curl -b "my-sticky-cookie=<hash>" https://my-app-sticky.apps.nonprod.jupiter.onglueops.rocks
```

---

## Path-Based Routing

Route different URL paths to the same (or different) services.

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'
          paths:
            - path: /api
              pathType: Prefix
            - path: /health
              pathType: Prefix
```

:::info
When you specify explicit paths, only those paths will be routed. Requests to other paths (e.g., `/`) will return a 404. To add a catch-all, add a path entry with `path: /`.
:::

### Verify

```bash
curl https://my-app-paths.apps.nonprod.jupiter.onglueops.rocks/api
curl https://my-app-paths.apps.nonprod.jupiter.onglueops.rocks/health
```

---

## Multiple Hostnames

Serve the same application from multiple domain names.

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

ingress:
  enabled: true
  ingressClassName: public-traefik
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'
        - hostname: my-app-alt.apps.{{ .Values.captain_domain }}
```

### Verify

```bash
# Both hostnames route to the same service
curl https://my-app.apps.nonprod.jupiter.onglueops.rocks
curl https://my-app-alt.apps.nonprod.jupiter.onglueops.rocks
```

---

## Referencing Traefik Middleware from a Standard Ingress

You can use standard `Ingress` for routing while attaching Traefik `Middleware` CRDs via annotations. The middleware is created via `customResources` and referenced using the `traefik.ingress.kubernetes.io/router.middlewares` annotation.

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

ingress:
  enabled: true
  ingressClassName: public-traefik
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: nonprod-my-headers-mw@kubernetescrd
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: my-headers-mw
    spec:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
```

:::caution
The middleware reference format is **`<namespace>-<middleware-name>@kubernetescrd`**. Since all apps deploy to the `nonprod` namespace, the format is `nonprod-<middleware-name>@kubernetescrd`.
:::

### Verify

```bash
curl -I https://my-app-mw.apps.nonprod.jupiter.onglueops.rocks
# Response headers should include:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

---

## TLS / HTTPS Redirect

Force HTTP traffic to redirect to HTTPS using a Traefik `redirectScheme` middleware combined with a standard Ingress.

**`envs/prod/values.yaml`**
```yaml
deployment:
  enabled: true
  replicas: 1

service:
  enabled: true

ingress:
  enabled: true
  ingressClassName: public-traefik
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.middlewares: nonprod-traefik-ingress-tls-redirect@kubernetescrd
  entries:
    - name: public
      hosts:
        - hostname: '{{ include "app.name" . }}.apps.{{ .Values.captain_domain }}'

customResources:
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: traefik-ingress-tls-redirect
    spec:
      redirectScheme:
        scheme: https
        permanent: true
```

The middleware reference format is `<namespace>-<middleware-name>@kubernetescrd`.

### Verify

```bash
# HTTP → should redirect to HTTPS (301)
curl -D- -o /dev/null http://my-app-tls.apps.nonprod.jupiter.onglueops.rocks
# HTTP/1.1 301 Moved Permanently
# Location: https://my-app-tls.apps.nonprod.jupiter.onglueops.rocks/

# HTTPS → serves the app
curl https://my-app-tls.apps.nonprod.jupiter.onglueops.rocks
```

---

## Common Traefik Annotations for Standard Ingress

| Annotation | Description | Example Value |
|-----------|-------------|---------------|
| `traefik.ingress.kubernetes.io/router.tls` | Enable TLS on the router | `"true"` |
| `traefik.ingress.kubernetes.io/router.entrypoints` | Restrict to specific entrypoints | `websecure` |
| `traefik.ingress.kubernetes.io/router.middlewares` | Attach middleware(s) | `nonprod-mw-name@kubernetescrd` |
| `traefik.ingress.kubernetes.io/service.sticky.cookie` | Enable sticky sessions | `"true"` |
| `traefik.ingress.kubernetes.io/service.sticky.cookie.name` | Cookie name for sticky sessions | `"my-cookie"` |
| `traefik.ingress.kubernetes.io/service.sticky.cookie.maxage` | Cookie max age in seconds | `"3600"` |
| `traefik.ingress.kubernetes.io/router.priority` | Set router priority | `"100"` |
