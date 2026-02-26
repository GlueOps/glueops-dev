---
id: traefik-middleware-basicauth
title: "Middleware: Basic Auth"
---

# Middleware: Basic Auth

Protect your application with HTTP Basic Authentication using Traefik's `basicAuth` Middleware.

## Prerequisites

**`base/base-values.yaml`**
```yaml
image:
  registry: docker.io
  repository: traefik/whoami
  tag: latest
  port: 80
```

## Generate Credentials

Before configuring, generate an htpasswd-formatted credential string:

```bash
# Using htpasswd (install via: apt-get install apache2-utils)
htpasswd -nb user password
# Output: user:$apr1$glueops$SH.22y5VjPlmHVcBm5xwd.

# Or using openssl
echo "user:$(openssl passwd -apr1 password)"
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
    apiVersion: v1
    kind: Secret
    metadata:
      name: basic-auth-secret
    type: Opaque
    stringData:
      users: |
        user:$apr1$glueops$SH.22y5VjPlmHVcBm5xwd.
  - |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: basic-auth
    spec:
      basicAuth:
        secret: basic-auth-secret
  - |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-auth
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
            - name: basic-auth
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
  secret: |
    apiVersion: v1
    kind: Secret
    metadata:
      name: basic-auth-secret
    type: Opaque
    stringData:
      users: |
        user:$apr1$glueops$SH.22y5VjPlmHVcBm5xwd.
  middleware: |
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: basic-auth
    spec:
      basicAuth:
        secret: basic-auth-secret
  ingressroute: |
    apiVersion: traefik.io/v1alpha1
    kind: IngressRoute
    metadata:
      name: my-app-auth
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
            - name: basic-auth
          services:
            - name: '{{ include "app.name" . }}'
              namespace: '{{ include "app.namespace" . }}'
              port: 80
```

</TabItem>
</Tabs>

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| Secret | `basic-auth-secret` | Stores htpasswd credentials |
| Middleware | `basic-auth` | Enforces HTTP Basic Auth using the secret |
| IngressRoute | `my-app-auth` | Routes traffic through the auth middleware |

## Verify

```bash
# Without credentials — returns 401 Unauthorized
curl -I https://my-app-prod.apps.CAPTAIN_DOMAIN
# HTTP/2 401

# With credentials — returns 200
curl -u user:password https://my-app-prod.apps.CAPTAIN_DOMAIN
```

:::note
The `-prod` suffix matches your environment folder name (`envs/prod/`). If you deploy to a different environment like `envs/uat/`, the suffix changes accordingly (e.g., `my-app-uat`).
:::

## Multiple Users

Add multiple users by including one htpasswd entry per line in the secret:

```yaml
stringData:
  users: |
    user1:$apr1$hash1...
    user2:$apr1$hash2...
    admin:$apr1$hash3...
```

## Key Points

- The username and password in this example are `user` / `password` — **change these for any real deployment**
- The `$apr1$` prefix indicates Apache MD5 hashing — this is the standard format for htpasswd
- The Secret must be in the same namespace as the Middleware (`nonprod`)

:::caution
The credentials in this example are stored in plain text in your values file. 
:::consider using ExternalSecrets resources to pull credentials from our secret store.
:::
